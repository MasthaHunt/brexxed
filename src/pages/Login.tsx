import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Logo } from "@/components/vaulta/Logo";
import { useAppState } from "@/state/AppState";
import { cn } from "@/lib/utils";

type UserKey = "alex" | "jamie" | "takeshi";

const USERS: Record<
  string,
  { user: UserKey; name: string; email: string; pass: string }
> = {
  "marcus.r@brexledger.com": {
    user: "alex",
    name: "Marcus Rashford",
    email: "marcus.r@brexledger.com",
    pass: "Marcus2026.",
  },
  "james.l@brexledger.com": {
    user: "jamie",
    name: "James Lilburne",
    email: "james.l@brexledger.com",
    pass: "Lilburne2026.",
  },
  "takeshi.r@brexledger.com": {
    user: "takeshi",
    name: "Takeshi Ronin",
    email: "takeshi.r@brexledger.com",
    pass: "Takeshi2026.",
  },
};

/** Per-user password key wins over the hardcoded default. */
const getEffectivePassword = (userKey: UserKey, defaultPass: string): string => {
  try {
    return localStorage.getItem(`vaulta_password_${userKey}`) ?? defaultPass;
  } catch {
    return defaultPass;
  }
};

const Login = () => {
  const navigate = useNavigate();
  const { switchUser } = useAppState();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Forgot password flow
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotNewPw, setForgotNewPw] = useState("");
  const [forgotConfirmPw, setForgotConfirmPw] = useState("");
  const [forgotShowNew, setForgotShowNew] = useState(false);
  const [forgotShowConfirm, setForgotShowConfirm] = useState(false);

  const openForgot = () => {
    setForgotEmail(email.trim().toLowerCase());
    setForgotStep(1);
    setForgotNewPw("");
    setForgotConfirmPw("");
    setForgotShowNew(false);
    setForgotShowConfirm(false);
    setForgotOpen(true);
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setForgotStep(1);
    setForgotEmail("");
    setForgotNewPw("");
    setForgotConfirmPw("");
  };

  const handleForgotContinue = (e: FormEvent) => {
    e.preventDefault();
    const found = USERS[forgotEmail.trim().toLowerCase()];
    if (!found) {
      toast.error("No account found with that email address.");
      return;
    }
    setForgotStep(2);
  };

  const handleForgotReset = (e: FormEvent) => {
    e.preventDefault();
    if (forgotNewPw.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (forgotNewPw !== forgotConfirmPw) {
      toast.error("Passwords do not match.");
      return;
    }
    const found = USERS[forgotEmail.trim().toLowerCase()];
    if (!found) return;
    try {
      localStorage.setItem(`vaulta_password_${found.user}`, forgotNewPw);
    } catch {
      toast.error("Could not save password. Please try again.");
      return;
    }
    toast.success("Password updated", { description: "You can now log in with your new password." });
    closeForgot();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const found = USERS[email.trim().toLowerCase()];
      if (found && pass === getEffectivePassword(found.user, found.pass)) {
        toast.success("Authenticating…", { description: `Welcome, ${found.name.split(" ")[0]}.` });
        switchUser(found.user);
        navigate("/dashboard", { replace: true });
      } else {
        setLoading(false);
        setShake(true);
        toast.error("Invalid credentials", {
          description: "Please check your email and password and try again.",
        });
        setTimeout(() => setShake(false), 600);
      }
    }, 500);
  };

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-muted/40">
      {/* Brand bar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 py-3.5 sm:px-8 sm:py-5">
        <Logo size={26} showWordmark animate={false} />
      </div>

      <div className="relative z-0 flex min-h-[100svh] items-center justify-center px-4 pb-4 pt-12 sm:px-6 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "w-full max-w-[360px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_8px_-2px_hsl(240_20%_12%/0.06),0_24px_48px_-16px_hsl(240_20%_12%/0.12)] sm:max-w-[420px]",
            shake && "animate-shake",
          )}
        >
          <div className="px-5 pb-8 pt-5 sm:px-8 sm:pt-8 sm:pb-10">
            <h1 className="font-display text-[1.375rem] font-semibold tracking-tight text-foreground sm:text-[1.625rem]">
              Log in
            </h1>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-[12.5px] font-medium text-foreground/80">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-lg border-border bg-muted/40 px-3.5 text-[14.5px] focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 sm:h-11 sm:text-[15px]"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pass" className="text-[12.5px] font-medium text-foreground/80">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="pass"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    className="h-10 rounded-lg border-border bg-muted/40 px-3.5 pr-11 text-[14.5px] focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 sm:h-11 sm:text-[15px]"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPass ? "Hide password" : "Show password"}
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-9 sm:w-9"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={openForgot}
                  className="text-[12.5px] font-medium text-foreground/70 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-10 w-full rounded-full bg-foreground text-[15px] font-semibold text-background hover:bg-foreground/90 disabled:opacity-70 sm:h-11 sm:text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in…
                  </>
                ) : (
                  "Log in"
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Forgot password dialog */}
      <Dialog open={forgotOpen} onOpenChange={(open) => { if (!open) closeForgot(); }}>
        <DialogContent className="sm:max-w-sm">
          {forgotStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle>Reset password</DialogTitle>
                <DialogDescription>
                  Enter the email address associated with your account.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleForgotContinue} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">Email address</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button type="button" variant="ghost" onClick={closeForgot}>Cancel</Button>
                  <Button type="submit" className="bg-gradient-primary shadow-glow">Continue</Button>
                </DialogFooter>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Set new password</DialogTitle>
                <DialogDescription>
                  Choose a new password for{" "}
                  <span className="font-medium text-foreground">{forgotEmail}</span>.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleForgotReset} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-new">New password</Label>
                  <div className="relative">
                    <Input
                      id="forgot-new"
                      type={forgotShowNew ? "text" : "password"}
                      value={forgotNewPw}
                      onChange={(e) => setForgotNewPw(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      aria-label={forgotShowNew ? "Hide" : "Show"}
                      onClick={() => setForgotShowNew((v) => !v)}
                      className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {forgotShowNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-confirm">Confirm new password</Label>
                  <div className="relative">
                    <Input
                      id="forgot-confirm"
                      type={forgotShowConfirm ? "text" : "password"}
                      value={forgotConfirmPw}
                      onChange={(e) => setForgotConfirmPw(e.target.value)}
                      placeholder="Repeat new password"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      aria-label={forgotShowConfirm ? "Hide" : "Show"}
                      onClick={() => setForgotShowConfirm((v) => !v)}
                      className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {forgotShowConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button type="button" variant="ghost" onClick={() => setForgotStep(1)}>Back</Button>
                  <Button type="submit" className="bg-gradient-primary shadow-glow">Update password</Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;

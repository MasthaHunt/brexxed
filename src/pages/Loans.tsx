import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Landmark, FileText, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useAppState } from "@/state/AppState";
import { formatCurrency, formatDate } from "@/lib/format";
import { TxLoader } from "@/components/vaulta/TxLoader";

const Loans = () => {
  const { state, payLoan, pushNotification } = useAppState();
  const loan = state.loan;

  // Loan eligibility: James and Takeshi are new accounts that haven't built
  // up the account history (transactions, deposits, credit score) needed to
  // qualify for credit. Marcus (alex) is fully eligible.
  const isEligible = state.userKey === "alex";
  const ineligibleReason =
    "Your account is too new to qualify for credit. Build a 90-day history of deposits and on-time activity to unlock loan eligibility.";

  const [payOpen, setPayOpen] = useState(false);
  const [payAmt, setPayAmt] = useState(loan ? String(loan.monthlyPayment) : "");
  const [fromId, setFromId] = useState(state.accounts[0]?.id ?? "");

  const [applyOpen, setApplyOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [applyPurpose, setApplyPurpose] = useState("Home improvement");
  const [applyAmount, setApplyAmount] = useState("10000");
  const [applyTerm, setApplyTerm] = useState("12");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleApplyClick = () => {
    if (!isEligible) {
      toast.error("Not eligible for a loan", { description: ineligibleReason });
      return;
    }
    setApplyOpen(true);
    setStep(0);
    setSubmitted(false);
  };

  const schedule = useMemo(() => {
    if (!loan) return [];
    const arr: { date: Date; principal: number; interest: number; balance: number }[] = [];
    let bal = loan.remaining;
    const monthlyRate = loan.apr / 100 / 12;
    const start = new Date();
    for (let i = 0; i < 6 && bal > 0; i++) {
      const interest = +(bal * monthlyRate).toFixed(2);
      const principal = Math.min(bal, +(loan.monthlyPayment - interest).toFixed(2));
      bal = Math.max(0, +(bal - principal).toFixed(2));
      const d = new Date(start); d.setMonth(d.getMonth() + i + 1);
      arr.push({ date: d, principal, interest, balance: bal });
    }
    return arr;
  }, [loan]);

  const handlePay = () => {
    const amt = parseFloat(payAmt);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    const acc = state.accounts.find((a) => a.id === fromId);
    if (!acc || acc.balance < amt) { toast.error("Insufficient balance"); return; }
    setPayOpen(false);
    setLoading(true);
    setTimeout(() => {
      payLoan(amt, fromId);
      pushNotification({
        type: "transaction",
        title: "Loan payment received",
        body: `${formatCurrency(amt)} applied to ${loan?.name ?? "loan"} (${loan?.id ?? ""}).`,
      });
      setLoading(false);
      toast.success("Payment successful", { description: `${formatCurrency(amt)} applied to your loan.` });
    }, 1200);
  };

  const handleSubmitApplication = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      pushNotification({
        type: "system",
        title: "Loan application received",
        body: `${applyPurpose} · ${formatCurrency(parseFloat(applyAmount) || 0)} over ${applyTerm} months. Decision within 24h.`,
      });
    }, 1400);
  };

  // Credit gauge
  const score = state.creditScore;
  const pct = Math.max(0, Math.min(1, (score - 300) / 550));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Loans & Credit</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your loans and monitor credit health.</p>
        </div>
        <Button
          onClick={handleApplyClick}
          disabled={!isEligible}
          className="bg-gradient-primary shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEligible ? "Apply for Loan" : "Not eligible"}
        </Button>
      </div>

      {!isEligible && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-amber-700 dark:text-amber-300">Loan eligibility on hold</p>
          <p className="mt-1 text-foreground/80">{ineligibleReason}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Loan card */}
        {loan ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active loan</p>
                <h2 className="mt-1 font-display text-xl font-bold">{loan.name}</h2>
                <p className="text-xs text-muted-foreground">{loan.id} · {loan.termMonths}-month · {loan.apr}% APR</p>
              </div>
              <Landmark className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Stat label="Borrowed" value={formatCurrency(loan.principal)} />
              <Stat label="Remaining" value={formatCurrency(loan.remaining)} accent />
              <Stat label="Monthly" value={formatCurrency(loan.monthlyPayment)} />
            </div>
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Repayment progress</span>
                <span className="font-semibold tabular-nums">
                  {Math.round((1 - loan.remaining / loan.principal) * 100)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(1 - loan.remaining / loan.principal) * 100}%` }}
                  transition={{ duration: 0.9 }}
                  className="h-full rounded-full bg-gradient-primary"
                />
              </div>
            </div>
            <Button onClick={() => setPayOpen(true)} className="mt-5 bg-gradient-primary shadow-glow">
              Make Payment
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-12 text-center shadow-card">
            <Landmark className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No active loans</p>
            <p className="text-sm text-muted-foreground">
              {isEligible ? "Apply for a loan to get started." : "Loan products are unavailable for this account right now."}
            </p>
            <Button
              onClick={handleApplyClick}
              disabled={!isEligible}
              className="bg-gradient-primary shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEligible ? "Apply for Loan" : "Not eligible"}
            </Button>
          </div>
        )}

        {/* Credit score */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Credit score</p>
          <div className="mt-3 flex items-center gap-5">
            <div className="relative h-32 w-32">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="50" stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
                <motion.circle
                  cx="60" cy="60" r="50"
                  stroke="hsl(var(--primary))" strokeWidth="10" fill="none"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 314" }}
                  animate={{ strokeDasharray: `${pct * 314} 314` }}
                  transition={{ duration: 1 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="font-display text-3xl font-bold tabular-nums">{score || "—"}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {score >= 740 ? "Very good" : score >= 670 ? "Good" : score > 0 ? "Fair" : "No score"}
                </p>
              </div>
            </div>
            <div className="flex-1 space-y-2 text-sm">
              {[
                { k: "Payment History", v: 95 },
                { k: "Utilization", v: 72 },
                { k: "Credit Age", v: 68 },
                { k: "New Credit", v: 80 },
              ].map((f) => (
                <div key={f.k}>
                  <div className="mb-0.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{f.k}</span>
                    <span className="font-medium tabular-nums">{f.v}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${f.v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule */}
      {loan && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="font-display text-lg font-semibold">Repayment schedule (next 6 months)</h2>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Principal</th>
                  <th className="px-5 py-3 font-medium">Interest</th>
                  <th className="px-5 py-3 font-medium">Balance after</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schedule.map((r, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3">{formatDate(r.date.toISOString())}</td>
                    <td className="px-5 py-3 tabular-nums">{formatCurrency(r.principal)}</td>
                    <td className="px-5 py-3 tabular-nums">{formatCurrency(r.interest)}</td>
                    <td className="px-5 py-3 font-semibold tabular-nums">{formatCurrency(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pay modal */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Make a payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>From account</Label>
              <Select value={fromId} onValueChange={setFromId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {state.accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} • {formatCurrency(a.balance)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">$</span>
                <Input inputMode="decimal" value={payAmt} onChange={(e) => setPayAmt(e.target.value.replace(/[^\d.]/g, ""))} className="pl-7 tabular-nums" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={handlePay} className="bg-gradient-primary shadow-glow">Confirm payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply modal */}
      <Dialog open={applyOpen} onOpenChange={(o) => { setApplyOpen(o); if (!o) { setStep(0); setSubmitted(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Loan application</DialogTitle>
            <DialogDescription>Step {Math.min(step + 1, 3)} of 3</DialogDescription>
          </DialogHeader>
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                <Check className="h-7 w-7" />
              </div>
              <p className="font-display text-lg font-bold">Application submitted</p>
              <p className="text-sm text-muted-foreground">We'll review and get back to you within 24 hours.</p>
              <Button onClick={() => setApplyOpen(false)} className="mt-2">Done</Button>
            </div>
          ) : (
            <>
              {step === 0 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Purpose</Label>
                    <Select value={applyPurpose} onValueChange={setApplyPurpose}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Home improvement", "Debt consolidation", "Education", "Vehicle", "Other"].map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Amount</Label>
                    <Input inputMode="decimal" value={applyAmount} onChange={(e) => setApplyAmount(e.target.value.replace(/[^\d.]/g, ""))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Term (months)</Label>
                    <Select value={applyTerm} onValueChange={setApplyTerm}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["6", "12", "18", "24", "36"].map((t) => <SelectItem key={t} value={t}>{t} months</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Purpose</span><span className="font-medium">{applyPurpose}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium">{formatCurrency(parseFloat(applyAmount) || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Term</span><span className="font-medium">{applyTerm} months</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Estimated APR</span><span className="font-medium">9.5%</span></div>
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-2">
                {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
                {step < 2 ? (
                  <Button onClick={() => setStep(step + 1)} className="bg-gradient-primary shadow-glow">
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmitApplication} className="bg-gradient-primary shadow-glow">Submit application</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <TxLoader open={loading} label="Processing payment…" />
      <TxLoader open={submitting} label="Submitting application…" />
    </div>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div>
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={`mt-1 font-display text-xl font-bold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</p>
  </div>
);

export default Loans;

import { useRef, useState, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAppState } from "@/state/AppState";

/** Returns a human-readable relative age for a session timestamp. */
const formatSessionAge = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const Settings = () => {
  const { state, setState, setAvatar, resetDemo, changePassword, changePin, adminControls, setAdminControlsBatch, refreshAdminControls, refreshStateFromServer, resolveAllDaf, resolveAllTransferLocks } = useAppState();
  const [name, setName] = useState(state.profile.name);
  const [email, setEmail] = useState(state.profile.email);
  const [phone, setPhone] = useState(state.profile.phone);

  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // Transaction PIN state
  const [pinOpen, setPinOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const hasPinSet = !!state.settings.security.pin;

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const canReset = state.userKey !== "jamie";

  // Admin one-time action toggle local state (auto-resets after action)
  const [dafActionToggle, setDafActionToggle] = useState(false);
  const [lockActionToggle, setLockActionToggle] = useState(false);

  // Buffered admin prevention toggles — only committed on "Save"
  const [adminDraft, setAdminDraft] = useState({
    dafBypassed: adminControls.dafBypassed,
    transferLockBypassed: adminControls.transferLockBypassed,
  });
  const [adminDirty, setAdminDirty] = useState(false);
  const [adminSyncing, setAdminSyncing] = useState(false);

  // Keep draft in sync when adminControls changes externally (e.g. from server refresh)
  // but only if there are no unsaved local changes
  useEffect(() => {
    if (!adminDirty) {
      setAdminDraft({
        dafBypassed: adminControls.dafBypassed,
        transferLockBypassed: adminControls.transferLockBypassed,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminControls.dafBypassed, adminControls.transferLockBypassed]);

  const setAdminDraftKey = <K extends keyof typeof adminDraft>(k: K, v: boolean) => {
    setAdminDraft((prev) => ({ ...prev, [k]: v }));
    setAdminDirty(true);
  };

  const saveAdmin = () => {
    setAdminControlsBatch(adminDraft);
    setAdminDirty(false);
    toast.success("Admin settings saved to server");
  };

  const handleSyncFromServer = () => {
    setAdminSyncing(true);
    // Pull BOTH admin controls AND the full financial state (balances, transactions, etc.)
    Promise.all([refreshAdminControls(), refreshStateFromServer()]).then(([fresh, stateOk]) => {
      setAdminSyncing(false);
      if (fresh || stateOk) {
        if (fresh) {
          setAdminDraft({
            dafBypassed: fresh.dafBypassed,
            transferLockBypassed: fresh.transferLockBypassed,
          });
          setAdminDirty(false);
        }
        toast.success("Synced from server");
      } else {
        toast.error("Could not reach server — check VITE_API_SECRET is set in Railway");
      }
    });
  };

  // Auto-refresh admin controls + full state whenever the admin tab is opened
  const handleTabChange = (v: string) => {
    if (v === "admin" && state.userKey === "takeshi") {
      setAdminSyncing(true);
      Promise.all([refreshAdminControls(), refreshStateFromServer()]).then(([fresh]) => {
        setAdminSyncing(false);
        if (fresh && !adminDirty) {
          setAdminDraft({
            dafBypassed: fresh.dafBypassed,
            transferLockBypassed: fresh.transferLockBypassed,
          });
        }
      });
    }
  };

  // Detect active DAF/lock conditions across current user's accounts
  const hasDafAccounts = state.accounts.some((a) => a.dafRequired);
  const hasLockedAccounts = state.accounts.some((a) => a.transferLocked);

  const saveProfile = () => {
    setState((s) => ({ ...s, profile: { ...s.profile, name, email, phone } }));
    toast.success("Profile saved");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
      toast.success("Photo updated");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePasswordChange = () => {
    const stored = state.settings.security.password ?? "";
    if (!currentPw) { toast.error("Enter your current password"); return; }
    if (currentPw !== stored) { toast.error("Current password is incorrect"); return; }
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { toast.error("New passwords do not match"); return; }
    changePassword(newPw);
    toast.success("Password updated");
    setPwOpen(false);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
  };

  const handlePinChange = () => {
    if (hasPinSet) {
      const stored = state.settings.security.pin ?? "";
      if (!currentPin) { toast.error("Enter your current PIN"); return; }
      if (currentPin !== stored) { toast.error("Current PIN is incorrect"); return; }
    }
    if (!/^\d{4}$/.test(newPin)) { toast.error("PIN must be exactly 4 digits"); return; }
    if (newPin !== confirmPin) { toast.error("PINs do not match"); return; }
    changePin(newPin);
    toast.success(hasPinSet ? "Transaction PIN updated" : "Transaction PIN set");
    setPinOpen(false);
    setCurrentPin(""); setNewPin(""); setConfirmPin("");
  };

  // Buffered notification settings — only committed to state when "Save" is clicked
  const [notifDraft, setNotifDraft] = useState(state.settings.notifications);
  const [notifDirty, setNotifDirty] = useState(false);

  const setNotif = <K extends keyof typeof notifDraft>(k: K, v: typeof notifDraft[K]) => {
    setNotifDraft((prev) => ({ ...prev, [k]: v }));
    setNotifDirty(true);
  };

  const saveNotif = () => {
    setState((s) => ({ ...s, settings: { ...s.settings, notifications: notifDraft } }));
    setNotifDirty(false);
    toast.success("Notification settings saved");
  };

  // Buffered preference settings — only committed when "Save" is clicked
  const [prefDraft, setPrefDraft] = useState(state.settings.preferences);
  const [prefDirty, setPrefDirty] = useState(false);

  const setPref = <K extends keyof typeof prefDraft>(k: K, v: typeof prefDraft[K]) => {
    setPrefDraft((prev) => ({ ...prev, [k]: v }));
    setPrefDirty(true);
  };

  const savePrefs = () => {
    setState((s) => ({ ...s, settings: { ...s.settings, preferences: prefDraft } }));
    setPrefDirty(false);
    toast.success("Preferences saved");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Profile & Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account, security, and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-5" onValueChange={handleTabChange}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="linked">Linked Accounts</TabsTrigger>
          {state.userKey === "takeshi" && (
            <TabsTrigger value="admin">Admin</TabsTrigger>
          )}
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Upload profile photo"
              >
                {state.profile.avatarUrl ? (
                  <img
                    src={state.profile.avatarUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-primary text-xl font-bold text-primary-foreground">
                    {state.profile.avatarInitials}
                  </div>
                )}
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-5 w-5 text-white" />
                </span>
              </button>
              <div>
                <p className="text-sm font-medium">Profile photo</p>
                <p className="text-xs text-muted-foreground">Click to upload · JPG, PNG, WebP · max 5 MB</p>
                {state.profile.avatarUrl && (
                  <button
                    type="button"
                    className="mt-1 text-xs text-destructive hover:underline"
                    onClick={() => { setAvatar(""); toast("Photo removed"); }}
                  >
                    Remove photo
                  </button>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 555 0142" /></div>
              <div className="space-y-1.5"><Label>Account tier</Label><Input value={state.profile.tier} disabled /></div>
            </div>
            <Button onClick={saveProfile} className="mt-5 bg-gradient-primary shadow-glow">Save changes</Button>
          </div>
        </TabsContent>

        {/* SECURITY */}
        <TabsContent value="security" className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
            <h2 className="font-display text-base font-semibold">Password</h2>
            <p className="text-sm text-muted-foreground">Change your account password.</p>
            <Button variant="outline" className="mt-3" onClick={() => { setCurrentPw(""); setNewPw(""); setConfirmPw(""); setPwOpen(true); }}>
              Change password
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
            <h2 className="font-display text-base font-semibold">Transaction PIN</h2>
            <p className="text-sm text-muted-foreground">
              {hasPinSet
                ? "A 4-digit PIN is required to confirm every transfer or payment."
                : "Set a 4-digit PIN to secure every transfer and payment."}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => { setCurrentPin(""); setNewPin(""); setConfirmPin(""); setPinOpen(true); }}
              >
                {hasPinSet ? "Change PIN" : "Set PIN"}
              </Button>
              {hasPinSet && (
                <span className="text-xs font-medium text-secondary">✓ PIN active</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
            <h2 className="font-display text-base font-semibold">Active sessions</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {state.sessions.length === 0 ? (
                /* Fallback shown before first explicit login via the new flow */
                <li className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                  <div>
                    <p className="font-medium">Chrome · Web</p>
                    <p className="text-xs text-muted-foreground">Current session</p>
                  </div>
                  <span className="text-xs font-semibold text-secondary">Active</span>
                </li>
              ) : (
                state.sessions.map((sess) => (
                  <li key={sess.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                    <div>
                      <p className="font-medium">{sess.device}</p>
                      <p className="text-xs text-muted-foreground">
                        {sess.location} · {sess.current ? "current" : formatSessionAge(sess.timestamp)}
                      </p>
                    </div>
                    {sess.current ? (
                      <span className="text-xs font-semibold text-secondary">Active</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== sess.id) }));
                          toast("Session revoked");
                        }}
                      >
                        Revoke
                      </Button>
                    )}
                  </li>
                ))
              )}
            </ul>
            <Button
              variant="destructive"
              className="mt-3"
              onClick={() => {
                // Keep only the current session
                setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.current) }));
                toast("Signed out of all other devices");
              }}
            >
              Sign out all devices
            </Button>
          </div>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="space-y-5">
          <PrefSection title="Email" desc="Sent to your registered email address.">
            <Toggle label="Transactions" hint="Receipts for every payment, transfer, and deposit." v={notifDraft.emailTransactions} onChange={(v) => setNotif("emailTransactions", v)} />
            <Toggle label="Monthly statements" hint="A PDF summary of your activity each month." v={notifDraft.emailStatements} onChange={(v) => setNotif("emailStatements", v)} />
            <Toggle label="Promotions & offers" hint="New products, partner perks, and surveys." v={notifDraft.emailPromos} onChange={(v) => setNotif("emailPromos", v)} />
          </PrefSection>

          <PrefSection title="Push notifications" desc="Real-time alerts on your devices.">
            <Toggle label="Transaction alerts" hint="Pings for every card swipe and transfer." v={notifDraft.pushTransactions} onChange={(v) => setNotif("pushTransactions", v)} />
            <Toggle label="Security alerts" hint="New logins, device changes, and suspicious activity." v={notifDraft.pushSecurity} onChange={(v) => setNotif("pushSecurity", v)} />
            <Toggle label="Offers from Brex" hint="Cashback, rate changes, and new features." v={notifDraft.pushOffers} onChange={(v) => setNotif("pushOffers", v)} />
          </PrefSection>

          <PrefSection title="Quiet hours" desc="Pause non-urgent alerts during a daily window. Security alerts always come through.">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Enable quiet hours</p>
                <p className="text-xs text-muted-foreground">Snooze low-priority pushes overnight.</p>
              </div>
              <Switch checked={notifDraft.quietHours} onCheckedChange={(v) => setNotif("quietHours", v)} />
            </div>
            {notifDraft.quietHours && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Start</Label>
                  <Input type="time" value={notifDraft.quietStart} onChange={(e) => setNotif("quietStart", e.target.value as never)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End</Label>
                  <Input type="time" value={notifDraft.quietEnd} onChange={(e) => setNotif("quietEnd", e.target.value as never)} />
                </div>
              </div>
            )}
          </PrefSection>

          <div className="flex items-center justify-end gap-3">
            {notifDirty && <p className="text-xs text-muted-foreground">You have unsaved changes</p>}
            <Button onClick={saveNotif} className="bg-gradient-primary shadow-glow" disabled={!notifDirty}>
              Save notification settings
            </Button>
          </div>
        </TabsContent>

        {/* PREFERENCES */}
        <TabsContent value="preferences">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Currency display</Label>
                <Select value={prefDraft.currency} onValueChange={(v) => setPref("currency", v as "USD" | "EUR" | "GBP")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select value={prefDraft.language} onValueChange={(v) => setPref("language", v as "English" | "Spanish" | "French")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Theme is controlled by the toggle in the top bar.</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              {prefDirty && <p className="text-xs text-muted-foreground">You have unsaved changes</p>}
              <Button onClick={savePrefs} className="bg-gradient-primary shadow-glow" disabled={!prefDirty}>
                Save preferences
              </Button>
            </div>
          </div>
          {canReset && (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-5 shadow-card">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Danger zone</p>
              <p className="mt-1 text-sm">
                Reset to default data — this clears all changes you've made.
                {state.userKey === "takeshi" && (
                  <span className="ml-1 text-muted-foreground">
                    (Takeshi and James share data, so this resets both accounts.)
                  </span>
                )}
              </p>
              <Button variant="ghost" size="sm" className="mt-2 text-muted-foreground" onClick={resetDemo}>
                Reset account data
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ADMIN — Takeshi only */}
        {state.userKey === "takeshi" && (
          <TabsContent value="admin" className="space-y-5">

            {/* Persistent prevention toggles */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-semibold">Prevention toggles</h2>
                  <p className="text-[12.5px] text-muted-foreground">
                    Control whether these events trigger at all. Changes apply to future events only.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncFromServer}
                  disabled={adminSyncing}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {adminSyncing ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                  ) : (
                    <span>↻</span>
                  )}
                  {adminSyncing ? "Syncing…" : "Sync from server"}
                </button>
              </div>
              <div className="mt-4 space-y-2.5">
                <Toggle
                  label="Bypass DAF fee requirement"
                  hint="On = future incoming transfers will skip the one-time $2,500 DAF fee at the 18h stage."
                  v={adminDraft.dafBypassed}
                  onChange={(v) => setAdminDraftKey("dafBypassed", v)}
                />
                <Toggle
                  label="Bypass post-transfer lock"
                  hint="On = future outgoing transfers will not trigger the 15–20 min security lock."
                  v={adminDraft.transferLockBypassed}
                  onChange={(v) => setAdminDraftKey("transferLockBypassed", v)}
                />
              </div>
              <div className="mt-4 flex items-center justify-end gap-3">
                {adminDirty && <p className="text-xs text-muted-foreground">You have unsaved changes</p>}
                <Button onClick={saveAdmin} className="bg-gradient-primary shadow-glow" disabled={!adminDirty}>
                  Save admin settings
                </Button>
              </div>
            </div>

            {/* One-time resolution actions */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
              <h2 className="font-display text-base font-semibold">Resolve active holds</h2>
              <p className="text-[12.5px] text-muted-foreground">
                One-time actions to resolve currently active blocks on accounts.
              </p>
              <div className="mt-4 space-y-2.5">

                {/* DAF confirmation */}
                <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${hasDafAccounts ? "border-amber-500/40 bg-amber-500/10" : "border-border bg-muted/30 opacity-50"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Confirm DAF payment received
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        one-time fee
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {hasDafAccounts
                        ? "An active DAF block is detected. Toggle to confirm the $2,500 fee has been received and release the incoming funds."
                        : "No active DAF block detected on any account."}
                    </p>
                  </div>
                  <Switch
                    checked={dafActionToggle}
                    disabled={!hasDafAccounts}
                    onCheckedChange={(v) => {
                      if (!v || !hasDafAccounts) return;
                      setDafActionToggle(true);
                      resolveAllDaf();
                      toast.success("DAF confirmed — funds credited");
                      setTimeout(() => setDafActionToggle(false), 1500);
                    }}
                  />
                </div>

                {/* Transfer lock resolution */}
                <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${hasLockedAccounts ? "border-destructive/40 bg-destructive/10" : "border-border bg-muted/30 opacity-50"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Confirm transfer hold resolved
                      <span className="ml-2 inline-flex items-center rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-destructive">
                        one-time
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {hasLockedAccounts
                        ? "A transfer lock is active. Toggle to clear the hold — pending funds will complete and deliver to recipient within 48 hours."
                        : "No active transfer lock detected on any account."}
                    </p>
                  </div>
                  <Switch
                    checked={lockActionToggle}
                    disabled={!hasLockedAccounts}
                    onCheckedChange={(v) => {
                      if (!v || !hasLockedAccounts) return;
                      setLockActionToggle(true);
                      resolveAllTransferLocks();
                      toast.success("Hold cleared — funds settling in 48h");
                      setTimeout(() => setLockActionToggle(false), 1500);
                    }}
                  />
                </div>

              </div>
            </div>

          </TabsContent>
        )}

        {/* LINKED */}
        <TabsContent value="linked">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
            {state.settings.linkedBanks.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No linked external banks.</p>
            ) : (
              <ul className="space-y-2">
                {state.settings.linkedBanks.map((b) => (
                  <li key={b.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.mask}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setState((s) => ({ ...s, settings: { ...s.settings, linkedBanks: s.settings.linkedBanks.filter((x) => x.id !== b.id) } }));
                        toast("Bank unlinked");
                      }}
                      className="text-destructive"
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Change password modal */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Enter your current password to confirm, then set a new one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Current password</Label>
              <Input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Your current password"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>New password</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm new password</Label>
              <Input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setPwOpen(false)}>Cancel</Button>
            <Button onClick={handlePasswordChange} className="bg-gradient-primary shadow-glow">Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction PIN modal */}
      <Dialog open={pinOpen} onOpenChange={(o) => { if (!o) { setPinOpen(false); setCurrentPin(""); setNewPin(""); setConfirmPin(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{hasPinSet ? "Change transaction PIN" : "Set transaction PIN"}</DialogTitle>
            <DialogDescription>
              {hasPinSet
                ? "Enter your current 4-digit PIN to confirm, then set a new one."
                : "Choose a 4-digit PIN. It will be required to confirm every transfer or payment."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {hasPinSet && (
              <div className="space-y-1.5">
                <Label>Current PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="4-digit PIN"
                  autoComplete="current-password"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>New PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="4 digits"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm new PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Repeat 4 digits"
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setPinOpen(false)}>Cancel</Button>
            <Button onClick={handlePinChange} className="bg-gradient-primary shadow-glow">
              {hasPinSet ? "Update PIN" : "Set PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Toggle = ({ label, hint, v, onChange }: { label: string; hint?: string; v: boolean; onChange: (b: boolean) => void }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
    <Switch checked={v} onCheckedChange={onChange} />
  </div>
);

const PrefSection = ({ title, desc, children }: { title: string; desc: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
    <header className="mb-3">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <p className="text-[12.5px] text-muted-foreground">{desc}</p>
    </header>
    <div className="space-y-2.5">{children}</div>
  </section>
);

export default Settings;

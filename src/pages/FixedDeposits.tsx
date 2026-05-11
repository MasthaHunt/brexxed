import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Banknote, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState, rateForTenure } from "@/state/AppState";
import { formatCurrency, formatDate } from "@/lib/format";
import { TxLoader } from "@/components/vaulta/TxLoader";
import { cn } from "@/lib/utils";
import type { FixedDeposit } from "@/state/types";

const StatusBadge = ({ status }: { status: FixedDeposit["status"] }) => {
  const styles =
    status === "Active"
      ? "bg-secondary/15 text-secondary"
      : status === "Matured"
      ? "bg-primary/15 text-primary"
      : "bg-destructive/15 text-destructive";
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold", styles)}>
      {status}
    </span>
  );
};

const accruedInterest = (fd: FixedDeposit) => {
  const start = +new Date(fd.startDate);
  const now = Math.min(Date.now(), +new Date(fd.maturityDate));
  const months = Math.max(0, (now - start) / (1000 * 60 * 60 * 24 * 30.4375));
  return +(fd.principal * (fd.rate / 100) * (months / 12)).toFixed(2);
};

const maturityValue = (fd: FixedDeposit) =>
  +(fd.principal * (1 + (fd.rate / 100) * (fd.tenureMonths / 12))).toFixed(2);

const FixedDeposits = () => {
  const { state, createFixedDeposit, breakFixedDeposit, pushNotification } = useAppState();

  const [createOpen, setCreateOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [breakTarget, setBreakTarget] = useState<FixedDeposit | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<{ open: boolean; label: string }>({ open: false, label: "" });

  // Create form
  const [amount, setAmount] = useState("");
  const [tenure, setTenure] = useState("6");
  const [sourceId, setSourceId] = useState(state.accounts[0]?.id ?? "");
  const tenureNum = parseInt(tenure, 10);
  const rate = rateForTenure(tenureNum);
  const principalNum = parseFloat(amount) || 0;

  const totalLocked = useMemo(
    () => state.fixedDeposits.filter((d) => d.status === "Active").reduce((s, d) => s + d.principal, 0),
    [state.fixedDeposits],
  );

  const totalInterest = useMemo(
    () => state.fixedDeposits.reduce((s, d) => s + accruedInterest(d), 0),
    [state.fixedDeposits],
  );

  const nearestMaturity = useMemo(() => {
    const active = state.fixedDeposits.filter((d) => d.status === "Active");
    if (active.length === 0) return null;
    return active.reduce((acc, d) => (+new Date(d.maturityDate) < +new Date(acc.maturityDate) ? d : acc));
  }, [state.fixedDeposits]);

  const handleReview = () => {
    if (principalNum < 1000) { toast.error("Minimum deposit is $1,000"); return; }
    if (principalNum > 1_000_000) { toast.error("Maximum single deposit is $1,000,000"); return; }
    const acc = state.accounts.find((a) => a.id === sourceId);
    if (!acc || acc.balance < principalNum) { toast.error("Insufficient balance in source account"); return; }
    setReviewOpen(true);
  };

  const handleConfirm = () => {
    setReviewOpen(false);
    setCreateOpen(false);
    setLoading({ open: true, label: "Creating fixed deposit…" });
    setTimeout(() => {
      const fd = createFixedDeposit(principalNum, tenureNum, rate, sourceId);
      pushNotification({
        type: "system",
        title: "Fixed deposit opened",
        body: `${fd.id} · ${formatCurrency(principalNum)} locked for ${tenureNum} months @ ${rate}% p.a.`,
      });
      setLoading({ open: false, label: "" });
      setAmount("");
      toast.success(`Fixed Deposit ${fd.id} created`, {
        description: `${formatCurrency(principalNum)} locked for ${tenureNum} months @ ${rate}% p.a.`,
      });
    }, 1800);
  };

  const handleBreak = () => {
    if (!breakTarget) return;
    const target = breakTarget;
    setBreakTarget(null);
    setLoading({ open: true, label: "Breaking deposit…" });
    setTimeout(() => {
      breakFixedDeposit(target.id);
      pushNotification({
        type: "system",
        title: "Fixed deposit broken",
        body: `${target.id} closed early. ${formatCurrency(target.principal * 0.99)} returned after 1% penalty.`,
      });
      setLoading({ open: false, label: "" });
      toast.success(`${target.id} broken`, { description: "Funds returned to Checking after 1% penalty." });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Fixed Deposits</h1>
          <p className="mt-1 text-sm text-muted-foreground">Lock funds to earn higher interest.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-primary shadow-glow">
          <Plus className="mr-2 h-4 w-4" />New Fixed Deposit
        </Button>
      </div>

      {/* Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total in deposits</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums">{formatCurrency(totalLocked)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Interest earned to date</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-secondary">{formatCurrency(totalInterest)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Next maturity</p>
          <p className="mt-2 font-display text-2xl font-bold">
            {nearestMaturity ? formatDate(nearestMaturity.maturityDate) : "—"}
          </p>
          {nearestMaturity && <p className="text-xs text-muted-foreground">{nearestMaturity.id}</p>}
        </div>
      </div>

      {/* Active deposits table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-5">
          <h2 className="font-display text-lg font-semibold">Active deposits</h2>
        </div>
        {state.fixedDeposits.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Banknote className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No fixed deposits yet</p>
            <p className="text-sm text-muted-foreground">Lock your funds to earn higher interest.</p>
            <Button onClick={() => setCreateOpen(true)} className="mt-2 bg-gradient-primary shadow-glow">
              <Plus className="mr-2 h-4 w-4" />Open your first FD
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Deposit ID</th>
                  <th className="px-5 py-3 font-medium">Principal</th>
                  <th className="px-5 py-3 font-medium">Rate</th>
                  <th className="px-5 py-3 font-medium">Start</th>
                  <th className="px-5 py-3 font-medium">Maturity</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.fixedDeposits.map((fd) => {
                  const isOpen = expanded === fd.id;
                  return (
                    <>
                      <tr key={fd.id} className="hover:bg-muted/30">
                        <td className="px-5 py-3 font-mono font-medium">{fd.id}</td>
                        <td className="px-5 py-3 tabular-nums">{formatCurrency(fd.principal)}</td>
                        <td className="px-5 py-3 tabular-nums">{fd.rate.toFixed(2)}% p.a.</td>
                        <td className="px-5 py-3">{formatDate(fd.startDate)}</td>
                        <td className="px-5 py-3">{formatDate(fd.maturityDate)}</td>
                        <td className="px-5 py-3"><StatusBadge status={fd.status} /></td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => setExpanded(isOpen ? null : fd.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            {isOpen ? <>Hide <ChevronUp className="h-3 w-3" /></> : <>Details <ChevronDown className="h-3 w-3" /></>}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${fd.id}-d`} className="bg-muted/20">
                          <td colSpan={7} className="px-5 py-4">
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="grid gap-4 md:grid-cols-3"
                            >
                              <div>
                                <p className="text-xs text-muted-foreground">Interest accrued</p>
                                <p className="font-display text-base font-bold tabular-nums text-secondary">
                                  {formatCurrency(accruedInterest(fd))}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Maturity value</p>
                                <p className="font-display text-base font-bold tabular-nums">
                                  {formatCurrency(maturityValue(fd))}
                                </p>
                              </div>
                              <div className="flex items-center justify-end">
                                {fd.status === "Active" && (
                                  <Button variant="outline" size="sm" onClick={() => setBreakTarget(fd)}>
                                    <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />Break Deposit
                                  </Button>
                                )}
                              </div>
                              <div className="md:col-span-3">
                                <p className="text-xs text-muted-foreground">
                                  Early withdrawal incurs a <span className="font-semibold text-foreground">1% penalty</span> on the principal. Funds will be returned to your Checking account.
                                </p>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Fixed Deposit</DialogTitle>
            <DialogDescription>Lock funds for a fixed term to earn interest.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Source account</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {state.accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} • {formatCurrency(a.balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (min $1,000)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">$</span>
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="1000.00"
                  className="pl-7 font-display text-base font-semibold tabular-nums"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tenure</Label>
              <Select value={tenure} onValueChange={setTenure}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                  <SelectItem value="24">24 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Interest rate</span>
                <span className="font-display text-lg font-bold tabular-nums text-primary">{rate.toFixed(2)}% p.a.</span>
              </div>
              {principalNum >= 1000 && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Maturity value</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(+(principalNum * (1 + (rate / 100) * (tenureNum / 12))).toFixed(2))}
                  </span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleReview} className="bg-gradient-primary shadow-glow">Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review modal */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Fixed Deposit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
            <Row k="From" v={state.accounts.find((a) => a.id === sourceId)?.name ?? ""} />
            <Row k="Principal" v={formatCurrency(principalNum)} />
            <Row k="Tenure" v={`${tenureNum} months`} />
            <Row k="Rate" v={`${rate.toFixed(2)}% p.a.`} />
            <Row k="Maturity value" v={formatCurrency(+(principalNum * (1 + (rate / 100) * (tenureNum / 12))).toFixed(2))} accent />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>Back</Button>
            <Button onClick={handleConfirm} className="bg-gradient-primary shadow-glow">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Break confirmation */}
      <Dialog open={!!breakTarget} onOpenChange={(o) => !o && setBreakTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />Break {breakTarget?.id}?
            </DialogTitle>
            <DialogDescription>
              This will incur a 1% penalty on the principal. Funds will be returned to your Checking account.
            </DialogDescription>
          </DialogHeader>
          {breakTarget && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <Row k="Principal" v={formatCurrency(breakTarget.principal)} />
              <Row k="Penalty (1%)" v={`-${formatCurrency(breakTarget.principal * 0.01)}`} />
              <Row k="You receive" v={formatCurrency(breakTarget.principal * 0.99)} accent />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setBreakTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBreak}>Break deposit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TxLoader open={loading.open} label={loading.label} />
    </div>
  );
};

const Row = ({ k, v, accent }: { k: string; v: string; accent?: boolean }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-muted-foreground">{k}</span>
    <span className={cn("font-medium tabular-nums text-right", accent && "font-display text-base text-primary")}>
      {v}
    </span>
  </div>
);

export default FixedDeposits;

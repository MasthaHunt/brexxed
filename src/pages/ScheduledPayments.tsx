import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Repeat, Pause, Play, Trash2, Calendar as CalIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAppState } from "@/state/AppState";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Frequency, StandingOrder } from "@/state/types";
import { cn } from "@/lib/utils";

const FREQS: Frequency[] = ["Weekly", "Monthly", "Quarterly", "Annually"];

const ScheduledPayments = () => {
  const { state, createStandingOrder, updateStandingOrder, toggleStandingOrder, deleteStandingOrder } = useAppState();

  const [createOpen, setCreateOpen] = useState(false);
  const [active, setActive] = useState<StandingOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StandingOrder | null>(null);
  const [editing, setEditing] = useState(false);

  // Form state (used by both create and edit)
  const [recipient, setRecipient] = useState("");
  const [sourceId, setSourceId] = useState(state.accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [nextDate, setNextDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");

  const upcoming30 = useMemo(() => {
    const cutoff = Date.now() + 30 * 24 * 60 * 60 * 1000;
    return state.standingOrders
      .filter((s) => s.status === "Active" && +new Date(s.nextDate) <= cutoff)
      .sort((a, b) => +new Date(a.nextDate) - +new Date(b.nextDate));
  }, [state.standingOrders]);

  const resetForm = () => {
    setRecipient("");
    setAmount("");
    setFrequency("Monthly");
    setNextDate(new Date().toISOString().slice(0, 10));
    setMemo("");
    setSourceId(state.accounts[0]?.id ?? "");
  };

  const handleCreate = () => {
    const amt = parseFloat(amount);
    if (!recipient.trim()) { toast.error("Recipient is required"); return; }
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    const so = createStandingOrder({
      recipient,
      sourceAccountId: sourceId,
      amount: amt,
      frequency,
      nextDate: new Date(nextDate).toISOString(),
      memo: memo || undefined,
    });
    toast.success(`${so.id} created`, { description: `${formatCurrency(amt)} ${frequency.toLowerCase()} to ${recipient}` });
    setCreateOpen(false);
    resetForm();
  };

  const openDetail = (so: StandingOrder) => {
    setActive(so);
    setEditing(false);
    setRecipient(so.recipient);
    setSourceId(so.sourceAccountId);
    setAmount(String(so.amount));
    setFrequency(so.frequency);
    setNextDate(new Date(so.nextDate).toISOString().slice(0, 10));
    setMemo(so.memo ?? "");
  };

  const saveEdit = () => {
    if (!active) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    updateStandingOrder(active.id, {
      recipient,
      amount: amt,
      frequency,
      nextDate: new Date(nextDate).toISOString(),
      memo: memo || undefined,
    });
    toast.success("Standing order updated");
    setEditing(false);
    setActive((a) => a ? { ...a, recipient, amount: amt, frequency, nextDate: new Date(nextDate).toISOString(), memo: memo || undefined } : a);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteStandingOrder(deleteTarget.id);
    toast.success(`${deleteTarget.id} deleted`);
    setDeleteTarget(null);
    setActive(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Scheduled Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your standing orders and recurring payments.</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} className="bg-gradient-primary shadow-glow">
          <Plus className="mr-2 h-4 w-4" />New Standing Order
        </Button>
      </div>

      {/* Active standing orders */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-5">
          <h2 className="font-display text-lg font-semibold">Active standing orders</h2>
        </div>
        {state.standingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Repeat className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No standing orders yet</p>
            <p className="text-sm text-muted-foreground">Schedule recurring payments to automate your finances.</p>
            <Button onClick={() => { resetForm(); setCreateOpen(true); }} className="mt-2 bg-gradient-primary shadow-glow">
              <Plus className="mr-2 h-4 w-4" />Create one
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Recipient</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Frequency</th>
                  <th className="px-5 py-3 font-medium">Next date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.standingOrders.map((so) => (
                  <tr
                    key={so.id}
                    onClick={() => openDetail(so)}
                    className="cursor-pointer hover:bg-muted/30"
                  >
                    <td className="px-5 py-3 font-mono font-medium">{so.reference}</td>
                    <td className="px-5 py-3">{so.recipient}</td>
                    <td className="px-5 py-3 font-semibold tabular-nums">{formatCurrency(so.amount)}</td>
                    <td className="px-5 py-3">{so.frequency}</td>
                    <td className="px-5 py-3">{formatDate(so.nextDate)}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        so.status === "Active" ? "bg-secondary/15 text-secondary" : "bg-yellow-500/15 text-yellow-600",
                      )}>
                        {so.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={() => toggleStandingOrder(so.id)}>
                          {so.status === "Active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(so)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upcoming 30-day timeline */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <CalIcon className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Upcoming 30 days</h2>
        </div>
        {upcoming30.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No payments scheduled in the next 30 days.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming30.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-3"
              >
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <span className="text-[10px] font-semibold uppercase">
                    {new Date(s.nextDate).toLocaleString("en-US", { month: "short" })}
                  </span>
                  <span className="font-display text-base font-bold leading-none">
                    {new Date(s.nextDate).getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.recipient}</p>
                  <p className="text-xs text-muted-foreground">{s.frequency} • {s.reference}</p>
                </div>
                <p className="font-display text-base font-bold tabular-nums">{formatCurrency(s.amount)}</p>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New standing order</DialogTitle>
            <DialogDescription>Set up a recurring payment.</DialogDescription>
          </DialogHeader>
          <SoForm
            recipient={recipient} setRecipient={setRecipient}
            sourceId={sourceId} setSourceId={setSourceId}
            amount={amount} setAmount={setAmount}
            frequency={frequency} setFrequency={setFrequency}
            nextDate={nextDate} setNextDate={setNextDate}
            memo={memo} setMemo={setMemo}
            beneficiaries={state.beneficiaries}
            accounts={state.accounts}
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-gradient-primary shadow-glow">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / Edit drawer */}
      <Sheet open={!!active} onOpenChange={(o) => { if (!o) { setActive(null); setEditing(false); } }}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {active && (
            <div className="flex h-full flex-col">
              <SheetHeader className="text-left">
                <SheetTitle>{active.reference}</SheetTitle>
              </SheetHeader>
              {!editing ? (
                <>
                  <div className="my-6">
                    <p className="text-xs text-muted-foreground">{active.frequency} payment to</p>
                    <p className="font-display text-2xl font-bold">{active.recipient}</p>
                    <p className="mt-2 font-display text-3xl font-bold tabular-nums">{formatCurrency(active.amount)}</p>
                  </div>
                  <dl className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
                    <Row k="Status" v={active.status} />
                    <Row k="Frequency" v={active.frequency} />
                    <Row k="Next date" v={formatDate(active.nextDate)} />
                    <Row k="From" v={state.accounts.find((a) => a.id === active.sourceAccountId)?.name ?? "—"} />
                    {active.memo && <Row k="Memo" v={active.memo} />}
                  </dl>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                    <Button variant="outline" onClick={() => { toggleStandingOrder(active.id); setActive((a) => a ? { ...a, status: a.status === "Active" ? "Paused" : "Active" } : a); }}>
                      {active.status === "Active" ? "Pause" : "Resume"}
                    </Button>
                    <Button variant="destructive" onClick={() => setDeleteTarget(active)}>
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete
                    </Button>
                  </div>
                </>
              ) : (
                <div className="my-6 space-y-4">
                  <SoForm
                    recipient={recipient} setRecipient={setRecipient}
                    sourceId={sourceId} setSourceId={setSourceId}
                    amount={amount} setAmount={setAmount}
                    frequency={frequency} setFrequency={setFrequency}
                    nextDate={nextDate} setNextDate={setNextDate}
                    memo={memo} setMemo={setMemo}
                    beneficiaries={state.beneficiaries}
                    accounts={state.accounts}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button onClick={saveEdit}>Save</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.reference}?</DialogTitle>
            <DialogDescription>This will cancel the recurring payment. You can recreate it any time.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SoForm = ({
  recipient, setRecipient, sourceId, setSourceId, amount, setAmount,
  frequency, setFrequency, nextDate, setNextDate, memo, setMemo,
  beneficiaries, accounts,
}: {
  recipient: string; setRecipient: (s: string) => void;
  sourceId: string; setSourceId: (s: string) => void;
  amount: string; setAmount: (s: string) => void;
  frequency: Frequency; setFrequency: (f: Frequency) => void;
  nextDate: string; setNextDate: (s: string) => void;
  memo: string; setMemo: (s: string) => void;
  beneficiaries: { id: string; name: string }[];
  accounts: { id: string; name: string; balance: number }[];
}) => (
  <div className="space-y-4">
    <div className="space-y-1.5">
      <Label>Recipient</Label>
      <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Name or saved beneficiary" />
      {beneficiaries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {beneficiaries.slice(0, 4).map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setRecipient(b.name)}
              className="rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-[11px] font-medium hover:bg-muted"
            >
              {b.name}
            </button>
          ))}
        </div>
      )}
    </div>
    <div className="space-y-1.5">
      <Label>From account</Label>
      <Select value={sourceId} onValueChange={setSourceId}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>{a.name} • {formatCurrency(a.balance)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Amount</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">$</span>
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="0.00"
            className="pl-7 tabular-nums"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Frequency</Label>
        <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {FREQS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="space-y-1.5">
      <Label>Next / start date</Label>
      <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
    </div>
    <div className="space-y-1.5">
      <Label>Reference / memo (optional)</Label>
      <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="e.g. Apt 4B" />
    </div>
  </div>
);

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-medium tabular-nums text-right">{v}</span>
  </div>
);

export default ScheduledPayments;

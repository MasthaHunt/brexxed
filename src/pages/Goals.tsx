import { useState } from "react";
import { Plus, Target as TargetIcon } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAppState } from "@/state/AppState";
import { formatCurrency } from "@/lib/format";
import { TxLoader } from "@/components/vaulta/TxLoader";

const EMOJIS = ["🛟", "🌴", "💻", "🚗", "🏠", "🎓", "💍", "✈️", "🎁"];

const Goals = () => {
  const { state, addGoalFunds, setState, pushNotification } = useAppState();
  const [createOpen, setCreateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [date, setDate] = useState("");

  const [addAmount, setAddAmount] = useState("");
  const [addFrom, setAddFrom] = useState(state.accounts[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    const t = parseFloat(target);
    if (!name.trim() || name.trim().length < 2) { toast.error("Name must be at least 2 characters"); return; }
    if (name.trim().length > 40) { toast.error("Name is too long"); return; }
    if (!t || t <= 0) { toast.error("Target must be greater than 0"); return; }
    if (t > 1_000_000) { toast.error("Target cannot exceed $1,000,000"); return; }
    setCreateOpen(false);
    setCreating(true);
    setTimeout(() => {
      setState((s) => ({
        ...s,
        goals: [...s.goals, { id: `g-${Date.now()}`, name: name.trim(), target: t, saved: 0, emoji, targetDate: date || undefined }],
      }));
      pushNotification({
        type: "system",
        title: "Savings goal created",
        body: `${emoji} ${name.trim()} · target ${formatCurrency(t)}.`,
      });
      setCreating(false);
      toast.success("Goal created");
      setName(""); setTarget(""); setEmoji(EMOJIS[0]); setDate("");
    }, 700);
  };

  const handleAdd = () => {
    if (!addOpen) return;
    const a = parseFloat(addAmount);
    const acc = state.accounts.find((x) => x.id === addFrom);
    if (!a || a <= 0) { toast.error("Enter a valid amount"); return; }
    if (!acc || acc.balance < a) { toast.error("Insufficient balance"); return; }
    const goalId = addOpen;
    const goalName = state.goals.find((g) => g.id === goalId)?.name ?? "goal";
    setAddOpen(null);
    setLoading(true);
    setTimeout(() => {
      addGoalFunds(goalId, a, addFrom);
      pushNotification({
        type: "transaction",
        title: "Goal funded",
        body: `${formatCurrency(a)} added to ${goalName}.`,
      });
      setLoading(false);
      toast.success("Funds added to goal");
      setAddAmount("");
    }, 900);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Savings Goals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track progress toward what matters.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-primary shadow-glow">
          <Plus className="mr-2 h-4 w-4" />New Goal
        </Button>
      </div>

      {state.goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <TargetIcon className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No goals yet</p>
          <p className="text-sm text-muted-foreground">Create your first savings goal to get started.</p>
          <Button onClick={() => setCreateOpen(true)} className="bg-gradient-primary shadow-glow">Create goal</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {state.goals.map((g) => {
            const pct = Math.min(100, (g.saved / g.target) * 100);
            const r = 50;
            const c = 2 * Math.PI * r;
            return (
              <div key={g.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-center gap-4">
                  <div className="relative h-28 w-28">
                    <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                      <circle cx="60" cy="60" r={r} stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
                      <motion.circle
                        cx="60" cy="60" r={r}
                        stroke="hsl(var(--primary))" strokeWidth="10" fill="none" strokeLinecap="round"
                        initial={{ strokeDasharray: `0 ${c}` }}
                        animate={{ strokeDasharray: `${(pct / 100) * c} ${c}` }}
                        transition={{ duration: 0.9 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl">{g.emoji}</span>
                      <span className="text-xs font-bold tabular-nums">{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-bold">{g.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatCurrency(g.saved)} / {formatCurrency(g.target)}
                    </p>
                    <Button size="sm" className="mt-2" onClick={() => setAddOpen(g.id)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />Add funds
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New goal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vacation, MacBook…" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Target amount</Label>
                <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Target date (optional)</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition-all ${
                      emoji === e ? "border-primary bg-accent" : "border-border hover:bg-muted"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-gradient-primary shadow-glow">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addOpen} onOpenChange={(o) => !o && setAddOpen(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add funds</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>From account</Label>
              <Select value={addFrom} onValueChange={setAddFrom}>
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
                <Input inputMode="decimal" value={addAmount} onChange={(e) => setAddAmount(e.target.value.replace(/[^\d.]/g, ""))} className="pl-7 tabular-nums" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setAddOpen(null)}>Cancel</Button>
            <Button onClick={handleAdd} className="bg-gradient-primary shadow-glow">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TxLoader open={loading} label="Adding funds…" />
      <TxLoader open={creating} label="Creating goal…" />
    </div>
  );
};

export default Goals;

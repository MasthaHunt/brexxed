import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Download, Filter, ArrowUpRight, ArrowDownRight, X, CircleCheck, Clock, Loader2, AlertTriangle } from "lucide-react";
import { TENOR_SECONDS, type TxTenor } from "@/state/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/state/AppState";
import { CategoryIcon } from "@/components/vaulta/CategoryIcon";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import type { Transaction, TxCategory } from "@/state/types";

const CATEGORIES: (TxCategory | "All")[] = [
  "All", "Food", "Transport", "Shopping", "Utilities", "Transfers", "Salary", "Entertainment", "Health", "FX", "Deposits", "Loans",
];

const Transactions = () => {
  const { state, setState } = useAppState();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TxCategory | "All">("All");
  const [accountId, setAccountId] = useState<string>("all");
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");
  const [active, setActive] = useState<Transaction | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const filtered = useMemo(() => {
    const min = parseFloat(minAmt);
    const max = parseFloat(maxAmt);
    return state.transactions
      .filter((t) => (category === "All" ? true : t.category === category))
      .filter((t) => (accountId === "all" ? true : t.accountId === accountId))
      .filter((t) => (isNaN(min) ? true : Math.abs(t.amount) >= min))
      .filter((t) => (isNaN(max) ? true : Math.abs(t.amount) <= max))
      .filter((t) =>
        query.trim() === ""
          ? true
          : t.merchant.toLowerCase().includes(query.toLowerCase()) ||
            t.reference.toLowerCase().includes(query.toLowerCase()),
      )
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [state.transactions, query, category, accountId, minAmt, maxAmt]);

  const openTx = (tx: Transaction) => {
    setActive(tx);
    setNoteDraft(tx.note ?? "");
  };

  const saveNote = () => {
    if (!active) return;
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) => (t.id === active.id ? { ...t, note: noteDraft } : t)),
    }));
    toast.success("Note saved");
    setActive((a) => (a ? { ...a, note: noteDraft } : a));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} of {state.transactions.length} entries</p>
        </div>
        <Button variant="outline" onClick={() => toast.success("CSV export ready")}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_160px_180px_110px_110px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search merchant or reference…"
              className="pl-10"
            />
          </div>
          <Select value={category} onValueChange={(v) => setCategory(v as TxCategory | "All")}>
            <SelectTrigger>
              <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {state.accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Min $"
            inputMode="decimal"
            value={minAmt}
            onChange={(e) => setMinAmt(e.target.value.replace(/[^\d.]/g, ""))}
          />
          <Input
            placeholder="Max $"
            inputMode="decimal"
            value={maxAmt}
            onChange={(e) => setMaxAmt(e.target.value.replace(/[^\d.]/g, ""))}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {state.transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium">No transactions yet</p>
            <p className="text-sm text-muted-foreground">Start banking with Brex to see activity here.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium">No transactions match your filters</p>
            <p className="text-sm text-muted-foreground">Try a different search or clear filters.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((tx, idx) => {
              const credit = tx.amount > 0;
              const acct = state.accounts.find((a) => a.id === tx.accountId);
              return (
                <motion.li
                  key={tx.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.015, 0.2) }}
                >
                  <button
                    onClick={() => openTx(tx)}
                    className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 md:px-5"
                  >
                    <CategoryIcon category={tx.category} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{tx.merchant}</p>
                        <span className="hidden rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
                          {tx.category}
                        </span>
                        {tx.status === "held" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Under Review
                          </span>
                        )}
                        {tx.status === "pending" && (
                          acct?.dafRequired && tx.tenor === "selffund" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              DAF Hold
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              Pending
                            </span>
                          )
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(tx.date)} • {acct?.name ?? "Account"}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-semibold tabular-nums ${credit ? "text-secondary" : "text-foreground"}`}>
                      {credit ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      {credit ? "+" : "-"}
                      {formatCurrency(Math.abs(tx.amount))}
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Detail drawer */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {active && (
            <div className="flex h-full flex-col">
              <SheetHeader className="text-left">
                <SheetTitle className="flex items-center gap-3">
                  <CategoryIcon category={active.category} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold">{active.merchant}</p>
                    <p className="text-xs font-normal text-muted-foreground">{formatDateTime(active.date)}</p>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="my-6">
                <p className={`font-display text-3xl font-bold tabular-nums ${active.amount > 0 ? "text-secondary" : "text-foreground"}`}>
                  {active.amount > 0 ? "+" : "-"}
                  {formatCurrency(Math.abs(active.amount))}
                </p>
              </div>

              <dl className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Reference</dt>
                  <dd className="font-mono font-medium">{active.reference}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="inline-flex items-center gap-1.5 font-medium capitalize">
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      active.status === "completed" ? "bg-secondary"
                      : active.status === "held" ? "bg-destructive"
                      : "bg-primary animate-pulse",
                    )} />
                    {active.status === "held" ? "Under Review" : active.status}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="font-medium">{active.category}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Account</dt>
                  <dd className="font-medium">
                    {state.accounts.find((a) => a.id === active.accountId)?.name ?? "—"}
                  </dd>
                </div>
              </dl>

              {/* Timeline */}
              <div className="mt-5 space-y-3">
                {active.status === "held" && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <div>
                        <p className="text-[13px] font-semibold text-destructive">
                          Transaction Under Compliance Review
                        </p>
                        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                          {active.securityHoldReason ?? "This transaction has been placed under a mandatory compliance review. Please visit your nearest branch with valid identification to resolve."}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-destructive/20 bg-muted/30 px-4 py-3 text-[12px] text-muted-foreground">
                      <p className="font-semibold uppercase tracking-wider text-destructive/80">Required Action</p>
                      <p className="mt-1">Present a valid government-issued photo ID at your nearest Brex-designated branch and complete biometric verification to lift this hold.</p>
                    </div>
                  </div>
                )}
                {active.tenor === "selffund" && active.status === "pending" && !!state.accounts.find((a) => a.id === active.accountId)?.dafRequired && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300">
                        Deposit Activation Fee required
                      </p>
                      <p className="mt-0.5 text-[12px] leading-snug text-amber-600/90 dark:text-amber-400/90">
                        A one-time fee of $2,500 is required before these funds can settle. Processing is paused until the fee is cleared.
                      </p>
                    </div>
                  </div>
                )}
                {/* Hold-pending: show "review in progress" instead of the normal timeline */}
                {active.status === "pending" && !!active.securityHoldReason && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300">
                        Compliance Review In Progress
                      </p>
                      <p className="mt-0.5 text-[12px] leading-snug text-amber-600/90 dark:text-amber-400/90">
                        This transaction is undergoing a mandatory compliance review. Processing is paused until the review is complete.
                      </p>
                    </div>
                  </div>
                )}
                {active.status !== "held" && !(active.status === "pending" && !!active.securityHoldReason) && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Timeline
                    </p>
                    <Timeline
                      tx={active}
                      dafPaused={
                        active.tenor === "selffund" &&
                        active.status === "pending" &&
                        !!state.accounts.find((a) => a.id === active.accountId)?.dafRequired
                      }
                    />
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Note
                </label>
                <Textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add a personal note…"
                  rows={4}
                  maxLength={300}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setActive(null)}>
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Close
                  </Button>
                  <Button size="sm" onClick={saveNote}>Save note</Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

/* ====== Transaction Timeline ======
 * Stages progress in real-time based on the transaction's tenor.
 * - International wires use the longest tenor.
 * - Internal transfers / bills use shorter tenors but never instant.
 * Pending stages render an animated skeleton placeholder.
 */
const Timeline = ({ tx, dafPaused = false }: { tx: Transaction; dafPaused?: boolean }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (tx.status === "completed" || dafPaused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tx.status, dafPaused]);

  const inferred: TxTenor =
    tx.tenor ??
    (/intl|wire/i.test(tx.merchant)
      ? "wire"
      : tx.category === "Loans" || tx.category === "Deposits"
        ? "slow"
        : tx.category === "Transfers"
          ? "standard"
          : tx.category === "Utilities" || tx.category === "FX"
            ? "fast"
            : "instant");

  const totalMs = TENOR_SECONDS[inferred] * 1000;
  const t0 = new Date(tx.date).getTime();
  const offsets = [0, 0.1, 0.45, 1];
  const ts = offsets.map((o) => t0 + Math.round(totalMs * o));

  const isWire = inferred === "wire";
  const credit = tx.amount > 0;

  // When DAF is paused, freeze the display at exactly 75% (= the 18 h / 24 h checkpoint).
  const effectiveNow = dafPaused ? t0 + Math.round(totalMs * 0.75) : now;

  const isStageDone = (i: number) => {
    if (tx.status === "completed") return true;
    return effectiveNow >= ts[i];
  };
  const activeIdx = tx.status === "completed" ? 3 : Math.max(0, offsets.findIndex((_, i) => !isStageDone(i)) - 1);

  const totalElapsed = Math.min(1, Math.max(0, (effectiveNow - t0) / totalMs));
  const remainingMs = Math.max(0, totalMs - (effectiveNow - t0));

  const labels = [
    { label: credit ? "Inbound received" : "Initiated", desc: credit ? "Funds detected by the network." : "Brex received your request." },
    { label: "Authorized", desc: credit ? "Issuing bank confirmed the credit." : "Bank approved and reserved the amount." },
    { label: isWire ? "Clearing network" : "Processed", desc: isWire ? "Routed via SWIFT correspondent banks." : "Posted against your available balance." },
    { label: "Settled", desc: "Posted to your statement and reconciled." },
  ];

  const fmt = (msVal: number) =>
    new Date(msVal).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const fmtRemaining = (ms: number) => {
    if (ms < 60_000) return `${Math.ceil(ms / 1000)}s remaining`;
    if (ms < 3_600_000) return `~${Math.ceil(ms / 60_000)}m remaining`;
    return `~${Math.ceil(ms / 3_600_000)}h remaining`;
  };

  return (
    <div>
      {tx.status === "pending" && (
        <>
          {dafPaused ? (
            <div className="mb-2.5 flex items-center justify-between gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                Paused — DAF fee required
              </div>
              <span className="text-[11px] text-amber-600 dark:text-amber-400">Awaiting clearance</span>
            </div>
          ) : (
            <div className="mb-2.5 flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2 text-[12px] font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                {isWire ? "International wire in transit" : "Processing"}
              </div>
              <span className="text-[11px] tabular-nums text-muted-foreground">{fmtRemaining(remainingMs)}</span>
            </div>
          )}
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-gradient-primary"
              initial={false}
              animate={{ width: `${totalElapsed * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </>
      )}
      <ol className="relative space-y-3.5 pl-1">
        <span className="absolute left-[10px] top-2 bottom-2 w-px bg-border" aria-hidden />
        {labels.map((s, i) => {
          const done = isStageDone(i);
          const isCurrent = !done && i === activeIdx + 1;
          return (
            <li key={i} className="relative flex items-start gap-3">
              <div className="relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {done ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <CircleCheck className="h-3 w-3" />
                  </span>
                ) : dafPaused && isCurrent ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-400/60 bg-background text-amber-500">
                    <AlertTriangle className="h-3 w-3" />
                  </span>
                ) : isCurrent ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-primary/60 bg-background text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </span>
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 bg-background text-muted-foreground">
                    <Clock className="h-3 w-3" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 pb-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <p className={cn(
                    "text-[13px] font-semibold",
                    done || isCurrent ? "text-foreground" : "text-muted-foreground",
                  )}>
                    {s.label}
                  </p>
                  {done ? (
                    <span className="text-[10.5px] tabular-nums text-muted-foreground">{fmt(ts[i])}</span>
                  ) : dafPaused && isCurrent ? (
                    <span className="text-[10.5px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">Paused</span>
                  ) : isCurrent ? (
                    <span className="text-[10.5px] font-medium uppercase tracking-wider text-primary">In progress</span>
                  ) : (
                    <Skeleton className="h-3 w-16" />
                  )}
                </div>
                {done || isCurrent ? (
                  <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{s.desc}</p>
                ) : (
                  <div className="mt-1 space-y-1">
                    <Skeleton className="h-2.5 w-full" />
                    <Skeleton className="h-2.5 w-3/4" />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default Transactions;

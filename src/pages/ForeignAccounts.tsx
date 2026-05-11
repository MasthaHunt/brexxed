import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRightLeft, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useAppState } from "@/state/AppState";
import { formatDate } from "@/lib/format";
import { TxLoader } from "@/components/vaulta/TxLoader";
import type { FxAccount, FxCurrency } from "@/state/types";

// Static FX rates as of "today"
const RATES: Record<FxCurrency, Record<FxCurrency | "NGN", number>> = {
  USD: { USD: 1, GBP: 0.79, EUR: 0.92, NGN: 1540.0 },
  GBP: { USD: 1.2658, GBP: 1, EUR: 1.1646, NGN: 1950.0 },
  EUR: { USD: 1.087, GBP: 0.8557, EUR: 1, NGN: 1680.0 },
};

const USD_VALUE = (curr: FxCurrency, balance: number) =>
  curr === "USD" ? balance : balance * RATES[curr].USD;

const fmt = (n: number, opts: Intl.NumberFormatOptions = {}) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, ...opts });

const ForeignAccounts = () => {
  const { state, convertFx } = useAppState();
  const [from, setFrom] = useState<string>(state.fxAccounts[0]?.id ?? "");
  const [to, setTo] = useState<string>(state.fxAccounts[1]?.id ?? "");
  const [amt, setAmt] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fromAcc = state.fxAccounts.find((a) => a.id === from);
  const toAcc = state.fxAccounts.find((a) => a.id === to);
  const rate = fromAcc && toAcc ? RATES[fromAcc.currency][toAcc.currency] : 1;
  const amount = parseFloat(amt) || 0;
  const converted = +(amount * rate).toFixed(2);

  const isEmpty = state.fxAccounts.length === 0;

  const handleReview = () => {
    if (!fromAcc || !toAcc) { toast.error("Select both accounts"); return; }
    if (fromAcc.id === toAcc.id) { toast.error("Choose different accounts"); return; }
    if (amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (amount > fromAcc.balance) { toast.error("Insufficient balance"); return; }
    setReviewOpen(true);
  };

  const handleConfirm = () => {
    if (!fromAcc || !toAcc) return;
    setReviewOpen(false);
    setLoading(true);
    setTimeout(() => {
      const fx = convertFx(fromAcc.id, toAcc.id, amount, rate);
      setLoading(false);
      if (fx) {
        toast.success("Conversion successful", {
          description: `${fromAcc.symbol}${fmt(amount)} → ${toAcc.symbol}${fmt(converted)}`,
        });
        setAmt("");
      } else {
        toast.error("Conversion failed");
      }
    }, 1300);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Foreign Currency Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Hold and convert balances across currencies.</p>
      </div>

      {isEmpty ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <Globe className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No foreign currency accounts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Multi-currency accounts will appear here once provisioned.</p>
        </div>
      ) : (
        <>
          {/* FX cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {state.fxAccounts.map((fx) => (
              <FxCard key={fx.id} fx={fx} />
            ))}
          </div>

          {/* Conversion + Rates */}
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
              <h2 className="font-display text-lg font-semibold">Currency conversion</h2>
              <p className="mt-1 text-sm text-muted-foreground">Convert between your FX accounts using today's rates.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>From</Label>
                  <Select value={from} onValueChange={setFrom}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {state.fxAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.flag} {a.currency} • {a.symbol}{fmt(a.balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>To</Label>
                  <Select value={to} onValueChange={setTo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {state.fxAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.flag} {a.currency} • {a.symbol}{fmt(a.balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Amount ({fromAcc?.currency})</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                      {fromAcc?.symbol}
                    </span>
                    <Input
                      inputMode="decimal"
                      value={amt}
                      onChange={(e) => setAmt(e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder="0.00"
                      className="pl-7 font-display text-base font-semibold tabular-nums"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Rate · 1 {fromAcc?.currency} = {rate.toFixed(4)} {toAcc?.currency}</span>
                  <span>Live preview</span>
                </div>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                  {toAcc?.symbol}{fmt(converted)}
                </p>
              </div>
              <Button onClick={handleReview} className="mt-4 w-full bg-gradient-primary shadow-glow md:w-auto">
                <ArrowRightLeft className="mr-2 h-4 w-4" />Review conversion
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Live exchange rates</h2>
                <span className="text-xs text-muted-foreground">Rates as of today</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">From</th>
                      <th className="px-4 py-2 font-medium">To</th>
                      <th className="px-4 py-2 text-right font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { f: "USD", t: "NGN", r: RATES.USD.NGN },
                      { f: "GBP", t: "NGN", r: RATES.GBP.NGN },
                      { f: "EUR", t: "NGN", r: RATES.EUR.NGN },
                      { f: "USD", t: "GBP", r: RATES.USD.GBP },
                      { f: "USD", t: "EUR", r: RATES.USD.EUR },
                    ].map((row) => (
                      <tr key={`${row.f}-${row.t}`}>
                        <td className="px-4 py-2 font-medium">{row.f}</td>
                        <td className="px-4 py-2">{row.t}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.r.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* FX history */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="border-b border-border p-5">
              <h2 className="font-display text-lg font-semibold">FX transaction history</h2>
              <p className="text-sm text-muted-foreground">Last 8 conversions</p>
            </div>
            {state.fxTransactions.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No FX transactions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">From</th>
                      <th className="px-5 py-3 font-medium">To</th>
                      <th className="px-5 py-3 font-medium">Amount</th>
                      <th className="px-5 py-3 font-medium">Rate</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {state.fxTransactions.slice(0, 8).map((fx) => (
                      <tr key={fx.id} className="hover:bg-muted/30">
                        <td className="px-5 py-3">{formatDate(fx.date)}</td>
                        <td className="px-5 py-3 font-medium">{fx.from}</td>
                        <td className="px-5 py-3 font-medium">{fx.to}</td>
                        <td className="px-5 py-3 tabular-nums">
                          {fmt(fx.amount)} {fx.from} → {fmt(fx.converted)} {fx.to}
                        </td>
                        <td className="px-5 py-3 tabular-nums">{fx.rate.toFixed(4)}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-2.5 py-0.5 text-[11px] font-semibold text-secondary">
                            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                            {fx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Review modal */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm conversion</DialogTitle>
            <DialogDescription>Review your FX conversion before confirming.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
            <Row k="From" v={`${fromAcc?.flag} ${fromAcc?.symbol}${fmt(amount)} ${fromAcc?.currency}`} />
            <Row k="To" v={`${toAcc?.flag} ${toAcc?.symbol}${fmt(converted)} ${toAcc?.currency}`} accent />
            <Row k="Rate" v={`1 ${fromAcc?.currency} = ${rate.toFixed(4)} ${toAcc?.currency}`} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirm} className="bg-gradient-primary shadow-glow">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TxLoader open={loading} label="Converting currency…" />
    </div>
  );
};

const FxCard = ({ fx }: { fx: FxAccount }) => {
  const usd = USD_VALUE(fx.currency, fx.balance);
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{fx.flag}</span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{fx.currency}</p>
            <p className="text-sm font-semibold">{fx.name}</p>
          </div>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          •••• {fx.number}
        </span>
      </div>
      <p className="mt-4 font-display text-3xl font-bold tabular-nums">
        {fx.symbol}{fmt(fx.balance)}
      </p>
      {fx.currency !== "USD" && (
        <p className="text-xs text-muted-foreground">~ ${fmt(usd)} USD</p>
      )}
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant="outline" className="flex-1">Convert</Button>
        <Button size="sm" variant="outline" className="flex-1">Transfer</Button>
      </div>
    </motion.div>
  );
};

const Row = ({ k, v, accent }: { k: string; v: string; accent?: boolean }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-muted-foreground">{k}</span>
    <span className={`font-medium tabular-nums text-right ${accent ? "font-display text-base text-primary" : ""}`}>
      {v}
    </span>
  </div>
);

export default ForeignAccounts;

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Plus,
  Repeat as RepeatIcon,
  ArrowLeftRight,
  Receipt,
  FileText,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Banknote,
  Repeat,
  Sparkles,
  LineChart as LineChartIcon,
  Table as TableIcon,
  MoreHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useAppState, useTotalBalance } from "@/state/AppState";
import { AnimatedNumber } from "@/components/vaulta/AnimatedNumber";
import { CategoryIcon } from "@/components/vaulta/CategoryIcon";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SelfFundCard } from "@/components/vaulta/SelfFundCard";

const Dashboard = () => {
  const { state } = useAppState();
  const total = useTotalBalance();
  const [view, setView] = useState<"chart" | "table">("chart");

  const recent = useMemo(
    () => [...state.transactions].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 5),
    [state.transactions],
  );

  const fdTotal = useMemo(
    () => state.fixedDeposits.filter((d) => d.status === "Active").reduce((s, d) => s + d.principal, 0),
    [state.fixedDeposits],
  );

  const nearestMaturity = useMemo(() => {
    const active = state.fixedDeposits.filter((d) => d.status === "Active");
    if (active.length === 0) return null;
    return active.reduce((acc, d) => (+new Date(d.maturityDate) < +new Date(acc.maturityDate) ? d : acc));
  }, [state.fixedDeposits]);

  const upcoming = useMemo(
    () =>
      [...state.standingOrders]
        .filter((s) => s.status === "Active")
        .sort((a, b) => +new Date(a.nextDate) - +new Date(b.nextDate))
        .slice(0, 3),
    [state.standingOrders],
  );

  const isEmpty = state.transactions.length === 0;

  // Build 30-day balance trend. For empty users we render a flat zero line
  // and disable the tooltip entirely so hovering reveals nothing.
  const trendData = useMemo(() => {
    const points = 24;
    if (isEmpty) {
      return Array.from({ length: points }, (_, i) => ({ d: i, v: 0 }));
    }
    const start = total * 0.92 || 100;
    const arr: { d: number; v: number }[] = [];
    for (let i = 0; i < points; i++) {
      const t = i / (points - 1);
      const noise = (Math.sin(i * 1.3) + Math.cos(i * 0.7)) * (total * 0.005);
      arr.push({ d: i, v: +(start + (total - start) * t + noise).toFixed(2) });
    }
    arr[arr.length - 1].v = +total.toFixed(2);
    return arr;
  }, [total, isEmpty]);

  // 30-day stats — also zeroed for empty users.
  const inflow = useMemo(
    () => (isEmpty ? 0 : state.transactions.filter((t) => t.amount > 0).slice(0, 30).reduce((s, t) => s + t.amount, 0)),
    [state.transactions, isEmpty],
  );
  const outflow = useMemo(
    () => (isEmpty ? 0 : Math.abs(state.transactions.filter((t) => t.amount < 0).slice(0, 30).reduce((s, t) => s + t.amount, 0))),
    [state.transactions, isEmpty],
  );

  const firstName = state.profile.name.split(" ")[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-foreground md:text-[34px]">
          Welcome, {firstName}
        </h1>

        {/* Action chips row */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="h-9 rounded-full bg-foreground px-4 font-semibold text-background hover:bg-foreground/90">
            <Link to="/transfer"><Send className="mr-1.5 h-3.5 w-3.5" />Send</Link>
          </Button>
          <ChipLink to="/transfer" icon={<ArrowLeftRight className="h-3.5 w-3.5" />} label="Transfer" />
          <ChipLink to="/transfer?tab=add" icon={<Plus className="h-3.5 w-3.5" />} label="Deposit" />
          <ChipLink to="/transfer?tab=bills" icon={<Receipt className="h-3.5 w-3.5" />} label="Pay Bill" />
          <ChipLink to="/scheduled-payments" icon={<RepeatIcon className="h-3.5 w-3.5" />} label="Schedule" />
          <ChipLink to="/accounts" icon={<FileText className="h-3.5 w-3.5" />} label="Statements" />
        </div>
      </div>

      {/* Takeshi-only self-funding widget */}
      <SelfFundCard />

      {/* Hero row: balance chart + accounts list */}
      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-muted-foreground">Brex balance</p>
              <p className="mt-1 font-display text-[32px] font-bold leading-tight tracking-tight tabular-nums md:text-[38px]">
                <span className="text-muted-foreground">$</span>
                <AnimatedNumber value={total} />
              </p>
            </div>
            <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/40 p-0.5">
              <ToggleBtn active={view === "chart"} onClick={() => setView("chart")} aria-label="Chart view">
                <LineChartIcon className="h-3.5 w-3.5" />
              </ToggleBtn>
              <ToggleBtn active={view === "table"} onClick={() => setView("table")} aria-label="Table view">
                <TableIcon className="h-3.5 w-3.5" />
              </ToggleBtn>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-medium">Last 30 days</span>
            </div>
            <div className="flex items-center gap-3 tabular-nums">
              <span className="inline-flex items-center gap-1 font-semibold text-success">
                <TrendingUp className="h-3.5 w-3.5" />
                {isEmpty ? "$0" : `+${formatCurrency(inflow)}`}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-destructive">
                <TrendingDown className="h-3.5 w-3.5" />
                {isEmpty ? "$0" : `-${formatCurrency(outflow)}`}
              </span>
            </div>
          </div>

          {/* Chart / table */}
          {view === "chart" ? (
            <div className="mt-4 h-[200px] w-full md:h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="dashSpark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" hide />
                  <YAxis hide domain={isEmpty ? [0, 1] : ["dataMin - 500", "dataMax + 500"]} />
                  {!isEmpty && (
                    <Tooltip
                      cursor={{ stroke: "hsl(var(--foreground))", strokeWidth: 1, strokeOpacity: 0.3, strokeDasharray: "3 3" }}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 10,
                        fontSize: 12,
                        boxShadow: "var(--shadow-md)",
                      }}
                      formatter={(v: number) => [formatCurrency(v), "Balance"]}
                      labelFormatter={() => ""}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#dashSpark)"
                    isAnimationActive
                    animationDuration={800}
                    activeDot={isEmpty ? false : { r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 max-h-[230px] overflow-y-auto rounded-xl border border-border">
              {isEmpty ? (
                <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">
                  No balance history yet.
                </div>
              ) : (
                <table className="w-full text-[13px]">
                  <tbody className="divide-y divide-border">
                    {trendData.slice(-8).reverse().map((p, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground">Day {trendData.length - i}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatCurrency(p.v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {isEmpty && (
            <p className="mt-4 text-[13px] text-muted-foreground">
              Add funds to get started.{" "}
              <Link to="/transfer?tab=add" className="font-semibold text-foreground hover:underline">
                Make your first deposit →
              </Link>
            </p>
          )}
        </motion.div>

        {/* Accounts list panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold">Accounts</h2>
            <div className="flex items-center gap-1">
              <button className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted" aria-label="Add account">
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted" aria-label="More">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <ul className="mt-4 divide-y divide-border">
            {state.accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-foreground">{a.name}</p>
                </div>
                <p className="font-display text-[15px] font-semibold tabular-nums">
                  {formatCurrency(a.balance)}
                </p>
              </li>
            ))}
          </ul>

          <Link
            to="/accounts"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-2 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-muted"
          >
            <FileText className="h-3.5 w-3.5" />
            View all accounts
          </Link>
        </motion.div>
      </div>

      {/* FX mini-widget */}
      {state.fxAccounts.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold">Foreign currency</h2>
            <Link to="/foreign-accounts" className="flex items-center gap-1 text-[13px] font-medium text-foreground/80 hover:text-foreground hover:underline">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {state.fxAccounts.map((fx) => (
              <Link
                key={fx.id}
                to="/foreign-accounts"
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/60"
              >
                <span className="text-2xl">{fx.flag}</span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{fx.currency}</p>
                  <p className="font-display text-base font-bold tabular-nums">
                    {fx.symbol}{fx.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Activity + side widgets */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Recent transactions */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold">Recent activity</h2>
            <Link to="/transactions" className="flex items-center gap-1 text-[13px] font-medium text-foreground/80 hover:text-foreground hover:underline">
              See all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground">Start banking with Brex to see activity here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((tx) => {
                const credit = tx.amount > 0;
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <CategoryIcon category={tx.category} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{tx.merchant}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.category} • {formatDate(tx.date)}
                      </p>
                    </div>
                    <div className={cn("flex items-center gap-1 text-sm font-semibold tabular-nums", credit ? "text-success" : "text-foreground")}>
                      {credit ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      {credit ? "+" : "-"}
                      {formatCurrency(Math.abs(tx.amount))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: FD + Upcoming + Goals */}
        <div className="space-y-5">
          {/* Fixed Deposits */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-display text-[14px] font-semibold">
                <Banknote className="h-4 w-4 text-foreground/70" />Fixed deposits
              </h2>
              <Link to="/fixed-deposits" className="text-xs font-medium text-foreground/80 hover:text-foreground hover:underline">
                View all
              </Link>
            </div>
            {fdTotal === 0 ? (
              <div className="py-3 text-center">
                <p className="text-sm text-muted-foreground">No active deposits.</p>
                <Link to="/fixed-deposits" className="mt-1.5 inline-block text-xs font-semibold text-foreground hover:underline">
                  Open your first FD →
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Total locked</p>
                <p className="mt-1 font-display text-[22px] font-bold tabular-nums">{formatCurrency(fdTotal)}</p>
                {nearestMaturity && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Next maturity: <span className="font-semibold text-foreground">{formatDate(nearestMaturity.maturityDate)}</span>
                  </p>
                )}
              </>
            )}
          </div>

          {/* Upcoming payments */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-display text-[14px] font-semibold">
                <Repeat className="h-4 w-4 text-foreground/70" />Upcoming
              </h2>
              <Link to="/scheduled-payments" className="text-xs font-medium text-foreground/80 hover:text-foreground hover:underline">
                View all
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">No scheduled payments.</p>
            ) : (
              <div className="space-y-2.5">
                {upcoming.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.recipient}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(s.nextDate)}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(s.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Savings goals */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-3 font-display text-[14px] font-semibold">Savings goals</h2>
            {state.goals.length === 0 ? (
              <div className="py-3 text-center">
                <p className="text-sm text-muted-foreground">No goals yet.</p>
                <Link to="/goals" className="mt-1.5 inline-block text-xs font-semibold text-foreground hover:underline">
                  Create your first goal →
                </Link>
              </div>
            ) : (
              <div className="space-y-3.5">
                {state.goals.map((g) => {
                  const pct = Math.min(100, (g.saved / g.target) * 100);
                  return (
                    <div key={g.id}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium"><span className="mr-1.5">{g.emoji}</span>{g.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatCurrency(g.saved)} / {formatCurrency(g.target)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.9, ease: "easeOut" }}
                          className="h-full rounded-full bg-foreground"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChipLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <Link
    to={to}
    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[13px] font-medium text-foreground/85 transition-all hover:border-foreground/30 hover:bg-muted/40"
  >
    {icon}
    {label}
  </Link>
);

const ToggleBtn = ({
  active,
  onClick,
  children,
  ...rest
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    onClick={onClick}
    {...rest}
    className={cn(
      "flex h-7 w-7 items-center justify-center rounded-full transition-all",
      active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </button>
);

export default Dashboard;

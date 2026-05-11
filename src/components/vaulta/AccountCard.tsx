import { motion } from "framer-motion";
import type { Account } from "@/state/types";
import { formatCurrency, maskAccount } from "@/lib/format";
import { cn } from "@/lib/utils";

const gradientByColor: Record<Account["color"], string> = {
  violet: "linear-gradient(135deg, hsl(245 100% 65%) 0%, hsl(265 95% 62%) 50%, hsl(285 90% 60%) 100%)",
  mint: "linear-gradient(135deg, hsl(168 100% 38%) 0%, hsl(180 95% 42%) 50%, hsl(200 95% 50%) 100%)",
  indigo: "linear-gradient(135deg, hsl(230 80% 25%) 0%, hsl(245 70% 35%) 50%, hsl(265 70% 45%) 100%)",
};

export const AccountCard = ({ account, compact = false }: { account: Account; compact?: boolean }) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn(
        "shimmer relative overflow-hidden rounded-2xl p-5 text-white shadow-card",
        compact ? "min-h-[140px]" : "min-h-[180px]",
      )}
      style={{ backgroundImage: gradientByColor[account.color] }}
    >
      <div className="relative z-10 flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">{account.name}</p>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums">
              {formatCurrency(account.balance)}
            </p>
          </div>
          <div className="rounded-md bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur">
            {account.network}
          </div>
        </div>
        <div className="flex items-end justify-between text-xs">
          <span className="font-mono tracking-wider text-white/85">{maskAccount(account.number)}</span>
          <span className="text-white/60">BREX</span>
        </div>
      </div>
      {/* decorative orbs */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-black/20 blur-3xl" />
    </motion.div>
  );
};

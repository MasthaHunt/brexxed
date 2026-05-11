import {
  ShoppingBag,
  Utensils,
  Car,
  Zap,
  ArrowLeftRight,
  Briefcase,
  Tv,
  Heart,
  Banknote,
  Landmark,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TxCategory } from "@/state/types";

const map: Record<TxCategory, { Icon: LucideIcon; tint: string }> = {
  Food: { Icon: Utensils, tint: "bg-orange-500/15 text-orange-500" },
  Transport: { Icon: Car, tint: "bg-blue-500/15 text-blue-500" },
  Shopping: { Icon: ShoppingBag, tint: "bg-pink-500/15 text-pink-500" },
  Utilities: { Icon: Zap, tint: "bg-yellow-500/15 text-yellow-500" },
  Transfers: { Icon: ArrowLeftRight, tint: "bg-primary/15 text-primary" },
  Salary: { Icon: Briefcase, tint: "bg-secondary/15 text-secondary" },
  Entertainment: { Icon: Tv, tint: "bg-fuchsia-500/15 text-fuchsia-500" },
  Health: { Icon: Heart, tint: "bg-rose-500/15 text-rose-500" },
  FX: { Icon: Globe, tint: "bg-cyan-500/15 text-cyan-500" },
  Deposits: { Icon: Banknote, tint: "bg-emerald-500/15 text-emerald-500" },
  Loans: { Icon: Landmark, tint: "bg-violet-500/15 text-violet-500" },
};

export const CategoryIcon = ({ category, size = "md" }: { category: TxCategory; size?: "sm" | "md" | "lg" }) => {
  const { Icon, tint } = map[category];
  const dim = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const ic = size === "lg" ? "h-5 w-5" : size === "sm" ? "h-4 w-4" : "h-4.5 w-4.5";
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-xl", dim, tint)}>
      <Icon className={ic} />
    </div>
  );
};

import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  ListOrdered,
  Banknote,
  Globe,
  Repeat,
  Target,
  Landmark,
  Bell,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "./Logo";
import { useAppState } from "@/state/AppState";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/accounts", label: "Accounts", Icon: Wallet },
  { to: "/transactions", label: "Transactions", Icon: ListOrdered },
  { to: "/transfer", label: "Transfer", Icon: ArrowLeftRight },
  { to: "/fixed-deposits", label: "Fixed Deposits", Icon: Banknote },
  { to: "/foreign-accounts", label: "Foreign Accounts", Icon: Globe },
  { to: "/scheduled-payments", label: "Scheduled Payments", Icon: Repeat },
  { to: "/goals", label: "Savings Goals", Icon: Target },
  { to: "/loans", label: "Loans & Credit", Icon: Landmark },
  { to: "/notifications", label: "Notifications", Icon: Bell },
  { to: "/settings", label: "Settings", Icon: Settings },
];

export const Sidebar = () => {
  const { state, setAuthed } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = () => {
    setAuthed(false);
    toast("Signed out");
    navigate("/login", { replace: true });
  };

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-5">
        <Logo size={28} animate={false} />
      </div>

      <nav className="relative flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  aria-hidden
                  className="pointer-events-none absolute -left-3 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.Icon
                className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-primary" : "")}
                aria-hidden
              />
              <span className="flex-1 leading-none">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/40 p-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-primary">
            {state.profile.avatarUrl ? (
              <img src={state.profile.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-bold text-primary-foreground">
                {state.profile.avatarInitials}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{state.profile.name}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-secondary" />
              {state.profile.tier}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

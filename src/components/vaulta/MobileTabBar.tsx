import { NavLink } from "react-router-dom";
import { LayoutDashboard, Wallet, ArrowLeftRight, ListOrdered, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Home", Icon: LayoutDashboard },
  { to: "/accounts", label: "Accounts", Icon: Wallet },
  { to: "/transfer", label: "Transfer", Icon: ArrowLeftRight },
  { to: "/transactions", label: "Activity", Icon: ListOrdered },
  { to: "/notifications", label: "Alerts", Icon: Bell },
];

export const MobileTabBar = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
                  />
                )}
                <item.Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="leading-none">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

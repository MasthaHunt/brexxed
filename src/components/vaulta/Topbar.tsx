import { Bell, Menu } from "lucide-react";
import { useAppState, useTotalBalance } from "@/state/AppState";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { formatCurrency } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { NAV_ITEMS } from "./Sidebar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Topbar = () => {
  const { state, setAuthed } = useAppState();
  const total = useTotalBalance();
  const navigate = useNavigate();
  const unread = state.notifications.filter((n) => !n.read).length;

  const handleSignOut = () => {
    setAuthed(false);
    toast("Signed out");
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      {/* Mobile: hamburger + logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:bg-muted"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex h-16 items-center px-5">
              <Logo size={28} animate={false} />
            </div>
            <nav className="space-y-0.5 px-3 py-2">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/80 hover:bg-muted",
                    )
                  }
                >
                  <item.Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <Logo size={26} animate={false} />
      </div>

      {/* Desktop: balance pill */}
      <div className="hidden lg:flex">
        <div className="flex items-center gap-3 rounded-full border border-border bg-muted/50 px-4 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">Total balance</span>
          <span className="font-display text-sm font-bold tabular-nums">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:bg-muted"
        >
          <Bell className="h-4.5 w-4.5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Link>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Account menu"
              className="h-10 w-10 overflow-hidden rounded-full bg-gradient-primary shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {state.profile.avatarUrl ? (
                <img src={state.profile.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-bold text-primary-foreground">
                  {state.profile.avatarInitials}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{state.profile.name}</div>
              <div className="text-xs font-normal text-muted-foreground">{state.profile.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

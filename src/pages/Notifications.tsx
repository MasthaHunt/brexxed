import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Trash2, ShieldAlert, ArrowRightLeft, Sparkles, Info, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAppState } from "@/state/AppState";
import { cn } from "@/lib/utils";

const typeMeta: Record<string, { Icon: typeof Bell; tint: string; label: string }> = {
  security: { Icon: ShieldAlert, tint: "bg-destructive/10 text-destructive", label: "Security" },
  transaction: { Icon: ArrowRightLeft, tint: "bg-secondary/15 text-secondary", label: "Transaction" },
  promo: { Icon: Sparkles, tint: "bg-primary/10 text-primary", label: "Update" },
  system: { Icon: Info, tint: "bg-muted text-foreground/70", label: "System" },
};

const relativeTime = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const groupKey = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  if ((today.getTime() - d.getTime()) / 86400000 < 7) return "This week";
  return "Earlier";
};

const Notifications = () => {
  const { state, setState } = useAppState();
  const [filter, setFilter] = useState<"all" | "unread" | "alerts">("all");

  const filtered = useMemo(() => {
    return state.notifications
      .filter((n) => {
        if (filter === "unread") return !n.read;
        if (filter === "alerts") return n.type === "security" || n.type === "system";
        return true;
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [state.notifications, filter]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const n of filtered) {
      const key = groupKey(n.date);
      (groups[key] ??= []).push(n);
    }
    return groups;
  }, [filtered]);

  const order = ["Today", "Yesterday", "This week", "Earlier"];
  const unreadCount = state.notifications.filter((n) => !n.read).length;

  const markAll = () => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    toast.success("All marked as read");
  };

  const toggleRead = (id: string) =>
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => n.id === id ? { ...n, read: !n.read } : n) }));

  const remove = (id: string) => {
    setState((s) => ({ ...s, notifications: s.notifications.filter((n) => n.id !== id) }));
    toast("Notification removed");
  };

  const clearAll = () => {
    setState((s) => ({ ...s, notifications: [] }));
    toast("All notifications cleared");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0 ? (
              <>
                <span className="font-semibold text-foreground">{unreadCount}</span> unread of {state.notifications.length}
              </>
            ) : (
              "You're all caught up"
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAll}>
              <CheckCheck className="mr-1.5 h-4 w-4" />Mark all read
            </Button>
          )}
          {state.notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground hover:text-destructive">
              Clear all
            </Button>
          )}
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="grid w-full max-w-sm grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread" className="gap-1.5">
            Unread
            {unreadCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-20 text-center shadow-card">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">No notifications</p>
                <p className="mt-0.5 text-sm text-muted-foreground">We'll let you know when something happens.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {order.map((bucket) => {
                const items = grouped[bucket];
                if (!items || items.length === 0) return null;
                return (
                  <section key={bucket}>
                    <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {bucket}
                    </h2>
                    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                      <ul className="divide-y divide-border">
                        <AnimatePresence initial={false}>
                          {items.map((n, i) => {
                            const meta = typeMeta[n.type] ?? typeMeta.system;
                            const Icon = meta.Icon;
                            return (
                              <motion.li
                                key={n.id}
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -8, height: 0, marginTop: 0, marginBottom: 0 }}
                                transition={{ delay: Math.min(i * 0.02, 0.15), duration: 0.22 }}
                                className={cn(
                                  "group relative flex items-start gap-3 p-4 transition-colors hover:bg-muted/40 sm:gap-4",
                                  !n.read && "bg-accent/40",
                                )}
                              >
                                {!n.read && (
                                  <span className="absolute left-0 top-0 h-full w-[3px] bg-primary" aria-hidden />
                                )}
                                <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", meta.tint)}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <p className={cn("text-sm leading-snug", !n.read ? "font-semibold text-foreground" : "font-medium text-foreground/90")}>
                                      {n.title}
                                    </p>
                                    <span className="text-[11px] font-medium text-muted-foreground">· {relativeTime(n.date)}</span>
                                  </div>
                                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleRead(n.id)} aria-label={n.read ? "Mark as unread" : "Mark as read"}>
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(n.id)} aria-label="Delete">
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </div>
                              </motion.li>
                            );
                          })}
                        </AnimatePresence>
                      </ul>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;

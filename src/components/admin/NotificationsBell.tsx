import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  TicketPercent,
  ShieldCheck,
  Settings as SettingsIcon,
  ScrollText,
  Loader2,
  CheckCheck,
  Inbox,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  adminListAuditLogs,
  type AuditLogRow,
} from "@/lib/admin-audit.functions";
import { hasAnyRole, type AppRole } from "@/lib/rbac";

const LAST_SEEN_KEY = "admin:notifications:lastSeenAt";

type Bucket = "orders" | "customers" | "staff" | "menu" | "coupons" | "system";

const BUCKET_META: Record<Bucket, { label: string; icon: LucideIcon; to: string }> = {
  orders: { label: "Orders", icon: ShoppingBag, to: "/admin/orders" },
  customers: { label: "Customers", icon: Users, to: "/admin/customers" },
  staff: { label: "Staff", icon: ShieldCheck, to: "/admin/staff" },
  menu: { label: "Menu", icon: UtensilsCrossed, to: "/admin/menu" },
  coupons: { label: "Coupons", icon: TicketPercent, to: "/admin/coupons" },
  system: { label: "System", icon: SettingsIcon, to: "/admin/audit-logs" },
};

function classifyBucket(row: AuditLogRow): Bucket {
  const mod = (row.metadata?.module ?? "").toString().toLowerCase();
  const ent = (row.entity_type ?? "").toLowerCase();
  const src = `${mod} ${ent} ${row.action ?? ""}`.toLowerCase();
  if (/(order)/.test(src)) return "orders";
  if (/(customer|profile)/.test(src)) return "customers";
  if (/(staff|invitation|role|auth|login)/.test(src)) return "staff";
  if (/(menu|item|category)/.test(src)) return "menu";
  if (/(coupon|banner|promo|marketing)/.test(src)) return "coupons";
  return "system";
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function readLastSeen(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(LAST_SEEN_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

function writeLastSeen(ts: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_SEEN_KEY, String(ts));
}

function routeFor(row: AuditLogRow, bucket: Bucket): { to: string; search?: Record<string, string> } {
  const base = BUCKET_META[bucket].to;
  if (bucket === "orders" && row.entity_id) {
    // Order search accepts `q`; entity_id may be a UUID or order number.
    return { to: base, search: { q: row.entity_id } };
  }
  return { to: base };
}

export function NotificationsBell({ roles }: { roles?: AppRole[] }) {
  const canView = hasAnyRole(roles, ["owner", "admin", "manager"]);
  const [open, setOpen] = React.useState(false);
  const [lastSeen, setLastSeen] = React.useState<number>(() => readLastSeen());
  const navigate = useNavigate();
  const list = useServerFn(adminListAuditLogs);

  const query = useQuery({
    queryKey: ["admin", "notifications", "audit"],
    queryFn: () => list({ data: { limit: 40 } }),
    enabled: canView,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
    staleTime: 20_000,
  });

  const rows = React.useMemo(() => (query.data ?? []) as AuditLogRow[], [query.data]);

  const grouped = React.useMemo(() => {
    const map = new Map<Bucket, AuditLogRow[]>();
    for (const r of rows) {
      const b = classifyBucket(r);
      const arr = map.get(b) ?? [];
      arr.push(r);
      map.set(b, arr);
    }
    return map;
  }, [rows]);

  const unread = React.useMemo(
    () => rows.filter((r) => new Date(r.created_at).getTime() > lastSeen).length,
    [rows, lastSeen],
  );

  const markAllRead = React.useCallback(() => {
    const ts = rows[0] ? new Date(rows[0].created_at).getTime() : Date.now();
    writeLastSeen(ts);
    setLastSeen(ts);
  }, [rows]);

  const onClickRow = (row: AuditLogRow) => {
    const b = classifyBucket(row);
    const dest = routeFor(row, b);
    setOpen(false);
    // Update last seen up to this row so it clears from unread
    const ts = Math.max(lastSeen, new Date(row.created_at).getTime());
    writeLastSeen(ts);
    setLastSeen(ts);
    requestAnimationFrame(() => {
      navigate({ to: dest.to, search: (dest.search ?? {}) as never });
    });
  };

  if (!canView) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl motion-safe:transition-colors"
          aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 grid min-h-[16px] min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(92vw,380px)] overflow-hidden rounded-2xl p-0"
      >
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Notifications</div>
            <div className="text-[11px] text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "You're all caught up"}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={markAllRead}
            disabled={unread === 0}
            aria-label="Mark all as read"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        </div>

        {query.isLoading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            Loading activity…
          </div>
        ) : query.isError ? (
          <div className="px-4 py-8 text-center text-xs text-destructive">
            Couldn't load notifications.
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => query.refetch()}>
                Retry
              </Button>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-xs text-muted-foreground">
            <Inbox className="h-8 w-8 opacity-60" />
            <div>No activity yet.</div>
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <div className="flex flex-col">
              {(["orders", "customers", "staff", "menu", "coupons", "system"] as Bucket[])
                .map((b) => ({ b, items: grouped.get(b) ?? [] }))
                .filter((g) => g.items.length > 0)
                .map(({ b, items }) => {
                  const meta = BUCKET_META[b];
                  const Icon = meta.icon;
                  return (
                    <div key={b} className="border-b border-border/60 last:border-0">
                      <div className="flex items-center gap-2 bg-muted/40 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {meta.label}
                        <span className="ml-auto text-[10px] font-normal normal-case tracking-normal">
                          {items.length}
                        </span>
                      </div>
                      <ul className="divide-y divide-border/50">
                        {items.slice(0, 8).map((row) => {
                          const isUnread =
                            new Date(row.created_at).getTime() > lastSeen;
                          return (
                            <li key={row.id}>
                              <button
                                type="button"
                                onClick={() => onClickRow(row)}
                                className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left text-xs motion-safe:transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                              >
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                                    isUnread ? "bg-primary" : "bg-transparent",
                                  )}
                                />
                                <span className="min-w-0 flex-1">
                                  <span
                                    className={cn(
                                      "block truncate text-[13px]",
                                      isUnread
                                        ? "font-semibold text-foreground"
                                        : "text-foreground/90",
                                    )}
                                  >
                                    {row.summary ?? row.action}
                                  </span>
                                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <span className="truncate">
                                      {row.actor_email ?? "system"}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span className="shrink-0">
                                      {relativeTime(row.created_at)}
                                    </span>
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        )}

        <div className="border-t border-border/70 bg-muted/30 px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-center text-xs"
            onClick={() => {
              setOpen(false);
              requestAnimationFrame(() => navigate({ to: "/admin/audit-logs" }));
            }}
          >
            <ScrollText className="h-3.5 w-3.5" />
            View all in Audit Logs
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

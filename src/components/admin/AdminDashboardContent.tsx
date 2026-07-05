import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  ChefHat,
  CheckCircle2,
  Clock,
  DollarSign,
  Flame,
  Package,
  PackageCheck,
  Plus,
  ShoppingBag,
  Sparkles,
  Ticket,
  Truck,
  Users,
  XCircle,
  CalendarClock,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import { adminPromoStats } from "@/lib/admin-promos.functions";
import { adminListCustomers, type AdminCustomerRow } from "@/lib/admin-customers.functions";
import { adminReports } from "@/lib/admin-reports.functions";
import { adminListOrders, adminOrderStats, type AdminOrderRow } from "@/lib/admin-orders.functions";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR } from "@/lib/admin-orders";

// -----------------------------------------------------------------------------
// Shared UI
// -----------------------------------------------------------------------------

type Stat = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "primary" | "success" | "warning" | "info" | "destructive" | "neutral";
};

const TONE: Record<Stat["tone"], string> = {
  primary: "bg-primary/15 text-foreground",
  success: "bg-success/15 text-success-foreground",
  warning: "bg-warning/20 text-warning-foreground",
  info: "bg-info/15 text-info",
  destructive: "bg-destructive/15 text-destructive",
  neutral: "bg-muted text-foreground",
};

function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;
  return (
    <div className="group rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-1)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)]">
      <div className="flex items-start justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-xl", TONE[stat.tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {stat.label}
        </div>
        <div className="mt-1 font-display text-2xl font-black tracking-tight">{stat.value}</div>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-1)]">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="mt-4 h-3 w-24 rounded" />
      <Skeleton className="mt-2 h-7 w-32 rounded" />
    </div>
  );
}

function ErrorCard({
  title = "Couldn't load",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/15 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-foreground">{title}</div>
          <div className="mt-0.5 line-clamp-2 text-muted-foreground">
            {message ?? "Something went wrong. Please try again."}
          </div>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="rounded-lg">
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Unknown error";
}

// -----------------------------------------------------------------------------
// Live stats (orders)
// -----------------------------------------------------------------------------

function useOrderStatsQuery() {
  const fetchStats = useServerFn(adminOrderStats);
  return useQuery({
    queryKey: ["admin", "order-stats"],
    queryFn: () => fetchStats({ data: undefined }),
    refetchInterval: 30_000,
    retry: 1,
  });
}

function LiveStatsGrid() {
  const qc = useQueryClient();
  const q = useOrderStatsQuery();

  React.useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => qc.invalidateQueries({ queryKey: ["admin", "order-stats"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  if (q.isError) {
    return <ErrorCard message={errMsg(q.error)} onRetry={() => q.refetch()} />;
  }
  if (q.isLoading || !q.data) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const d = q.data;
  const stats: Stat[] = [
    { label: "Today's Orders", value: String(d.today_orders), icon: ShoppingBag, tone: "primary" },
    { label: "Revenue Today", value: formatPKR(d.today_revenue_pkr), icon: DollarSign, tone: "success" },
    { label: "Pending", value: String(d.pending), icon: Clock, tone: "warning" },
    { label: "Preparing", value: String(d.preparing + d.confirmed), icon: ChefHat, tone: "info" },
    { label: "Delivered", value: String(d.delivered), icon: PackageCheck, tone: "success" },
    { label: "Cancelled", value: String(d.cancelled), icon: XCircle, tone: "destructive" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {stats.map((s) => (
        <StatCard key={s.label} stat={s} />
      ))}
    </div>
  );
}

function PromoStatsGrid() {
  const qc = useQueryClient();
  const fetchStats = useServerFn(adminPromoStats);
  const q = useQuery({
    queryKey: ["admin", "promo-stats"],
    queryFn: () => fetchStats({ data: undefined }),
    refetchInterval: 60_000,
    retry: 1,
  });

  React.useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-promos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coupons" },
        () => qc.invalidateQueries({ queryKey: ["admin", "promo-stats"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promo_banners" },
        () => qc.invalidateQueries({ queryKey: ["admin", "promo-stats"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  if (q.isError) {
    return <ErrorCard message={errMsg(q.error)} onRetry={() => q.refetch()} />;
  }
  if (q.isLoading || !q.data) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const d = q.data;
  const stats: Stat[] = [
    { label: "Active Coupons", value: String(d.active_coupons), icon: Ticket, tone: "primary" },
    { label: "Active Banners", value: String(d.active_banners), icon: ImageIcon, tone: "info" },
    {
      label: "Scheduled Promos",
      value: String(d.scheduled_promotions),
      icon: CalendarClock,
      tone: "warning",
    },
    { label: "Expired Coupons", value: String(d.expired_coupons), icon: XCircle, tone: "neutral" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((s) => (
        <StatCard key={s.label} stat={s} />
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Weekly report (revenue chart + top items)
// -----------------------------------------------------------------------------

function useWeeklyReport() {
  const fetchReport = useServerFn(adminReports);
  const range = React.useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);
  return useQuery({
    queryKey: ["admin", "dashboard-weekly", range.from, range.to],
    queryFn: () =>
      fetchReport({
        data: {
          from: range.from,
          to: range.to,
          branchId: null,
          status: null,
          categoryId: null,
          userId: null,
          couponCode: null,
        },
      }),
    staleTime: 60_000,
    retry: 1,
  });
}

function RevenueChart({
  data,
  loading,
  error,
  onRetry,
}: {
  data?: { trend: Array<{ date: string; revenue: number }>; totalRevenue: number; revenueGrowth: number | null };
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
}) {
  if (error) return <ErrorCard message={errMsg(error)} onRetry={onRetry} />;

  const trend = data?.trend ?? [];
  const points = trend.length ? trend.map((t) => t.revenue) : [];
  const hasData = points.some((p) => p > 0);
  const max = hasData ? Math.max(...points, 1) : 1;
  const w = 560;
  const h = 180;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (p / max) * (h - 20) - 10}`)
    .join(" ");
  const area = points.length ? `${line} L ${w} ${h} L 0 ${h} Z` : "";
  const growth = data?.revenueGrowth;

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-1)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Revenue last 7 days
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            {loading ? (
              <Skeleton className="h-8 w-40 rounded" />
            ) : (
              <span className="font-display text-3xl font-black">
                {formatPKR(data?.totalRevenue ?? 0)}
              </span>
            )}
            {growth != null && Number.isFinite(growth) && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
                  growth >= 0
                    ? "bg-success/15 text-success-foreground"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                <ArrowUpRight className="h-3 w-3" />
                {growth >= 0 ? "+" : ""}
                {growth.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-6 h-[200px] w-full overflow-hidden">
        {loading ? (
          <Skeleton className="h-full w-full rounded-xl" />
        ) : hasData ? (
          <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#rev)" />
            <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            No revenue in the last 7 days yet.
          </div>
        )}
      </div>
      {trend.length > 0 && (
        <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {trend.map((t) => (
            <span key={t.date}>
              {new Date(t.date).toLocaleDateString("en-GB", { weekday: "short" })}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Order status overview (from live stats)
// -----------------------------------------------------------------------------

function OrderStatusOverview() {
  const q = useOrderStatsQuery();

  if (q.isError) {
    return <ErrorCard message={errMsg(q.error)} onRetry={() => q.refetch()} />;
  }
  if (q.isLoading || !q.data) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-1)]">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="mt-2 h-7 w-24 rounded" />
        <Skeleton className="mt-5 h-2.5 w-full rounded-full" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full rounded" />
          ))}
        </div>
      </div>
    );
  }

  const d = q.data;
  const items = [
    { label: "Pending", value: d.pending, color: "bg-warning" },
    { label: "Preparing", value: d.preparing + d.confirmed, color: "bg-info" },
    { label: "Out for delivery", value: d.out_for_delivery, color: "bg-primary" },
    { label: "Delivered", value: d.delivered, color: "bg-success" },
    { label: "Cancelled", value: d.cancelled, color: "bg-destructive" },
  ];
  const total = items.reduce((a, s) => a + s.value, 0);

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-1)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Order status
          </div>
          <div className="mt-1 font-display text-2xl font-black">{total} orders</div>
        </div>
        <Package className="h-5 w-5 text-muted-foreground" />
      </div>
      {total > 0 ? (
        <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-muted">
          {items.map((s) => (
            <div
              key={s.label}
              className={cn("h-full", s.color)}
              style={{ width: `${(s.value / total) * 100}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 h-2.5 rounded-full bg-muted" />
      )}
      <ul className="mt-5 space-y-3">
        {items.map((s) => (
          <li key={s.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", s.color)} />
              <span className="text-foreground/80">{s.label}</span>
            </span>
            <span className="font-semibold tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Recent orders (real data)
// -----------------------------------------------------------------------------

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/20 text-warning-foreground",
  confirmed: "bg-info/15 text-info",
  preparing: "bg-info/15 text-info",
  ready: "bg-primary/20 text-foreground",
  out_for_delivery: "bg-primary/20 text-foreground",
  delivered: "bg-success/15 text-success-foreground",
  cancelled: "bg-destructive/15 text-destructive",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function RecentOrders() {
  const qc = useQueryClient();
  const fetchList = useServerFn(adminListOrders);
  const q = useQuery({
    queryKey: ["admin", "dashboard-recent-orders"],
    queryFn: () => fetchList({ data: { limit: 6 } }) as Promise<AdminOrderRow[]>,
    refetchInterval: 30_000,
    retry: 1,
  });

  React.useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-recent-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => qc.invalidateQueries({ queryKey: ["admin", "dashboard-recent-orders"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
        <div>
          <div className="font-display text-lg font-black">Recent Orders</div>
          <div className="text-xs text-muted-foreground">Latest activity across the kitchen</div>
        </div>
        <Button asChild variant="ghost" size="sm" className="rounded-lg">
          <Link to="/admin/orders">View all</Link>
        </Button>
      </div>
      {q.isError ? (
        <div className="p-6">
          <ErrorCard message={errMsg(q.error)} onRetry={() => q.refetch()} />
        </div>
      ) : q.isLoading ? (
        <div className="space-y-3 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      ) : (q.data ?? []).length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No orders yet. New orders will appear here in real time.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3 font-semibold">Order</th>
                <th className="px-2 py-3 font-semibold">Customer</th>
                <th className="px-2 py-3 font-semibold">Items</th>
                <th className="px-2 py-3 font-semibold">Total</th>
                <th className="px-2 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 text-right font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((o) => (
                <tr key={o.id} className="border-t border-border/50 transition-colors hover:bg-muted/40">
                  <td className="px-6 py-3 font-mono text-xs font-semibold">{o.order_number}</td>
                  <td className="px-2 py-3">{o.customer_name ?? "—"}</td>
                  <td className="px-2 py-3 tabular-nums text-muted-foreground">{o.items_count}</td>
                  <td className="px-2 py-3 font-semibold tabular-nums">{formatPKR(o.total_pkr)}</td>
                  <td className="px-2 py-3">
                    <Badge
                      className={cn(
                        "rounded-full font-semibold",
                        STATUS_STYLE[o.status] ?? "bg-muted text-foreground",
                      )}
                      variant="secondary"
                    >
                      {STATUS_LABEL[o.status] ?? o.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right text-xs text-muted-foreground">
                    {relTime(o.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Latest customers (real data)
// -----------------------------------------------------------------------------

function LatestCustomers() {
  const qc = useQueryClient();
  const fetchList = useServerFn(adminListCustomers);
  const q = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: () => fetchList({ data: undefined }) as Promise<AdminCustomerRow[]>,
    retry: 1,
  });

  React.useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-customers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => qc.invalidateQueries({ queryKey: ["admin", "customers"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const rows = (q.data ?? [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
        <div>
          <div className="font-display text-lg font-black">Latest Customers</div>
          <div className="text-xs text-muted-foreground">New sign-ups</div>
        </div>
        <Users className="h-4 w-4 text-muted-foreground" />
      </div>
      {q.isError ? (
        <div className="p-6">
          <ErrorCard message={errMsg(q.error)} onRetry={() => q.refetch()} />
        </div>
      ) : q.isLoading ? (
        <div className="space-y-3 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">No customers yet</div>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((c) => {
            const name = c.full_name ?? "Unnamed";
            const initials = name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <li key={c.id} className="flex items-center gap-3 px-6 py-3">
                <Avatar className="h-9 w-9">
                  {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                  <AvatarFallback className="bg-primary/20 text-xs font-bold">
                    {initials || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.email ?? c.phone ?? "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">{c.total_orders}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Top selling items (real data from weekly report)
// -----------------------------------------------------------------------------

function TopSellingItems({
  items,
  loading,
  error,
  onRetry,
}: {
  items?: Array<{ name: string; qty: number; revenue: number }>;
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
}) {
  const list = (items ?? []).slice(0, 5);
  const max = list.length ? Math.max(...list.map((i) => i.qty), 1) : 1;
  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
        <div>
          <div className="font-display text-lg font-black">Top Selling Items</div>
          <div className="text-xs text-muted-foreground">Last 7 days</div>
        </div>
        <Flame className="h-4 w-4 text-primary" />
      </div>
      {error ? (
        <div className="p-6">
          <ErrorCard message={errMsg(error)} onRetry={onRetry} />
        </div>
      ) : loading ? (
        <div className="space-y-4 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full rounded" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No item sales in the last 7 days.
        </div>
      ) : (
        <ul className="space-y-4 p-6">
          {list.map((item) => (
            <li key={item.name}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-semibold">{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  {item.qty} sold ·{" "}
                  <span className="font-semibold text-foreground">{formatPKR(item.revenue)}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                  style={{ width: `${(item.qty / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Quick actions (real navigation)
// -----------------------------------------------------------------------------

const ACTIONS: Array<{ label: string; icon: LucideIcon; tone: string; to: string }> = [
  { label: "Add menu item", icon: Plus, tone: "bg-primary/15 text-foreground", to: "/admin/menu" },
  { label: "Create coupon", icon: Ticket, tone: "bg-info/15 text-info", to: "/admin/coupons" },
  { label: "New promo banner", icon: Sparkles, tone: "bg-warning/20 text-warning-foreground", to: "/admin/promo-banners" },
  { label: "Dispatch order", icon: Truck, tone: "bg-success/15 text-success-foreground", to: "/admin/orders" },
  { label: "Mark order ready", icon: CheckCircle2, tone: "bg-primary/15 text-foreground", to: "/admin/orders" },
  { label: "Manage staff", icon: Users, tone: "bg-muted text-foreground", to: "/admin/staff" },
];

function QuickActions() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-1)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-display text-lg font-black">Quick Actions</div>
          <div className="text-xs text-muted-foreground">Shortcuts to common tasks</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.label}
              to={a.to}
              className="group flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-2)]"
            >
              <span className={cn("grid h-9 w-9 place-items-center rounded-lg", a.tone)}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold leading-tight">{a.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Page composition
// -----------------------------------------------------------------------------

export function AdminDashboardContent() {
  const weekly = useWeeklyReport();

  const chartData = weekly.data
    ? {
        trend: (weekly.data.trend ?? []).map((t) => ({
          date: t.date,
          revenue: t.revenue,
        })),
        totalRevenue: weekly.data.revenue?.total ?? 0,
        revenueGrowth:
          typeof weekly.data.revenue?.growthPct === "number"
            ? weekly.data.revenue.growthPct
            : null,
      }
    : undefined;
  const topItems = weekly.data?.products?.best?.map((p) => ({
    name: p.name,
    qty: p.qty,
    revenue: p.revenue,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of today's kitchen performance.
          </p>
        </div>
      </div>

      <LiveStatsGrid />

      <PromoStatsGrid />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart
            data={chartData}
            loading={weekly.isLoading}
            error={weekly.isError ? weekly.error : undefined}
            onRetry={() => weekly.refetch()}
          />
        </div>
        <OrderStatusOverview />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentOrders />
        </div>
        <LatestCustomers />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopSellingItems
            items={topItems}
            loading={weekly.isLoading}
            error={weekly.isError ? weekly.error : undefined}
            onRetry={() => weekly.refetch()}
          />
        </div>
        <QuickActions />
      </div>
    </div>
  );
}

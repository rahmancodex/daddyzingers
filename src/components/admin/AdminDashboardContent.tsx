import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  ChefHat,
  CheckCircle2,
  Clock,
  DollarSign,
  Flame,
  History,
  Lock,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Store,
  Ticket,
  Truck,
  UserPlus,
  Users,
  XCircle,
  CalendarClock,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { adminPromoStats } from "@/lib/admin-promos.functions";
import { adminListCustomers, type AdminCustomerRow } from "@/lib/admin-customers.functions";
import { adminReports } from "@/lib/admin-reports.functions";
import {
  adminListOrders,
  adminOrderStats,
  type AdminOrderRow,
} from "@/lib/admin-orders.functions";
import { adminMe } from "@/lib/admin-staff.functions";
import { adminListAuditLogs, type AuditLogRow } from "@/lib/admin-audit.functions";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR } from "@/lib/admin-orders";
import { hasPermission, type AppRole } from "@/lib/rbac";
import {
  DateRangeProvider,
  DateRangePicker,
  useDateRange,
  PRESET_LABEL,
  type DateRangePreset,
} from "@/components/admin/ui/date-range";
import { ChartCard } from "@/components/admin/ui/chart-card";
import { PageHeader } from "@/components/admin/ui/page-header";

// -----------------------------------------------------------------------------
// Primitives
// -----------------------------------------------------------------------------

type Tone = "primary" | "success" | "warning" | "info" | "destructive" | "neutral";

const TONE_CHIP: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
  success: "bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400",
  info: "bg-sky-500/10 text-sky-600 ring-1 ring-inset ring-sky-500/20 dark:text-sky-400",
  destructive: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
  neutral: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
};

const TONE_DOT: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground/40",
};

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}

/** Premium card surface used across the dashboard. */
function Surface({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group/surface relative overflow-hidden rounded-2xl border border-border/70 bg-card",
        "shadow-[0_1px_0_0_hsl(var(--foreground)/0.02),0_1px_2px_-1px_hsl(var(--foreground)/0.06)]",
        "transition-[box-shadow,transform,border-color] duration-200",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground ring-1 ring-inset ring-border">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate font-display text-base font-bold tracking-tight sm:text-lg">
            {title}
          </div>
          {subtitle && (
            <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function InlineError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-destructive/15 text-destructive">
        <AlertTriangle className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-foreground">Couldn't load</div>
        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {message ?? "Please try again in a moment."}
        </div>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="h-8 gap-1.5 rounded-lg text-xs"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </Button>
      )}
    </div>
  );
}

function EmptyRow({
  icon: Icon = Activity,
  title,
  hint,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground ring-1 ring-inset ring-border">
        <Icon className="h-5 w-5" />
      </span>
      <div className="text-sm font-semibold">{title}</div>
      {hint && <div className="max-w-xs text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Current staff role (for permission-gated widgets)
// -----------------------------------------------------------------------------

function useMyRoles() {
  const fetchMe = useServerFn(adminMe);
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => {
      const me = await fetchMe();
      return ((me.roles ?? []) as AppRole[]).filter(Boolean);
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

// -----------------------------------------------------------------------------
// KPI cards
// -----------------------------------------------------------------------------

type Kpi = {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
  hint?: string;
  /** Deep-link into the Orders page with filters pre-applied. */
  to?: string;
  search?: Record<string, string>;
};

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon;
  const body = (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-0 transition-opacity group-hover/surface:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {kpi.label}
          </div>
          <div className="mt-2 font-display text-[26px] font-black leading-none tracking-tight tabular-nums">
            {kpi.value}
          </div>
          {kpi.hint && (
            <div className="mt-1.5 truncate text-xs text-muted-foreground">{kpi.hint}</div>
          )}
        </div>
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
            TONE_CHIP[kpi.tone],
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
    </>
  );
  const surfaceCls =
    "p-5 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_30px_-15px_hsl(var(--foreground)/0.25)]";
  if (kpi.to) {
    return (
      <Link
        to={kpi.to}
        search={kpi.search as never}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
        aria-label={`Open orders filtered by ${kpi.label}`}
      >
        <Surface className={surfaceCls}>{body}</Surface>
      </Link>
    );
  }
  return <Surface className={surfaceCls}>{body}</Surface>;
}

function KpiSkeleton() {
  return (
    <Surface className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-7 w-24 rounded-md" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
    </Surface>
  );
}

// -----------------------------------------------------------------------------
// Live order KPIs
// -----------------------------------------------------------------------------

function useOrderStatsQuery() {
  const fetchStats = useServerFn(adminOrderStats);
  return useQuery({
    queryKey: ["admin", "order-stats"],
    queryFn: () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return fetchStats({ data: { today_start: d.toISOString() } });
    },
    refetchInterval: 30_000,
    retry: 1,
  });
}

function useOrdersRealtime(keys: string[][]) {
  const qc = useQueryClient();
  React.useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-orders-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          for (const key of keys) qc.invalidateQueries({ queryKey: key });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function LiveKpiGrid() {
  const q = useOrderStatsQuery();
  useOrdersRealtime([["admin", "order-stats"], ["admin", "dashboard-recent-orders"]]);

  if (q.isError) {
    return <InlineError message={errMsg(q.error)} onRetry={() => q.refetch()} />;
  }
  if (q.isLoading || !q.data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
    );
  }
  const d = q.data;
  const kpis: Kpi[] = [
    {
      key: "today",
      label: "Orders Today",
      value: String(d.today_orders),
      icon: ShoppingBag,
      tone: "primary",
      hint: "Placed since midnight · view all",
      to: "/admin/orders",
      search: { range: "today" },
    },
    {
      key: "rev",
      label: "Revenue Today",
      value: formatPKR(d.today_revenue_pkr),
      icon: DollarSign,
      tone: "success",
      hint: "Gross of taxes & fees · view orders",
      to: "/admin/orders",
      search: { range: "today" },
    },
    {
      key: "pending",
      label: "Pending",
      value: String(d.pending),
      icon: Clock,
      tone: "warning",
      hint: "Awaiting confirmation",
      to: "/admin/orders",
      search: { status: "pending" },
    },
    {
      key: "preparing",
      label: "Preparing",
      value: String(d.preparing),
      icon: ChefHat,
      tone: "info",
      hint: "In the kitchen right now",
      to: "/admin/orders",
      search: { status: "preparing" },
    },
    {
      key: "delivered",
      label: "Delivered",
      value: String(d.delivered),
      icon: PackageCheck,
      tone: "success",
      hint: "Completed today",
      to: "/admin/orders",
      search: { status: "delivered", range: "today" },
    },
    {
      key: "cancelled",
      label: "Cancelled",
      value: String(d.cancelled),
      icon: XCircle,
      tone: "destructive",
      hint: "Refunded or voided today",
      to: "/admin/orders",
      search: { status: "cancelled", range: "today" },
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((k) => (
        <KpiCard key={k.key} kpi={k} />
      ))}
    </div>
  );
}

function PromoKpiGrid() {
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
      .channel("admin-dashboard-promos-rt")
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
    return <InlineError message={errMsg(q.error)} onRetry={() => q.refetch()} />;
  }
  if (q.isLoading || !q.data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
    );
  }
  const d = q.data;
  const kpis: Kpi[] = [
    { key: "ac", label: "Active Coupons", value: String(d.active_coupons), icon: Ticket, tone: "primary" },
    { key: "ab", label: "Active Banners", value: String(d.active_banners), icon: ImageIcon, tone: "info" },
    { key: "sp", label: "Scheduled Promos", value: String(d.scheduled_promotions), icon: CalendarClock, tone: "warning" },
    { key: "ex", label: "Expired Coupons", value: String(d.expired_coupons), icon: XCircle, tone: "neutral" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      {kpis.map((k) => (
        <KpiCard key={k.key} kpi={k} />
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Weekly report (revenue chart + top items)
// -----------------------------------------------------------------------------

function useWeeklyReport() {
  const fetchReport = useServerFn(adminReports);
  const { range } = useDateRange();
  const from = range.from.toISOString();
  const to = range.to.toISOString();
  return useQuery({
    queryKey: ["admin", "dashboard-report", from, to],
    queryFn: () =>
      fetchReport({
        data: {
          from,
          to,
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

type TrendPoint = { date: string; revenue: number; label: string };

function RevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TrendPoint; value: number }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border/70 bg-popover px-3 py-2 shadow-lg">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {new Date(p.date).toLocaleDateString("en-GB", {
          weekday: "short",
          day: "2-digit",
          month: "short",
        })}
      </div>
      <div className="mt-0.5 font-display text-sm font-black tabular-nums">
        {formatPKR(p.revenue)}
      </div>
    </div>
  );
}

function RevenueChart({
  data,
  loading,
  error,
  onRetry,
  rangeLabel,
}: {
  data?: {
    trend: Array<{ date: string; revenue: number }>;
    totalRevenue: number;
    revenueGrowth: number | null;
  };
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
  rangeLabel: string;
}) {
  const trend: TrendPoint[] = React.useMemo(
    () =>
      (data?.trend ?? []).map((t) => ({
        date: t.date,
        revenue: t.revenue,
        label: new Date(t.date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
      })),
    [data?.trend],
  );
  const hasData = trend.some((t) => t.revenue > 0);
  const growth = data?.revenueGrowth ?? null;

  return (
    <ChartCard
      exportName="revenue"
      title={
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {loading ? (
            <Skeleton className="h-8 w-40 rounded-md" />
          ) : (
            <span className="font-display text-2xl font-black tracking-tight tabular-nums sm:text-3xl">
              {formatPKR(data?.totalRevenue ?? 0)}
            </span>
          )}
          {growth != null && Number.isFinite(growth) && !loading && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                growth >= 0
                  ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive ring-destructive/20",
              )}
            >
              {growth >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {growth >= 0 ? "+" : ""}
              {growth.toFixed(1)}%
            </span>
          )}
        </div>
      }
      subtitle={`Revenue · ${rangeLabel}`}
      headerRight={
        <span className="hidden items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-inset ring-border sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Daily
        </span>
      }
    >
      {error ? (
        <div className="p-4">
          <InlineError message={errMsg(error)} onRetry={onRetry} />
        </div>
      ) : loading ? (
        <div className="px-3 pb-2">
          <Skeleton className="h-[220px] w-full rounded-xl" />
        </div>
      ) : !hasData ? (
        <EmptyRow
          icon={Activity}
          title="No revenue in this range"
          hint="Pick a different date range or wait for orders to come in."
        />
      ) : (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
                strokeOpacity={0.6}
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                dy={6}
                minTickGap={16}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={44}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) =>
                  v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                }
              />
              <Tooltip
                cursor={{ stroke: "var(--primary)", strokeOpacity: 0.25, strokeWidth: 1 }}
                content={<RevenueTooltip />}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#revenueFill)"
                activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }}
                animationDuration={700}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

// -----------------------------------------------------------------------------
// Order status overview
// -----------------------------------------------------------------------------

function OrderStatusOverview() {
  const q = useOrderStatsQuery();

  const body = () => {
    if (q.isError) return <InlineError message={errMsg(q.error)} onRetry={() => q.refetch()} />;
    if (q.isLoading || !q.data) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-2.5 w-full rounded-full" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full rounded" />
            ))}
          </div>
        </div>
      );
    }
    const d = q.data;
    const items: Array<{ label: string; value: number; tone: Tone }> = [
      { label: "Pending", value: d.pending, tone: "warning" },
      { label: "In kitchen", value: d.preparing + d.confirmed, tone: "info" },
      { label: "Out for delivery", value: d.out_for_delivery, tone: "primary" },
      { label: "Delivered", value: d.delivered, tone: "success" },
      { label: "Cancelled", value: d.cancelled, tone: "destructive" },
    ];
    const total = items.reduce((a, s) => a + s.value, 0);
    return (
      <>
        <div className="font-display text-3xl font-black tabular-nums">{total}</div>
        <div className="text-xs text-muted-foreground">Active + completed today</div>
        {total > 0 ? (
          <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border/60">
            {items.map((s) => (
              <div
                key={s.label}
                className={cn("h-full transition-[width] duration-500", TONE_DOT[s.tone])}
                style={{ width: `${(s.value / total) * 100}%` }}
                title={`${s.label}: ${s.value}`}
              />
            ))}
          </div>
        ) : (
          <div className="mt-5 h-2.5 rounded-full bg-muted" />
        )}
        <ul className="mt-5 space-y-2.5">
          {items.map((s) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
            return (
              <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[s.tone])} />
                  <span className="truncate text-foreground/80">{s.label}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {pct}%
                  </span>
                  <span className="w-8 text-right font-semibold tabular-nums">{s.value}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </>
    );
  };

  return (
    <Surface className="h-full">
      <SectionHeader title="Order status" subtitle="Live breakdown" icon={Package} />
      <div className="p-5 sm:p-6">{body()}</div>
    </Surface>
  );
}

// -----------------------------------------------------------------------------
// Recent orders
// -----------------------------------------------------------------------------

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400",
  confirmed: "bg-sky-500/10 text-sky-600 ring-1 ring-inset ring-sky-500/20 dark:text-sky-400",
  preparing: "bg-sky-500/10 text-sky-600 ring-1 ring-inset ring-sky-500/20 dark:text-sky-400",
  ready: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
  out_for_delivery: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
  delivered:
    "bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400",
  cancelled: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
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

function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function RecentOrders() {
  const fetchList = useServerFn(adminListOrders);
  const q = useQuery({
    queryKey: ["admin", "dashboard-recent-orders"],
    queryFn: () => fetchList({ data: { limit: 6 } }) as Promise<AdminOrderRow[]>,
    refetchInterval: 30_000,
    retry: 1,
  });

  return (
    <Surface className="flex h-full flex-col">
      <SectionHeader
        title="Recent Orders"
        subtitle="Latest activity across the kitchen"
        icon={ShoppingBag}
        action={
          <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg text-xs">
            <Link to="/admin/orders">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      />
      {q.isError ? (
        <div className="p-5">
          <InlineError message={errMsg(q.error)} onRetry={() => q.refetch()} />
        </div>
      ) : q.isLoading ? (
        <ul className="divide-y divide-border/60">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </li>
          ))}
        </ul>
      ) : (q.data ?? []).length === 0 ? (
        <EmptyRow
          icon={ShoppingBag}
          title="No orders yet"
          hint="New orders will appear here the moment they're placed."
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {(q.data ?? []).map((o) => (
            <li
              key={o.id}
              className="group/row flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 sm:px-6"
            >
              <Avatar className="h-9 w-9 shrink-0 ring-1 ring-inset ring-border">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-[11px] font-bold">
                  {initialsOf(o.customer_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-semibold">
                    {o.customer_name ?? "Guest"}
                  </span>
                  <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
                    {o.order_number}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {o.items_count} item{o.items_count === 1 ? "" : "s"}
                  </span>
                  <span className="text-border">•</span>
                  <span className="tabular-nums">{relTime(o.created_at)}</span>
                </div>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <div className="font-semibold tabular-nums">{formatPKR(o.total_pkr)}</div>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  "shrink-0 rounded-full border-0 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider",
                  STATUS_STYLE[o.status] ?? "bg-muted text-foreground",
                )}
              >
                {STATUS_LABEL[o.status] ?? o.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}

// -----------------------------------------------------------------------------
// Latest customers (permission-gated + resilient)
// -----------------------------------------------------------------------------

function LatestCustomersCard({ canView }: { canView: boolean }) {
  const qc = useQueryClient();
  const fetchList = useServerFn(adminListCustomers);
  const q = useQuery({
    queryKey: ["admin", "customers", "recent"],
    queryFn: () => fetchList({ data: undefined }) as Promise<AdminCustomerRow[]>,
    enabled: canView,
    staleTime: 60_000,
    retry: 1,
  });

  React.useEffect(() => {
    if (!canView) return;
    const channel = supabase
      .channel("admin-dashboard-customers-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => qc.invalidateQueries({ queryKey: ["admin", "customers", "recent"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, canView]);

  const rows = React.useMemo(
    () =>
      (q.data ?? [])
        .slice()
        .sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 6),
    [q.data],
  );

  return (
    <Surface className="flex h-full flex-col">
      <SectionHeader
        title="Latest Customers"
        subtitle="New sign-ups"
        icon={Users}
        action={
          canView ? (
            <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg text-xs">
              <Link to="/admin/customers">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : undefined
        }
      />
      {!canView ? (
        <EmptyRow
          icon={Lock}
          title="Not available for your role"
          hint="Customer records are restricted. Ask an owner to grant Customers access."
        />
      ) : q.isError ? (
        <div className="p-5">
          <InlineError message={errMsg(q.error)} onRetry={() => q.refetch()} />
        </div>
      ) : q.isLoading ? (
        <ul className="divide-y divide-border/60">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-3 w-40 rounded" />
              </div>
              <Skeleton className="h-4 w-10 rounded" />
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <EmptyRow icon={Users} title="No customers yet" hint="Sign-ups will appear here." />
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((c) => {
            const name = c.full_name ?? "Unnamed";
            return (
              <li
                key={c.id}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 sm:px-6"
              >
                <Avatar className="h-9 w-9 shrink-0 ring-1 ring-inset ring-border">
                  {c.avatar_url && <AvatarImage src={c.avatar_url} alt={name} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-[11px] font-bold">
                    {initialsOf(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.email ?? c.phone ?? "No contact"}
                  </div>
                </div>
                <div className="shrink-0 text-right">
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
    </Surface>
  );
}

// -----------------------------------------------------------------------------
// Top selling items
// -----------------------------------------------------------------------------

function TopSellingItems({
  items,
  loading,
  error,
  onRetry,
  rangeLabel,
}: {
  items?: Array<{ name: string; qty: number; revenue: number }>;
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
  rangeLabel: string;
}) {
  const list = (items ?? []).slice(0, 5);
  const max = list.length ? Math.max(...list.map((i) => i.qty), 1) : 1;
  return (
    <Surface className="flex h-full flex-col">
      <SectionHeader
        title="Top Selling Items"
        subtitle={rangeLabel}
        icon={Flame}
        action={
          <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg text-xs">
            <Link to="/admin/reports">
              Reports <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      />
      {error ? (
        <div className="p-5">
          <InlineError message={errMsg(error)} onRetry={onRetry} />
        </div>
      ) : loading ? (
        <ul className="space-y-4 p-5 sm:p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-40 rounded" />
                <Skeleton className="h-3.5 w-16 rounded" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </li>
          ))}
        </ul>
      ) : list.length === 0 ? (
        <EmptyRow
          icon={Flame}
          title="No item sales this week"
          hint="Once items sell, the top movers land here."
        />
      ) : (
        <ol className="space-y-4 p-5 sm:p-6">
          {list.map((item, idx) => (
            <li key={item.name}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-black text-muted-foreground ring-1 ring-inset ring-border">
                    {idx + 1}
                  </span>
                  <span className="truncate font-semibold">{item.name}</span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  <span className="tabular-nums">{item.qty}</span> sold ·{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatPKR(item.revenue)}
                  </span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-[width] duration-700 ease-out"
                  style={{ width: `${(item.qty / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Surface>
  );
}

// -----------------------------------------------------------------------------
// Quick actions
// -----------------------------------------------------------------------------

const ACTIONS: Array<{ label: string; icon: LucideIcon; tone: Tone; to: string; desc: string }> = [
  { label: "Add menu item", desc: "Create a new dish", icon: Plus, tone: "primary", to: "/admin/menu" },
  { label: "Create coupon", desc: "Discount codes", icon: Ticket, tone: "info", to: "/admin/coupons" },
  { label: "Promo banner", desc: "Homepage hero", icon: Sparkles, tone: "warning", to: "/admin/promo-banners" },
  { label: "Dispatch order", desc: "Send to rider", icon: Truck, tone: "success", to: "/admin/orders" },
  { label: "Mark ready", desc: "Kitchen queue", icon: CheckCircle2, tone: "primary", to: "/admin/orders" },
  { label: "Manage staff", desc: "Roles & access", icon: Users, tone: "neutral", to: "/admin/staff" },
];

function QuickActions() {
  return (
    <Surface className="flex h-full flex-col">
      <SectionHeader title="Quick Actions" subtitle="Common shortcuts" icon={Sparkles} />
      <div className="grid grid-cols-2 gap-2.5 p-5 sm:p-6">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.label}
              to={a.to}
              className="group/qa flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background hover:shadow-[0_6px_20px_-10px_hsl(var(--primary)/0.35)]"
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                  TONE_CHIP[a.tone],
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold leading-tight">{a.label}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{a.desc}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </Surface>
  );
}

// -----------------------------------------------------------------------------
// Page composition
// -----------------------------------------------------------------------------

export function AdminDashboardContent() {
  return (
    <DateRangeProvider>
      <DashboardInner />
    </DateRangeProvider>
  );
}

function DashboardInner() {
  const weekly = useWeeklyReport();
  const myRoles = useMyRoles();
  const canViewCustomers = hasPermission(myRoles.data, "customers.view");
  const { range } = useDateRange();

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

  const rangeLabel =
    range.preset === "custom"
      ? `${range.from.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} – ${range.to.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
      : PRESET_LABEL[range.preset];

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        eyebrow={
          <>
            <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live · {rangeLabel}
          </>
        }
        title="Dashboard"
        description="A real-time overview of your restaurant performance."
        actions={
          <>
            <DateRangePicker />
            <Button asChild variant="outline" size="sm" className="h-9 rounded-lg">
              <Link to="/admin/reports">
                Reports <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 rounded-lg">
              <Link to="/admin/orders">
                Open orders <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </>
        }
      />

      <LiveKpiGrid />

      <PromoKpiGrid />

      <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          <RevenueChart
            data={chartData}
            loading={weekly.isLoading}
            error={weekly.isError ? weekly.error : undefined}
            onRetry={() => weekly.refetch()}
            rangeLabel={rangeLabel}
          />
        </div>
        <OrderStatusOverview />
      </div>

      <div className="grid gap-5 xl:grid-cols-3 xl:gap-6">
        <div className="xl:col-span-2">
          <RecentOrders />
        </div>
        <LatestCustomersCard canView={canViewCustomers} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          <TopSellingItems
            items={topItems}
            loading={weekly.isLoading}
            error={weekly.isError ? weekly.error : undefined}
            onRetry={() => weekly.refetch()}
            rangeLabel={rangeLabel}
          />
        </div>
        <QuickActions />
      </div>
    </div>
  );
}

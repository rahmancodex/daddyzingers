/**
 * Executive Business Intelligence extension for the Admin Dashboard.
 *
 * This module extends the existing dashboard with executive KPIs, comparisons,
 * insights, product / branch / customer analytics, heatmaps, a naive moving-
 * average forecast, and export helpers.  It reuses `adminReports` for every
 * data slice — React Query dedupes across the dashboard by `queryKey`.
 */
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
} from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  FileText,
  Lightbulb,
  Printer,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { adminReports, type ReportsData } from "@/lib/admin-reports.functions";
import { formatPKR } from "@/lib/admin-orders";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChartCard } from "@/components/admin/ui/chart-card";

// ---------------------------------------------------------------------------
// Data hooks
// ---------------------------------------------------------------------------

type Period = {
  key: string;
  label: string;
  from: Date;
  to: Date;
};

function usePeriods(): {
  today: Period;
  yesterday: Period;
  thisWeek: Period;
  lastWeek: Period;
  thisMonth: Period;
  lastMonth: Period;
} {
  return React.useMemo(() => {
    const now = new Date();
    const today = { key: "today", label: "Today", from: startOfDay(now), to: endOfDay(now) };
    const y = subDays(now, 1);
    const yesterday = {
      key: "yesterday",
      label: "Yesterday",
      from: startOfDay(y),
      to: endOfDay(y),
    };
    const tw = {
      key: "thisWeek",
      label: "This week",
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfDay(now),
    };
    const lwStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lwEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeek = { key: "lastWeek", label: "Last week", from: lwStart, to: lwEnd };
    const tm = { key: "thisMonth", label: "This month", from: startOfMonth(now), to: endOfDay(now) };
    const lmStart = startOfMonth(subMonths(now, 1));
    const lmEnd = endOfMonth(subMonths(now, 1));
    const lastMonth = { key: "lastMonth", label: "Last month", from: lmStart, to: lmEnd };
    return { today, yesterday, thisWeek: tw, lastWeek, thisMonth: tm, lastMonth };
  }, []);
}

function usePeriodReport(p: Period) {
  const fetchReport = useServerFn(adminReports);
  const from = p.from.toISOString();
  const to = p.to.toISOString();
  return useQuery<ReportsData>({
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

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function pct(v: number | null | undefined) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(1)}%`;
}

function DeltaPill({ value }: { value: number | null }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        up
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-destructive/10 text-destructive",
      )}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {pct(value)}
    </span>
  );
}

function Kpi({
  label,
  value,
  hint,
  loading,
  delta,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  loading?: boolean;
  delta?: number | null;
}) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-card p-4"
      role="group"
      aria-label={label}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {delta !== undefined ? <DeltaPill value={delta ?? null} /> : null}
      </div>
      {loading ? (
        <Skeleton className="h-6 w-24" />
      ) : (
        <div className="text-xl font-semibold tabular-nums text-foreground">{value}</div>
      )}
      {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function growth(current: number, previous: number): number | null {
  if (!previous || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

// ---------------------------------------------------------------------------
// Lazy render helper — defers heavy charts until in-viewport
// ---------------------------------------------------------------------------
function LazyBelowFold({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);
  return (
    <div ref={ref}>
      {visible ? (
        children
      ) : (
        <div className="h-64 rounded-2xl border border-dashed border-border/60 bg-muted/20" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Executive KPI grid
// ---------------------------------------------------------------------------

function ExecutiveKpis({
  periods,
  today,
  yesterday,
  thisWeek,
  lastWeek,
  thisMonth,
  lastMonth,
  loading,
}: {
  periods: ReturnType<typeof usePeriods>;
  today?: ReportsData;
  yesterday?: ReportsData;
  thisWeek?: ReportsData;
  lastWeek?: ReportsData;
  thisMonth?: ReportsData;
  lastMonth?: ReportsData;
  loading: boolean;
}) {
  const revToday = today?.revenue.total ?? 0;
  const revYest = yesterday?.revenue.total ?? 0;
  const revWeek = thisWeek?.revenue.total ?? 0;
  const revLastWeek = lastWeek?.revenue.total ?? 0;
  const revMonth = thisMonth?.revenue.total ?? 0;
  const revLastMonth = lastMonth?.revenue.total ?? 0;

  const monthOrders = thisMonth?.orders.total ?? 0;
  const monthDays = Math.max(
    1,
    Math.round(
      (periods.thisMonth.to.getTime() - periods.thisMonth.from.getTime()) / (24 * 3600 * 1000),
    ),
  );
  const avgDailyOrders = monthOrders ? Math.round(monthOrders / monthDays) : 0;
  const aov = thisMonth?.revenue.aov ?? 0;
  const repeatRate = thisMonth?.customers.repeatRate ?? 0;

  const newC = thisMonth?.customers.new ?? 0;
  const newCLast = lastMonth?.customers.new ?? 0;
  const custGrowth = growth(newC, newCLast);

  const cancelledPct = thisMonth?.orders.cancellationRate ?? 0;
  // No "refunded" status in schema — always 0, rendered as N/A.
  const refundPct = null;

  const grossMonth = thisMonth?.revenue.total ?? 0;
  const netMonth = thisMonth?.revenue.net ?? 0;

  return (
    <section aria-label="Executive KPIs" className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Executive KPIs
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi
          label="Revenue today"
          value={formatPKR(revToday)}
          loading={loading}
          delta={growth(revToday, revYest)}
          hint="vs yesterday"
        />
        <Kpi
          label="Revenue this week"
          value={formatPKR(revWeek)}
          loading={loading}
          delta={growth(revWeek, revLastWeek)}
          hint="vs last week"
        />
        <Kpi
          label="Revenue this month"
          value={formatPKR(revMonth)}
          loading={loading}
          delta={growth(revMonth, revLastMonth)}
          hint="vs last month"
        />
        <Kpi label="Average order value" value={formatPKR(aov)} loading={loading} hint="This month" />
        <Kpi
          label="Avg daily orders"
          value={avgDailyOrders.toLocaleString()}
          loading={loading}
          hint="This month"
        />
        <Kpi
          label="Repeat customer %"
          value={`${repeatRate.toFixed(1)}%`}
          loading={loading}
          hint="This month"
        />
        <Kpi
          label="Customer growth"
          value={pct(custGrowth)}
          loading={loading}
          hint="New vs last month"
        />
        <Kpi
          label="Cancelled %"
          value={`${cancelledPct.toFixed(1)}%`}
          loading={loading}
          hint="This month"
        />
        <Kpi label="Refund %" value={refundPct === null ? "N/A" : `${refundPct}%`} loading={loading} />
        <Kpi label="Gross revenue" value={formatPKR(grossMonth)} loading={loading} hint="This month" />
        <Kpi
          label="Net revenue"
          value={formatPKR(netMonth)}
          loading={loading}
          hint="Excl. tax & delivery"
        />
        <Kpi
          label="Total orders"
          value={monthOrders.toLocaleString()}
          loading={loading}
          hint="This month"
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

function InsightCard({ tone, text }: { tone: "up" | "down" | "info"; text: string }) {
  const toneClass =
    tone === "up"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "down"
        ? "border-destructive/30 bg-destructive/5"
        : "border-primary/30 bg-primary/5";
  const Icon = tone === "up" ? ArrowUpRight : tone === "down" ? ArrowDownRight : Sparkles;
  return (
    <div className={cn("flex items-start gap-2 rounded-xl border p-3 text-sm", toneClass)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{text}</span>
    </div>
  );
}

function useInsights(
  today?: ReportsData,
  yesterday?: ReportsData,
  thisWeek?: ReportsData,
  lastWeek?: ReportsData,
  thisMonth?: ReportsData,
): Array<{ tone: "up" | "down" | "info"; text: string }> {
  return React.useMemo(() => {
    const out: Array<{ tone: "up" | "down" | "info"; text: string }> = [];
    if (today && yesterday) {
      const g = growth(today.revenue.total, yesterday.revenue.total);
      if (g !== null && Math.abs(g) >= 1) {
        out.push({
          tone: g >= 0 ? "up" : "down",
          text: `Revenue ${g >= 0 ? "increased" : "decreased"} ${Math.abs(g).toFixed(1)}% vs yesterday.`,
        });
      }
    }
    if (thisWeek && lastWeek) {
      const gp = growth(
        thisWeek.orders.pickupCount,
        lastWeek.orders.pickupCount,
      );
      if (gp !== null && gp >= 5) {
        out.push({ tone: "up", text: `Pickup orders are growing ${gp.toFixed(0)}% week-over-week.` });
      } else if (gp !== null && gp <= -5) {
        out.push({ tone: "down", text: `Pickup orders dropped ${Math.abs(gp).toFixed(0)}% week-over-week.` });
      }
    }
    if (thisMonth) {
      const bh = thisMonth.peak?.bestRevenueHour;
      if (typeof bh === "number") {
        const label = bh >= 11 && bh <= 15 ? "Lunch hours" : bh >= 18 && bh <= 22 ? "Dinner hours" : `Hour ${bh}:00`;
        out.push({
          tone: "info",
          text: `${label} generate the highest revenue this month.`,
        });
      }
      const branches = thisMonth.branches ?? [];
      const withAov = branches.filter((b) => b.orders > 0);
      if (withAov.length > 1) {
        const best = withAov.reduce((a, b) => (b.aov > a.aov ? b : a));
        out.push({ tone: "info", text: `${best.name} has the highest AOV (${formatPKR(best.aov)}).` });
      }
    }
    if (today && yesterday) {
      const c = today.orders.cancelled - yesterday.orders.cancelled;
      if (c > 0) {
        out.push({ tone: "down", text: `Cancelled orders increased by ${c} vs yesterday.` });
      }
    }
    if (thisMonth) {
      const top = thisMonth.products?.best?.[0];
      if (top) {
        out.push({ tone: "info", text: `Top selling item this month: ${top.name} (${top.qty} sold).` });
      }
      const rr = thisMonth.customers?.repeatRate ?? 0;
      if (rr >= 30) {
        out.push({ tone: "up", text: `Strong loyalty — ${rr.toFixed(0)}% of customers ordered more than once.` });
      }
    }
    return out;
  }, [today, yesterday, thisWeek, lastWeek, thisMonth]);
}

function InsightsSection({
  insights,
  loading,
}: {
  insights: ReturnType<typeof useInsights>;
  loading: boolean;
}) {
  return (
    <section aria-label="Business insights" className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Business insights
        </h2>
      </div>
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Not enough activity to generate insights yet.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((i, idx) => (
            <InsightCard key={idx} tone={i.tone} text={i.text} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Comparison chart
// ---------------------------------------------------------------------------

function ComparisonChart({
  title,
  current,
  previous,
  currentLabel,
  previousLabel,
}: {
  title: string;
  current: number;
  previous: number;
  currentLabel: string;
  previousLabel: string;
}) {
  const data = [
    { name: previousLabel, value: previous },
    { name: currentLabel, value: current },
  ];
  return (
    <ChartCard title={title} exportName={title.toLowerCase().replace(/\s+/g, "-")}>
      <div className="h-40 w-full" aria-label={`${title} comparison chart`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => formatPKR(v)}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((_, idx) => (
                <Cell
                  key={idx}
                  fill={idx === 0 ? "hsl(var(--muted-foreground) / 0.55)" : "hsl(var(--primary))"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>
          {previousLabel}: <strong className="text-foreground">{formatPKR(previous)}</strong>
        </span>
        <DeltaPill value={growth(current, previous)} />
      </div>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// Product / Branch / Customer analytics tables
// ---------------------------------------------------------------------------

function List({
  title,
  rows,
  empty = "No data.",
}: {
  title: string;
  rows: Array<{ name: string; value: string | number }>;
  empty?: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border/70 bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1.5" role="list">
          {rows.slice(0, 8).map((r, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="min-w-0 flex-1 truncate text-foreground">{r.name}</span>
              <span className="tabular-nums text-muted-foreground">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductAnalytics({ report }: { report?: ReportsData }) {
  const best = report?.products.best ?? [];
  const worst = report?.products.worst ?? [];
  const topRev = report?.products.topRevenue ?? [];
  const never = report?.products.neverOrdered ?? [];
  const cancelled = report?.products.mostCancelled ?? [];
  return (
    <section aria-label="Product analytics" className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Product analytics
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <List
          title="Top selling"
          rows={best.map((p) => ({ name: p.name, value: `${p.qty} sold` }))}
        />
        <List
          title="Lowest selling"
          rows={worst.map((p) => ({ name: p.name, value: `${p.qty} sold` }))}
        />
        <List
          title="Highest revenue"
          rows={topRev.map((p) => ({ name: p.name, value: formatPKR(p.revenue) }))}
        />
        <List
          title="Never ordered (in range)"
          rows={never.map((p) => ({ name: p.name, value: "0" }))}
          empty="Every menu item was ordered."
        />
        <List
          title="Most cancelled"
          rows={cancelled.map((p) => ({ name: p.name, value: `${p.qty} cancelled` }))}
          empty="No cancelled items."
        />
      </div>
    </section>
  );
}

function BranchAnalytics({ report }: { report?: ReportsData }) {
  const rows = report?.branches ?? [];
  return (
    <section aria-label="Branch analytics" className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Branch analytics
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">Per-branch revenue, orders, AOV, delivery and pickup share</caption>
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2 text-left">Branch</th>
              <th scope="col" className="px-4 py-2 text-right">Revenue</th>
              <th scope="col" className="px-4 py-2 text-right">Orders</th>
              <th scope="col" className="px-4 py-2 text-right">AOV</th>
              <th scope="col" className="px-4 py-2 text-right">Delivery %</th>
              <th scope="col" className="px-4 py-2 text-right">Pickup %</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No branch activity in range.
                </td>
              </tr>
            ) : (
              rows.map((b) => (
                <tr key={b.id} className="border-t border-border/60">
                  <th scope="row" className="px-4 py-2 text-left font-medium text-foreground">
                    {b.name}
                    {b.city ? (
                      <span className="ml-1 text-xs text-muted-foreground">· {b.city}</span>
                    ) : null}
                  </th>
                  <td className="px-4 py-2 text-right tabular-nums">{formatPKR(b.revenue)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{b.orders}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatPKR(b.aov)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{b.deliveryPct.toFixed(0)}%</td>
                  <td className="px-4 py-2 text-right tabular-nums">{b.pickupPct.toFixed(0)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CustomerAnalytics({ report }: { report?: ReportsData }) {
  const c = report?.customers;
  const totalRevenue = report?.revenue.total ?? 0;
  const uniq = c?.unique ?? 0;
  const ltv = uniq ? Math.round(totalRevenue / uniq) : 0;
  const vip = (c?.top ?? []).filter((t) => t.orders >= 3).length;

  return (
    <section aria-label="Customer analytics" className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Customer analytics
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="New" value={(c?.new ?? 0).toLocaleString()} />
        <Kpi label="Returning" value={(c?.returning ?? 0).toLocaleString()} />
        <Kpi label="VIP (3+ orders)" value={vip.toLocaleString()} />
        <Kpi label="Average spend" value={formatPKR(c?.avgSpend ?? 0)} />
        <Kpi label="Customer LTV" value={formatPKR(ltv)} hint="Range revenue / unique" />
        <Kpi label="Repeat rate" value={`${(c?.repeatRate ?? 0).toFixed(1)}%`} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Heatmap
// ---------------------------------------------------------------------------

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Heatmaps({ report }: { report?: ReportsData }) {
  const heat = report?.peak.heatmap ?? [];
  const hourly = report?.peak.hourly ?? [];
  const dow = report?.peak.dow ?? [];
  const max = Math.max(1, ...heat.flat());

  return (
    <section aria-label="Heatmaps" className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Heatmaps
      </h2>
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Orders by hour × weekday" exportName="orders-heatmap">
          <div className="overflow-x-auto" role="img" aria-label="Orders by hour and weekday heatmap">
            <table className="w-full min-w-[520px] text-[10px]">
              <thead>
                <tr>
                  <th scope="col" className="w-10" />
                  {Array.from({ length: 24 }).map((_, h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-0.5 py-1 text-center font-normal text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAY_NAMES.map((day, d) => (
                  <tr key={day}>
                    <th scope="row" className="pr-2 text-right font-medium text-muted-foreground">
                      {day}
                    </th>
                    {Array.from({ length: 24 }).map((_, h) => {
                      const v = heat[d]?.[h] ?? 0;
                      const opacity = v === 0 ? 0.05 : 0.15 + (v / max) * 0.85;
                      return (
                        <td key={h} className="p-0.5">
                          <div
                            className="h-5 w-full rounded-sm"
                            style={{ background: `hsl(var(--primary) / ${opacity})` }}
                            title={`${day} ${h}:00 — ${v} orders`}
                            aria-label={`${day} ${h}:00, ${v} orders`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Orders by hour" exportName="orders-by-hour">
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Revenue by weekday" exportName="revenue-by-weekday">
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dow}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatPKR(v)}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Forecast (simple moving average from last-30-days trend)
// ---------------------------------------------------------------------------

function Forecast({ month }: { month?: ReportsData }) {
  const trend = month?.trend ?? [];
  const last7 = trend.slice(-7);
  const revAvg = last7.length
    ? Math.round(last7.reduce((s, t) => s + t.revenue, 0) / last7.length)
    : 0;
  const ordAvg = last7.length
    ? Math.round(last7.reduce((s, t) => s + t.orders, 0) / last7.length)
    : 0;
  const confidence =
    last7.length >= 7 ? "High" : last7.length >= 3 ? "Medium" : "Low";
  const confTone =
    confidence === "High" ? "success" : confidence === "Medium" ? "warning" : "destructive";

  return (
    <section aria-label="Forecast" className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Today's forecast
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Forecast revenue" value={formatPKR(revAvg)} hint="7-day moving average" />
        <Kpi label="Forecast orders" value={ordAvg.toLocaleString()} hint="7-day moving average" />
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Confidence
          </span>
          <Badge
            variant={confTone === "success" ? "default" : "secondary"}
            className={cn(
              "mt-2 w-fit",
              confTone === "success" && "bg-emerald-500/15 text-emerald-600",
              confTone === "warning" && "bg-amber-500/15 text-amber-600",
              confTone === "destructive" && "bg-destructive/10 text-destructive",
            )}
          >
            {confidence}
          </Badge>
          <p className="mt-2 text-xs text-muted-foreground">
            Based on {last7.length} recent day{last7.length === 1 ? "" : "s"} of history.
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Export toolbar
// ---------------------------------------------------------------------------

function toCSV(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\n");
}

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ExportBar({ month }: { month?: ReportsData }) {
  const onCsv = React.useCallback(() => {
    if (!month) return;
    const rows = (month.trend ?? []).map((t) => ({
      date: t.date,
      revenue: t.revenue,
      orders: t.orders,
      discount: t.discount,
    }));
    download(`dashboard-${month.range.from.slice(0, 10)}.csv`, toCSV(rows), "text/csv");
  }, [month]);

  const onPdf = React.useCallback(() => {
    // Reuse the browser's built-in "Save as PDF" via print dialog.
    window.print();
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={onCsv}
        className="h-8 rounded-lg"
        aria-label="Export dashboard data as CSV"
      >
        <Download className="h-3.5 w-3.5" /> CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onPdf}
        className="h-8 rounded-lg"
        aria-label="Export dashboard as PDF"
      >
        <FileText className="h-3.5 w-3.5" /> PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.print()}
        className="h-8 rounded-lg"
        aria-label="Print dashboard"
      >
        <Printer className="h-3.5 w-3.5" /> Print
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function ExecutiveBI() {
  const periods = usePeriods();
  const today = usePeriodReport(periods.today);
  const yesterday = usePeriodReport(periods.yesterday);
  const thisWeek = usePeriodReport(periods.thisWeek);
  const lastWeek = usePeriodReport(periods.lastWeek);
  const thisMonth = usePeriodReport(periods.thisMonth);
  const lastMonth = usePeriodReport(periods.lastMonth);

  const loading =
    today.isLoading ||
    yesterday.isLoading ||
    thisWeek.isLoading ||
    lastWeek.isLoading ||
    thisMonth.isLoading ||
    lastMonth.isLoading;

  const insights = useInsights(
    today.data,
    yesterday.data,
    thisWeek.data,
    lastWeek.data,
    thisMonth.data,
  );

  return (
    <div className="space-y-6" data-testid="executive-bi">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </span>
          <h2 className="text-base font-semibold text-foreground">Executive intelligence</h2>
        </div>
        <ExportBar month={thisMonth.data} />
      </div>

      <ExecutiveKpis
        periods={periods}
        today={today.data}
        yesterday={yesterday.data}
        thisWeek={thisWeek.data}
        lastWeek={lastWeek.data}
        thisMonth={thisMonth.data}
        lastMonth={lastMonth.data}
        loading={loading}
      />

      <InsightsSection insights={insights} loading={loading} />

      <section aria-label="Revenue comparisons" className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Revenue comparison
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <ComparisonChart
            title="Today vs yesterday"
            current={today.data?.revenue.total ?? 0}
            previous={yesterday.data?.revenue.total ?? 0}
            currentLabel="Today"
            previousLabel="Yesterday"
          />
          <ComparisonChart
            title="This week vs last week"
            current={thisWeek.data?.revenue.total ?? 0}
            previous={lastWeek.data?.revenue.total ?? 0}
            currentLabel="This week"
            previousLabel="Last week"
          />
          <ComparisonChart
            title="This month vs last month"
            current={thisMonth.data?.revenue.total ?? 0}
            previous={lastMonth.data?.revenue.total ?? 0}
            currentLabel="This month"
            previousLabel="Last month"
          />
        </div>
      </section>

      <ProductAnalytics report={thisMonth.data} />

      <BranchAnalytics report={thisMonth.data} />

      <CustomerAnalytics report={thisMonth.data} />

      <LazyBelowFold>
        <Heatmaps report={thisMonth.data} />
      </LazyBelowFold>

      <LazyBelowFold>
        <Forecast month={thisMonth.data} />
      </LazyBelowFold>
    </div>
  );
}

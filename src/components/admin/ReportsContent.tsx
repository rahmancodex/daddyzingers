import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import {
  BarChart3,
  Calendar as CalendarIcon,
  Crown,
  Download,
  FileSpreadsheet,
  FileText,
  Flame,
  Loader2,
  MapPin,
  Printer,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Tag,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

import { adminReports, type ReportsData } from "@/lib/admin-reports.functions";

const CHART_COLORS = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#ec4899"];

// -----------------------------
// Date range helpers
// -----------------------------

type PresetKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "month"
  | "lastMonth"
  | "year"
  | "custom";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "month", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom" },
];

function presetRange(key: PresetKey): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  switch (key) {
    case "today":
      return { from, to };
    case "yesterday": {
      const y = new Date(from);
      y.setDate(y.getDate() - 1);
      const yTo = new Date(y);
      yTo.setHours(23, 59, 59, 999);
      return { from: y, to: yTo };
    }
    case "7d": {
      const f = new Date(from);
      f.setDate(f.getDate() - 6);
      return { from: f, to };
    }
    case "30d": {
      const f = new Date(from);
      f.setDate(f.getDate() - 29);
      return { from: f, to };
    }
    case "month": {
      const f = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { from: f, to };
    }
    case "lastMonth": {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const t = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from: f, to: t };
    }
    case "year": {
      const f = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      return { from: f, to };
    }
    default:
      return { from, to };
  }
}


const fmtDate = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const fmtPKR = (n: number) =>
  `Rs ${Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const fmtPct = (n: number | null | undefined, digits = 1) =>
  n == null ? "—" : `${n >= 0 ? "" : ""}${n.toFixed(digits)}%`;

// -----------------------------
// Root
// -----------------------------

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export function ReportsContent() {
  const [preset, setPreset] = React.useState<PresetKey>("7d");
  const [range, setRange] = React.useState<{ from: Date; to: Date }>(presetRange("7d"));
  const [branchId, setBranchId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [couponCode, setCouponCode] = React.useState<string | null>(null);

  const setPresetAndRange = (key: PresetKey) => {
    setPreset(key);
    if (key !== "custom") setRange(presetRange(key));
  };

  const reportsFn = useServerFn(adminReports);
  const qc = useQueryClient();

  const filters = React.useMemo(
    () => ({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      branchId,
      status,
      categoryId,
      userId: null,
      couponCode,
    }),
    [range.from, range.to, branchId, status, categoryId, couponCode],
  );

  const queryKey = ["admin", "reports", filters];
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => reportsFn({ data: filters }),
    staleTime: 30_000,
  });

  // Realtime — invalidate on new orders
  React.useEffect(() => {
    const channel = supabase
      .channel("admin-reports-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => qc.invalidateQueries({ queryKey: ["admin", "reports"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 print:max-w-none">
      <div className="sticky top-0 z-30 -mx-4 border-b border-border/60 bg-background/85 px-4 pb-4 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/70 print:static print:border-0 print:bg-transparent print:p-0 sm:-mx-6 sm:px-6">
        <ReportsHeader
          preset={preset}
          onPreset={setPresetAndRange}
          range={range}
          onRange={(r) => {
            setPreset("custom");
            setRange(r);
          }}
          branchId={branchId}
          setBranchId={setBranchId}
          status={status}
          setStatus={setStatus}
          categoryId={categoryId}
          setCategoryId={setCategoryId}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          data={data}
          isFetching={isFetching}
          onRefresh={() => refetch()}
        />
      </div>

      {isLoading ? (
        <ReportsSkeleton />
      ) : error ? (
        <ReportsError onRetry={() => refetch()} />
      ) : data ? (
        <ReportsBody data={data} />
      ) : (
        <ReportsEmpty />
      )}
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

function ReportsError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="rounded-2xl border-destructive/40">
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-base font-bold">Report unavailable</div>
          <p className="mt-1 text-xs text-muted-foreground">
            We couldn&apos;t load analytics right now. Please try again in a moment.
          </p>
        </div>
        <Button size="sm" onClick={onRetry} className="mt-1">
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Retry
        </Button>
      </CardContent>
    </Card>
  );
}

function ReportsEmpty() {
  return (
    <Card className="rounded-2xl border-dashed">
      <CardContent className="p-8 text-center text-sm text-muted-foreground">
        No data for the selected filters.
      </CardContent>
    </Card>
  );
}


// -----------------------------
// Header (filters + exports)
// -----------------------------

function ReportsHeader({
  preset,
  onPreset,
  range,
  onRange,
  branchId,
  setBranchId,
  status,
  setStatus,
  categoryId,
  setCategoryId,
  couponCode,
  setCouponCode,
  data,
  isFetching,
  onRefresh,
}: {
  preset: PresetKey;
  onPreset: (k: PresetKey) => void;
  range: { from: Date; to: Date };
  onRange: (r: { from: Date; to: Date }) => void;
  branchId: string | null;
  setBranchId: (v: string | null) => void;
  status: string | null;
  setStatus: (v: string | null) => void;
  categoryId: string | null;
  setCategoryId: (v: string | null) => void;
  couponCode: string | null;
  setCouponCode: (v: string | null) => void;
  data: ReportsData | undefined;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" /> Reports & Analytics
          </div>
          <h1 className="font-display text-3xl font-black leading-tight md:text-4xl">
            Executive Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmtDate(range.from)} — {fmtDate(range.to)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFetching}>
            {isFetching ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
          <ExportMenu data={data} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={preset === p.key ? "default" : "outline"}
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => onPreset(p.key)}
          >
            {p.label}
          </Button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs">
              <CalendarIcon className="mr-1 h-3.5 w-3.5" />
              {fmtDate(range.from)} — {fmtDate(range.to)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              defaultMonth={range.from}
              selected={{ from: range.from, to: range.to }}
              onSelect={(sel) => {
                if (sel?.from && sel?.to) {
                  const from = new Date(sel.from);
                  from.setHours(0, 0, 0, 0);
                  const to = new Date(sel.to);
                  to.setHours(23, 59, 59, 999);
                  onRange({ from, to });
                }
              }}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <FilterSelect
          label="Branch"
          value={branchId}
          onChange={setBranchId}
          options={
            data?.meta.branchOptions.map((b) => ({ value: b.id, label: b.name })) ?? []
          }
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={ORDER_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
        />
        <FilterSelect
          label="Category"
          value={categoryId}
          onChange={setCategoryId}
          options={
            data?.meta.categoryOptions.map((c) => ({ value: c.id, label: c.name })) ?? []
          }
        />
        <FilterSelect
          label="Coupon"
          value={couponCode}
          onChange={setCouponCode}
          options={
            data?.meta.couponOptions.map((c) => ({
              value: c.code,
              label: c.label ?? c.code,
            })) ?? []
          }
        />
      </div>
    </header>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select
      value={value ?? "__all__"}
      onValueChange={(v) => onChange(v === "__all__" ? null : v)}
    >
      <SelectTrigger className="h-9 rounded-xl text-xs">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All {label}s</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="capitalize">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// -----------------------------
// Export menu
// -----------------------------

function ExportMenu({ data }: { data: ReportsData | undefined }) {
  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Revenue (PKR)", data.revenue.total],
      ["Net Revenue (PKR)", data.revenue.net],
      ["Discount Given (PKR)", data.revenue.discount],
      ["Delivery Revenue (PKR)", data.revenue.delivery],
      ["Average Order Value", data.revenue.aov],
      ["Revenue Growth (%)", data.revenue.growthPct?.toFixed(2) ?? ""],
      ["Total Orders", data.orders.total],
      ["Completed", data.orders.completed],
      ["Cancelled", data.orders.cancelled],
      ["Avg Processing (min)", data.orders.avgProcessingMin],
      ["Unique Customers", data.customers.unique],
      ["New Customers", data.customers.new],
      ["Coupon Uses", data.coupons.totalUses],
    ];
    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    downloadBlob(csv, `report-${Date.now()}.csv`, "text/csv");
  };

  const exportXLSX = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Metric", "Value"],
        ["Total Revenue", data.revenue.total],
        ["Net Revenue", data.revenue.net],
        ["Discount Given", data.revenue.discount],
        ["Delivery Revenue", data.revenue.delivery],
        ["Average Order Value", data.revenue.aov],
        ["Revenue Growth %", data.revenue.growthPct ?? ""],
        ["Total Orders", data.orders.total],
        ["Completed", data.orders.completed],
        ["Cancelled", data.orders.cancelled],
        ["Cancellation Rate %", data.orders.cancellationRate.toFixed(2)],
      ]),
      "Summary",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.trend),
      "Daily Trend",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.products.best),
      "Best Products",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.customers.top),
      "Top Customers",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.coupons.top),
      "Coupons",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.branches),
      "Branches",
    );
    XLSX.writeFile(wb, `report-${Date.now()}.xlsx`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" disabled={!data}>
          <Download className="mr-1 h-3.5 w-3.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={exportCSV}>
          <FileText className="h-4 w-4" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportXLSX}>
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// -----------------------------
// Body (tabs)
// -----------------------------

function ReportsBody({ data }: { data: ReportsData }) {
  return (
    <div className="space-y-6">
      <KpiGrid data={data} />

      <Tabs defaultValue="revenue" className="w-full">
        <div className="-mx-1 overflow-x-auto pb-1 print:hidden">
          <TabsList className="inline-flex h-auto w-max min-w-full items-center justify-start gap-1 rounded-2xl bg-muted/60 p-1.5 sm:flex sm:w-full sm:flex-wrap">
            <Trigger value="revenue" label="Revenue" icon={TrendingUp} />
            <Trigger value="orders" label="Orders" icon={ShoppingBag} />
            <Trigger value="products" label="Products" icon={Receipt} />
            <Trigger value="customers" label="Customers" icon={Users} />
            <Trigger value="coupons" label="Coupons" icon={Tag} />
            <Trigger value="peak" label="Peak Hours" icon={Flame} />
            <Trigger value="branches" label="Branches" icon={MapPin} />
          </TabsList>
        </div>


        <div className="mt-6">
          <TabsContent value="revenue" className="m-0"><RevenueTab data={data} /></TabsContent>
          <TabsContent value="orders" className="m-0"><OrdersTab data={data} /></TabsContent>
          <TabsContent value="products" className="m-0"><ProductsTab data={data} /></TabsContent>
          <TabsContent value="customers" className="m-0"><CustomersTab data={data} /></TabsContent>
          <TabsContent value="coupons" className="m-0"><CouponsTab data={data} /></TabsContent>
          <TabsContent value="peak" className="m-0"><PeakTab data={data} /></TabsContent>
          <TabsContent value="branches" className="m-0"><BranchesTab data={data} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function Trigger({
  value,
  label,
  icon: Icon,
}: {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <TabsTrigger
      value={value}
      className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </TabsTrigger>
  );
}

// -----------------------------
// KPI Grid
// -----------------------------

function KpiGrid({ data }: { data: ReportsData }) {
  const growth = data.revenue.growthPct;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Total Revenue"
        value={fmtPKR(data.revenue.total)}
        icon={<TrendingUp className="h-4 w-4" />}
        trend={
          growth == null ? null : (
            <TrendBadge value={growth} />
          )
        }
      />
      <KpiCard
        title="Total Orders"
        value={data.orders.total.toLocaleString()}
        icon={<ShoppingBag className="h-4 w-4" />}
        subtitle={`${data.orders.completed} completed`}
      />
      <KpiCard
        title="Avg Order Value"
        value={fmtPKR(data.revenue.aov)}
        icon={<Receipt className="h-4 w-4" />}
      />
      <KpiCard
        title="Customers"
        value={data.customers.unique.toLocaleString()}
        icon={<Users className="h-4 w-4" />}
        subtitle={`${data.customers.new} new · ${data.customers.returning} returning`}
      />
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  trend?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="group overflow-hidden rounded-2xl border-border/70 transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>{title}</span>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
        </div>
        <div className="font-display text-3xl font-black leading-none tabular-nums animate-in fade-in slide-in-from-bottom-1">
          {value}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{subtitle ?? ""}</span>
          {trend}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        up
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-rose-500/15 text-rose-700 dark:text-rose-400",
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {fmtPct(value)}
    </span>
  );
}

// -----------------------------
// Section card
// -----------------------------

function Section({
  title,
  description,
  children,
  action,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("rounded-2xl border-border/70", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base font-bold">{title}</CardTitle>
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function EmptyChart({ label = "No data in this range" }: { label?: string }) {
  return (
    <div className="grid h-64 place-items-center text-xs text-muted-foreground">{label}</div>
  );
}

// -----------------------------
// Revenue Tab
// -----------------------------

function RevenueTab({ data }: { data: ReportsData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Net Revenue" value={fmtPKR(data.revenue.net)} />
        <MiniStat label="Discounts Given" value={fmtPKR(data.revenue.discount)} accent="rose" />
        <MiniStat label="Delivery Revenue" value={fmtPKR(data.revenue.delivery)} />
        <MiniStat label="Tax Collected" value={fmtPKR(data.revenue.tax)} />
      </div>

      <Section title="Revenue Trend" description="Daily revenue across the selected range.">
        {data.trend.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.trend}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmtPKR(v)} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#rev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Monthly Sales" description="Aggregated by month.">
          {data.monthly.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmtPKR(v)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>
        <Section title="Yearly Sales" description="Total revenue per calendar year.">
          {data.yearly.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.yearly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmtPKR(v)} />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "rose" | "emerald";
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display text-xl font-bold",
          accent === "rose" && "text-rose-600 dark:text-rose-400",
          accent === "emerald" && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {value}
      </div>
    </div>
  );
}

// -----------------------------
// Orders Tab
// -----------------------------

function OrdersTab({ data }: { data: ReportsData }) {
  const statusData = React.useMemo(
    () =>
      ORDER_STATUSES.map((s) => ({
        status: s.replace(/_/g, " "),
        count: data.orders.byStatus[s] ?? 0,
      })),
    [data.orders.byStatus],
  );

  const fulfilData = React.useMemo(
    () => [
      { name: "Delivery", value: data.orders.deliveryCount },
      { name: "Pickup", value: data.orders.pickupCount },
    ],
    [data.orders.deliveryCount, data.orders.pickupCount],
  );

  const branchOrders = React.useMemo(
    () =>
      [...data.branches]
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 8)
        .map((b) => ({ name: b.name, orders: b.orders })),
    [data.branches],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <MiniStat label="Completed" value={String(data.orders.completed)} accent="emerald" />
        <MiniStat label="Cancelled" value={String(data.orders.cancelled)} accent="rose" />
        <MiniStat label="Avg Processing" value={`${data.orders.avgProcessingMin}m`} />
      </div>

      <Section title="Orders by Status">
        {statusData.every((s) => s.count === 0) ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                dataKey="status"
                type="category"
                tick={{ fontSize: 11 }}
                width={100}
                className="capitalize"
              />
              <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Delivery vs Pickup">
          {data.orders.total === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={fulfilData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  innerRadius={55}
                  paddingAngle={3}
                >
                  {fulfilData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Section>
        <Section
          title="Cancellation Rate"
          description={`${data.orders.cancelled} of ${data.orders.total} orders cancelled.`}
        >
          <div className="flex h-[220px] flex-col items-center justify-center gap-2">
            <div className="font-display text-5xl font-black tabular-nums">
              {data.orders.cancellationRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">of total orders</div>
          </div>
        </Section>
      </div>

      <Section title="Orders by Branch" description="Distribution of orders across branches.">
        {branchOrders.length === 0 ? (
          <EmptyChart label="No branch orders in this range" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={branchOrders} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
              <Bar dataKey="orders" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>
    </div>
  );
}


// -----------------------------
// Products Tab
// -----------------------------

function ProductsTab({ data }: { data: ReportsData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Best Selling Products" description="Ranked by units sold.">
          <ProductList rows={data.products.best} valueLabel="units" valueKey="qty" />
        </Section>
        <Section title="Highest Revenue Products">
          <ProductList
            rows={data.products.topRevenue}
            valueLabel="PKR"
            valueKey="revenue"
            currency
          />
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Category Revenue">
          {data.products.categories.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.products.categories}
                  dataKey="revenue"
                  nameKey="name"
                  outerRadius={100}
                  label={(entry) => entry.name}
                >
                  {data.products.categories.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmtPKR(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Section>
        <Section title="Sizes & Add-ons">
          <div className="grid gap-4 md:grid-cols-2">
            <MiniList title="Popular Sizes" rows={data.products.sizes} />
            <MiniList title="Popular Add-ons" rows={data.products.addons} />
          </div>
        </Section>
      </div>

      <Section title="Underperforming Products" description="Least ordered items in the range.">
        <ProductList rows={data.products.worst} valueLabel="units" valueKey="qty" />
      </Section>
    </div>
  );
}

function ProductList({
  rows,
  valueKey,
  valueLabel,
  currency,
}: {
  rows: ReportsData["products"]["best"];
  valueKey: "qty" | "revenue";
  valueLabel: string;
  currency?: boolean;
}) {
  if (!rows.length) return <EmptyChart />;
  const max = Math.max(...rows.map((r) => r[valueKey]));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const value = r[valueKey];
        const pct = max ? (value / max) * 100 : 0;
        return (
          <div key={r.name + i} className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 truncate">
                <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/15 text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="truncate font-medium">{r.name}</span>
                {r.category && (
                  <Badge variant="outline" className="text-[10px]">
                    {r.category}
                  </Badge>
                )}
              </div>
              <span className="shrink-0 text-xs font-semibold">
                {currency ? fmtPKR(value) : `${value} ${valueLabel}`}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MiniList({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; qty: number }[];
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
          No data
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li
              key={r.name}
              className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
            >
              <span className="truncate">{r.name}</span>
              <span className="font-bold">{r.qty}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// -----------------------------
// Customers Tab
// -----------------------------

function CustomersTab({ data }: { data: ReportsData }) {
  const tierData = Object.entries(data.customers.tierDist).map(([tier, count]) => ({
    tier,
    count,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MiniStat label="New" value={String(data.customers.new)} accent="emerald" />
        <MiniStat label="Returning" value={String(data.customers.returning)} />
        <MiniStat label="Repeat Rate" value={fmtPct(data.customers.repeatRate)} />
        <MiniStat label="Avg Spend" value={fmtPKR(data.customers.avgSpend)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Top Spending Customers">
          <CustomerList rows={data.customers.top} showRevenue />
        </Section>
        <Section title="Most Loyal Customers">
          <CustomerList
            rows={data.customers.mostLoyal.map((r) => ({
              id: r.id,
              name: r.name,
              phone: null,
              orders: r.orders,
              revenue: 0,
              tier: r.tier,
            }))}
          />
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Loyalty Tier Distribution">
          {tierData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={tierData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="tier" tick={{ fontSize: 11 }} className="capitalize" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>
        <Section
          title="Daddy Pass Members"
          description="Active subscribers driving repeat revenue."
        >
          <div className="flex h-[220px] flex-col items-center justify-center gap-2">
            <Crown className="h-8 w-8 text-amber-500" />
            <div className="font-display text-5xl font-black">
              {data.customers.daddyPassMembers}
            </div>
            <div className="text-xs text-muted-foreground">active members</div>
          </div>
        </Section>
      </div>

      <Section title="Referral Leaders">
        {data.customers.referralLeaders.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
            No referrals yet
          </div>
        ) : (
          <ul className="space-y-1.5">
            {data.customers.referralLeaders.map((r, i) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/15 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  {r.name}
                </span>
                <span className="font-bold">{r.count} referrals</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function CustomerList({
  rows,
  showRevenue,
}: {
  rows: {
    id: string;
    name: string;
    phone: string | null;
    orders: number;
    revenue: number;
    tier?: string;
  }[];
  showRevenue?: boolean;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
        No customers in this range
      </div>
    );
  }
  return (
    <ul className="space-y-1.5">
      {rows.map((r, i) => (
        <li
          key={r.id}
          className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/15 text-[10px] font-bold text-primary">
              {i + 1}
            </span>
            <div className="min-w-0">
              <div className="truncate font-medium">{r.name}</div>
              {r.phone && <div className="text-[11px] text-muted-foreground">{r.phone}</div>}
            </div>
          </div>
          <div className="text-right">
            {showRevenue ? (
              <>
                <div className="text-sm font-bold">{fmtPKR(r.revenue)}</div>
                <div className="text-[11px] text-muted-foreground">{r.orders} orders</div>
              </>
            ) : (
              <div className="text-sm font-bold">{r.orders} orders</div>
            )}
            {r.tier && (
              <Badge variant="outline" className="mt-0.5 text-[10px] capitalize">
                {r.tier}
              </Badge>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// -----------------------------
// Coupons Tab
// -----------------------------

function CouponsTab({ data }: { data: ReportsData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MiniStat label="Total Uses" value={String(data.coupons.totalUses)} />
        <MiniStat label="Discount Given" value={fmtPKR(data.coupons.totalDiscount)} accent="rose" />
        <MiniStat label="Conversion" value={fmtPct(data.coupons.conversionRate)} />
        <MiniStat label="Expired / Unused" value={`${data.coupons.expired} / ${data.coupons.unused}`} />
      </div>

      <Section title="Top Coupons" description="Sorted by uses in the selected range.">
        {data.coupons.top.length === 0 ? (
          <EmptyChart label="No coupon activity" />
        ) : (
          <div className="space-y-2">
            {data.coupons.top.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2">
                  <Badge className="font-mono">{c.code}</Badge>
                  {c.label && <span className="text-sm font-medium">{c.label}</span>}
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Uses</span>{" "}
                    <span className="font-bold">{c.uses}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Discount</span>{" "}
                    <span className="font-bold">{fmtPKR(c.discount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Promotion Analytics"
        description="Prepared for future banner click tracking."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <MiniStat label="Active Promotions" value={String(data.promotions.active)} accent="emerald" />
          <MiniStat label="Scheduled" value={String(data.promotions.scheduled)} />
          <MiniStat label="Total Banners" value={String(data.promotions.total)} />
        </div>
        <div className="mt-4 rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
          Banner click tracking coming soon — the schema is ready to plug in.
        </div>
      </Section>
    </div>
  );
}

// -----------------------------
// Peak Hours Tab
// -----------------------------

function PeakTab({ data }: { data: ReportsData }) {
  const maxHeat = Math.max(1, ...data.peak.heatmap.flat());
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <MiniStat label="Best Selling Hour" value={`${data.peak.bestHour}:00`} />
        <MiniStat label="Best Selling Day" value={data.peak.bestDay} />
      </div>

      <Section title="Orders per Hour">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.peak.hourly}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Orders per Day of Week">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.peak.dow}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Busy Time Heatmap" description="Rows = day of week, columns = hour.">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex gap-1 pl-10 text-[9px] text-muted-foreground">
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="w-5 text-center">{h}</div>
              ))}
            </div>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, dowIdx) => (
              <div key={dayName} className="mt-1 flex items-center gap-1">
                <div className="w-9 text-[10px] font-semibold text-muted-foreground">
                  {dayName}
                </div>
                {data.peak.heatmap[dowIdx].map((v, h) => {
                  const intensity = v / maxHeat;
                  return (
                    <div
                      key={h}
                      title={`${dayName} ${h}:00 — ${v} orders`}
                      className="h-5 w-5 rounded"
                      style={{
                        background:
                          intensity === 0
                            ? "hsl(var(--muted))"
                            : `hsl(var(--primary) / ${0.15 + intensity * 0.85})`,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}

// -----------------------------
// Branches Tab
// -----------------------------

function BranchesTab({ data }: { data: ReportsData }) {
  const ranked = React.useMemo(
    () =>
      [...data.branches]
        .map((b) => ({
          ...b,
          aov: b.orders > 0 ? b.revenue / b.orders : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue),
    [data.branches],
  );
  const top = ranked[0];
  const totalRev = ranked.reduce((s, b) => s + b.revenue, 0);
  const totalOrders = ranked.reduce((s, b) => s + b.orders, 0);
  const overallAov = totalOrders > 0 ? totalRev / totalOrders : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <MiniStat label="Branches" value={String(ranked.length)} />
        <MiniStat label="Top Performing" value={top?.name ?? "—"} />
        <MiniStat label="Top Revenue" value={top ? fmtPKR(top.revenue) : "—"} accent="emerald" />
        <MiniStat label="Blended AOV" value={fmtPKR(overallAov)} />
      </div>

      {ranked.length > 0 && (
        <Section title="Performance Ranking" description="Branches ordered by revenue share.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ranked.map((b, i) => {
              const share = totalRev > 0 ? Math.round((b.revenue / totalRev) * 100) : 0;
              return (
                <div
                  key={b.id}
                  className="group rounded-xl border border-border/70 bg-card p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black",
                          i === 0
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : i === 1
                              ? "bg-slate-400/15 text-slate-600 dark:text-slate-300"
                              : i === 2
                                ? "bg-orange-600/15 text-orange-700 dark:text-orange-400"
                                : "bg-muted text-muted-foreground",
                        )}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">{b.name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {b.city ?? "—"}
                        </div>
                      </div>
                    </div>
                    {b.is_active ? (
                      <Badge className="bg-emerald-500/15 text-[10px] text-emerald-700 dark:text-emerald-400">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Revenue
                      </div>
                      <div className="text-sm font-bold tabular-nums">{fmtPKR(b.revenue)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Orders
                      </div>
                      <div className="text-sm font-bold tabular-nums">{b.orders}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        AOV
                      </div>
                      <div className="text-sm font-bold tabular-nums">{fmtPKR(b.aov)}</div>
                    </div>
                  </div>
                  <div
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={share}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${b.name} revenue share`}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{share}% of total revenue</span>
                    <span>{b.avg_delivery_min}m avg delivery</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Revenue per Branch">
        {ranked.length === 0 ? (
          <EmptyChart label="No branch data — add branches in Settings" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ranked} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmtPKR(v)} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      <Section title="Branch Breakdown">
        {ranked.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
            Add branches from Settings → Branches
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Branch</th>
                  <th className="py-2 pr-3">City</th>
                  <th className="py-2 pr-3 text-right">Orders</th>
                  <th className="py-2 pr-3 text-right">Revenue</th>
                  <th className="py-2 pr-3 text-right">AOV</th>
                  <th className="py-2 pr-3 text-right">Avg Delivery</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((b) => (
                  <tr key={b.id} className="border-b border-border/50">
                    <td className="py-2.5 pr-3 font-medium">{b.name}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{b.city ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{b.orders}</td>
                    <td className="py-2.5 pr-3 text-right font-bold tabular-nums">{fmtPKR(b.revenue)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{fmtPKR(b.aov)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{b.avg_delivery_min}m</td>
                    <td className="py-2.5">
                      {b.is_active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Separator />
      <p className="text-center text-[11px] text-muted-foreground">
        Multi-branch expansion ready — new branches automatically appear here.
      </p>
    </div>
  );
}


import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Award,
  BadgeCheck,
  Crown,
  Download,
  Flame,
  Gift,
  MoreHorizontal,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  adminListCustomers,
  type AdminCustomerRow,
} from "@/lib/admin-customers.functions";
import {
  PASS_STYLE,
  TIER_STYLE,
  fmtDate,
  fmtRelative,
  formatPKR,
  initialsFrom,
} from "@/lib/admin-customers";
import {
  SEGMENT_LABEL,
  SEGMENT_STYLE,
  averageOrderValue,
  customerSegments,
  shortCustomerId,
  summarizeCustomers,
  type CustomerSegment,
} from "@/lib/admin-customers-derived";
import { CustomerDetailsDrawer } from "./CustomerDetailsDrawer";

type TierFilter = "all" | "bronze" | "silver" | "gold" | "platinum";
type PassFilter = "any" | "active" | "none";
type Segment = "all" | CustomerSegment;
type SortKey = "recent" | "spend" | "orders" | "aov" | "name";

export function CustomersContent() {
  const qc = useQueryClient();
  const fetchList = useServerFn(adminListCustomers);

  const [search, setSearch] = React.useState("");
  const [tier, setTier] = React.useState<TierFilter>("all");
  const [pass, setPass] = React.useState<PassFilter>("any");
  const [segment, setSegment] = React.useState<Segment>("all");
  const [sort, setSort] = React.useState<SortKey>("recent");
  const [minOrders, setMinOrders] = React.useState<number>(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 12;

  const [openId, setOpenId] = React.useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: () => fetchList({ data: undefined }) as Promise<AdminCustomerRow[]>,
  });

  React.useEffect(() => {
    const channel = supabase
      .channel("admin-customers")
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

  React.useEffect(() => setPage(1), [search, tier, pass, segment, sort, minOrders]);

  const filtered = React.useMemo(() => {
    let rows = q.data ?? [];
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.full_name ?? "").toLowerCase().includes(s) ||
          (r.email ?? "").toLowerCase().includes(s) ||
          (r.phone ?? "").toLowerCase().includes(s) ||
          (r.referral_code ?? "").toLowerCase().includes(s) ||
          r.id.toLowerCase().includes(s) ||
          shortCustomerId(r.id).toLowerCase().includes(s),
      );
    }
    if (tier !== "all") rows = rows.filter((r) => r.loyalty_tier === tier);
    if (pass === "active") rows = rows.filter((r) => r.daddy_pass_status === "active");
    if (pass === "none") rows = rows.filter((r) => r.daddy_pass_status !== "active");
    if (minOrders > 0) rows = rows.filter((r) => r.total_orders >= minOrders);

    const now = Date.now();
    if (segment !== "all") {
      rows = rows.filter((r) => customerSegments(r, now).includes(segment));
    }

    rows = [...rows].sort((a, b) => {
      if (sort === "spend") return b.total_spend_pkr - a.total_spend_pkr;
      if (sort === "orders") return b.total_orders - a.total_orders;
      if (sort === "aov") return averageOrderValue(b) - averageOrderValue(a);
      if (sort === "name") return (a.full_name ?? "").localeCompare(b.full_name ?? "");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return rows;
  }, [q.data, search, tier, pass, segment, sort, minOrders]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Insights
  const insights = React.useMemo(() => {
    const rows = q.data ?? [];
    const now = Date.now();
    const bySpend = [...rows].sort((a, b) => b.total_spend_pkr - a.total_spend_pkr).slice(0, 5);
    const byOrders = [...rows].sort((a, b) => b.total_orders - a.total_orders).slice(0, 5);
    const byReferrals = [...rows]
      .filter((r) => r.referral_count > 0)
      .sort((a, b) => b.referral_count - a.referral_count)
      .slice(0, 5);
    const recentSignups = [...rows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    const inactive = rows.filter((r) => {
      const t = r.last_order_at ? new Date(r.last_order_at).getTime() : 0;
      return r.total_orders > 0 && now - t > 60 * 24 * 60 * 60 * 1000;
    }).length;
    return { bySpend, byOrders, byReferrals, recentSignups, inactive };
  }, [q.data]);

  async function exportCSV() {
    if (!filtered.length) return toast.error("Nothing to export");
    const header = [
      "Name",
      "Email",
      "Phone",
      "Tier",
      "Daddy Pass",
      "Orders",
      "Spend (PKR)",
      "Points",
      "Referral Code",
      "Referrals",
      "Joined",
      "Last Order",
    ];
    const rows = filtered.map((r) => [
      r.full_name ?? "",
      r.email ?? "",
      r.phone ?? "",
      r.loyalty_tier,
      r.daddy_pass_status,
      r.total_orders,
      r.total_spend_pkr,
      r.reward_points,
      r.referral_code ?? "",
      r.referral_count,
      new Date(r.created_at).toISOString(),
      r.last_order_at ?? "",
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((v) => {
            const s = String(v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      )
      .join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "customers.csv");
    toast.success("CSV exported");
  }

  async function exportXLSX() {
    if (!filtered.length) return toast.error("Nothing to export");
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((r) => ({
        Name: r.full_name ?? "",
        Email: r.email ?? "",
        Phone: r.phone ?? "",
        Tier: r.loyalty_tier,
        "Daddy Pass": r.daddy_pass_status,
        Orders: r.total_orders,
        "Spend (PKR)": r.total_spend_pkr,
        Points: r.reward_points,
        "Referral Code": r.referral_code ?? "",
        Referrals: r.referral_count,
        Joined: new Date(r.created_at).toISOString(),
        "Last Order": r.last_order_at ?? "",
      })),
    );
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    downloadBlob(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "customers.xlsx",
    );
    toast.success("Excel exported");
  }

  const summary = React.useMemo(() => summarizeCustomers(q.data ?? []), [q.data]);

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-black tracking-tight md:text-3xl">
            Customers
          </h1>
          <p className="text-sm text-muted-foreground">
            {q.data?.length ?? 0} total · CRM, loyalty and Daddy Pass.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={exportCSV}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={exportXLSX}>Export Excel (.xlsx)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Total customers" value={summary.total.toLocaleString()} icon={Users} tone="primary" loading={q.isLoading} />
        <Kpi label="New today" value={summary.newToday.toLocaleString()} icon={UserPlus} tone="info" loading={q.isLoading} />
        <Kpi label="Returning" value={summary.returning.toLocaleString()} icon={BadgeCheck} tone="success" loading={q.isLoading} />
        <Kpi label="Active · 30d" value={summary.active30d.toLocaleString()} icon={TrendingUp} tone="warning" loading={q.isLoading} />
        <Kpi label="Avg spend" value={formatPKR(summary.avgSpend)} icon={Wallet} tone="primary" loading={q.isLoading} />
      </div>

      {/* Leaderboards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          icon={Crown}
          title="Top spenders"
          rows={insights.bySpend.map((r) => ({
            id: r.id,
            name: r.full_name ?? "Unnamed",
            hint: formatPKR(r.total_spend_pkr),
          }))}
          onSelect={setOpenId}
          tone="primary"
        />
        <InsightCard
          icon={ShoppingBag}
          title="Most orders"
          rows={insights.byOrders.map((r) => ({
            id: r.id,
            name: r.full_name ?? "Unnamed",
            hint: `${r.total_orders} orders`,
          }))}
          onSelect={setOpenId}
          tone="info"
        />
        <InsightCard
          icon={Gift}
          title="Referral leaders"
          rows={insights.byReferrals.map((r) => ({
            id: r.id,
            name: r.full_name ?? "Unnamed",
            hint: `${r.referral_count} referrals`,
          }))}
          onSelect={setOpenId}
          tone="success"
          emptyLabel="No referrals yet"
        />
        <InsightCard
          icon={Sparkles}
          title="Recent signups"
          rows={insights.recentSignups.map((r) => ({
            id: r.id,
            name: r.full_name ?? "Unnamed",
            hint: fmtRelative(r.created_at),
          }))}
          onSelect={setOpenId}
          tone="warning"
        />
      </div>

      {/* Toolbar */}
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, phone, ID or referral"
            aria-label="Search customers"
            className="h-10 rounded-xl border-transparent bg-muted/60 pl-9 focus-visible:border-input focus-visible:bg-background"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "new", "returning", "vip", "frequent", "high_spender", "inactive"] as Segment[]).map((s) => (
            <button
              key={s}
              onClick={() => setSegment(s)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                segment === s
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
              aria-pressed={segment === s}
            >
              {s === "all" ? "All" : SEGMENT_LABEL[s as CustomerSegment]}
            </button>
          ))}
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as TierFilter)}
            aria-label="Filter by tier"
            className="ml-1 h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold capitalize"
          >
            <option value="all">All tiers</option>
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>
          <select
            value={pass}
            onChange={(e) => setPass(e.target.value as PassFilter)}
            aria-label="Filter by pass"
            className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
          >
            <option value="any">Any pass</option>
            <option value="active">Daddy Pass · Active</option>
            <option value="none">No active pass</option>
          </select>
          <select
            value={String(minOrders)}
            onChange={(e) => setMinOrders(Number(e.target.value))}
            aria-label="Minimum orders"
            className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
          >
            <option value="0">Any orders</option>
            <option value="1">≥ 1 order</option>
            <option value="5">≥ 5 orders</option>
            <option value="10">≥ 10 orders</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort by"
            className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
          >
            <option value="recent">Newest</option>
            <option value="spend">Highest spend</option>
            <option value="orders">Most orders</option>
            <option value="aov">Highest AOV</option>
            <option value="name">A → Z</option>
          </select>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {q.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))
        ) : pageRows.length === 0 ? (
          <EmptyState />
        ) : (
          pageRows.map((c) => {
            const segs = customerSegments(c);
            return (
              <button
                key={c.id}
                onClick={() => setOpenId(c.id)}
                className="w-full rounded-2xl border border-border/70 bg-card p-4 text-left shadow-[var(--shadow-1)] transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarImage src={c.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/20 text-xs font-bold">
                      {initialsFrom(c.full_name, "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate font-semibold">{c.full_name ?? "Unnamed"}</div>
                      <div className="shrink-0 font-display text-sm font-black tabular-nums">
                        {formatPKR(c.total_spend_pkr)}
                      </div>
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {c.email ?? c.phone ?? "—"} · #{shortCustomerId(c.id)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                          TIER_STYLE[c.loyalty_tier] ?? "bg-muted",
                        )}
                      >
                        {c.loyalty_tier}
                      </Badge>
                      {segs.slice(0, 2).map((s) => (
                        <Badge
                          key={s}
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            SEGMENT_STYLE[s],
                          )}
                        >
                          {SEGMENT_LABEL[s]}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                      <div>
                        <div className="tabular-nums font-semibold text-foreground">
                          {c.total_orders}
                        </div>
                        <div>Orders</div>
                      </div>
                      <div>
                        <div className="tabular-nums font-semibold text-foreground">
                          {formatPKR(averageOrderValue(c))}
                        </div>
                        <div>AOV</div>
                      </div>
                      <div>
                        <div className="truncate font-semibold text-foreground">
                          {c.last_order_at ? fmtRelative(c.last_order_at) : "—"}
                        </div>
                        <div>Last order</div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>


      {/* Table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)] md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold md:px-6">Customer</th>
                <th className="px-2 py-3 font-semibold">ID</th>
                <th className="px-2 py-3 font-semibold">Segments</th>
                <th className="px-2 py-3 font-semibold">Tier</th>
                <th className="px-2 py-3 font-semibold">Pass</th>
                <th className="px-2 py-3 text-right font-semibold">Orders</th>
                <th className="px-2 py-3 text-right font-semibold">Spend</th>
                <th className="px-2 py-3 text-right font-semibold">AOV</th>
                <th className="px-2 py-3 font-semibold">Last order</th>
                <th className="px-2 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 text-right font-semibold md:px-6"></th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td colSpan={11} className="px-4 py-3 md:px-6">
                      <Skeleton className="h-8 w-full rounded" />
                    </td>
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center md:px-6">
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                pageRows.map((c) => {
                  const segs = customerSegments(c);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setOpenId(c.id)}
                      className="cursor-pointer border-t border-border/50 transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 md:px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={c.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-primary/20 text-xs font-bold">
                              {initialsFrom(c.full_name, "?")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate font-semibold">
                              {c.full_name ?? "Unnamed"}
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {c.email ?? c.phone ?? "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 font-mono text-[11px] text-muted-foreground">
                        #{shortCustomerId(c.id)}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-1">
                          {segs.slice(0, 2).map((s) => (
                            <Badge
                              key={s}
                              className={cn(
                                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                SEGMENT_STYLE[s],
                              )}
                            >
                              {SEGMENT_LABEL[s]}
                            </Badge>
                          ))}
                          {segs.length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <Badge
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                            TIER_STYLE[c.loyalty_tier] ?? "bg-muted",
                          )}
                        >
                          <Award className="mr-1 h-3 w-3" />
                          {c.loyalty_tier}
                        </Badge>
                      </td>
                      <td className="px-2 py-3">
                        {c.daddy_pass_status !== "none" ? (
                          <Badge
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                              PASS_STYLE[c.daddy_pass_status] ?? "bg-muted",
                            )}
                          >
                            <BadgeCheck className="mr-1 h-3 w-3" />
                            {c.daddy_pass_status}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3 tabular-nums text-right text-muted-foreground">
                        {c.total_orders}
                      </td>
                      <td className="px-2 py-3 font-semibold tabular-nums text-right">
                        {formatPKR(c.total_spend_pkr)}
                      </td>
                      <td className="px-2 py-3 tabular-nums text-right text-muted-foreground">
                        {formatPKR(averageOrderValue(c))}
                      </td>
                      <td className="px-2 py-3 text-xs text-muted-foreground">
                        {c.last_order_at ? fmtRelative(c.last_order_at) : "—"}
                      </td>
                      <td className="px-2 py-3 text-xs text-muted-foreground">
                        {fmtDate(c.created_at)}
                      </td>
                      <td
                        className="px-4 py-3 text-right md:px-6"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => setOpenId(c.id)}
                          aria-label="Open"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3 text-xs text-muted-foreground md:px-6">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="px-2 font-semibold text-foreground">
              {page} / {pageCount}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}


      {insights.inactive > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-warning/50 bg-warning/10 p-4 text-sm">
          <Flame className="h-5 w-5 text-warning-foreground" />
          <div>
            <div className="font-display font-black">
              {insights.inactive} inactive customers
            </div>
            <div className="text-xs text-muted-foreground">
              Haven't ordered in 60+ days. Consider a win-back campaign.
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto rounded-lg"
            onClick={() => setSegment("inactive")}
          >
            View list
          </Button>
        </div>
      )}

      <CustomerDetailsDrawer
        open={!!openId}
        customerId={openId}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
    </div>
  );
}

function InsightCard({
  icon: Icon,
  title,
  rows,
  onSelect,
  tone,
  emptyLabel = "No data yet",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  rows: { id: string; name: string; hint: string }[];
  onSelect: (id: string) => void;
  tone: "primary" | "info" | "success" | "warning";
  emptyLabel?: string;
}) {
  const toneClass = {
    primary: "bg-primary/15 text-foreground",
    info: "bg-info/15 text-info",
    success: "bg-success/15 text-success-foreground",
    warning: "bg-warning/20 text-warning-foreground",
  }[tone];
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-1)]">
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("grid h-8 w-8 place-items-center rounded-lg", toneClass)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="font-display text-sm font-black">{title}</div>
      </div>
      {rows.length === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground">{emptyLabel}</div>
      ) : (
        <ul className="space-y-1">
          {rows.map((r, i) => (
            <li key={r.id}>
              <button
                onClick={() => onSelect(r.id)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-muted font-mono text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <span className="truncate font-semibold">{r.name}</span>
                </span>
                <span className="text-muted-foreground">{r.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

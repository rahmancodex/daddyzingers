import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  BadgePercent,
  Clock,
  Copy,
  Eye,
  Filter as FilterIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Search,
  Sparkles,
  Ticket,
  Trash2,
  TrendingUp,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  adminListCoupons,
  adminToggleCoupon,
  adminDeleteCoupon,
} from "@/lib/admin-promos.functions";
import { CouponDrawer, type CouponRow } from "./CouponDrawer";

type StatusKey = "active" | "scheduled" | "expired" | "inactive";
type Filter = "all" | StatusKey;
type TypeFilter = "all" | CouponRow["discount_type"];
type SortKey = "recent" | "code" | "usage" | "expiry";

function statusOf(c: CouponRow): StatusKey {
  const now = Date.now();
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return "expired";
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return "scheduled";
  if (!c.is_active) return "inactive";
  return "active";
}

const STATUS_CLASS: Record<StatusKey, string> = {
  active: "bg-success/15 text-success-foreground",
  scheduled: "bg-info/15 text-info",
  expired: "bg-muted text-muted-foreground",
  inactive: "bg-destructive/15 text-destructive",
};

const STATUS_DOT: Record<StatusKey, string> = {
  active: "bg-success",
  scheduled: "bg-info",
  expired: "bg-muted-foreground/50",
  inactive: "bg-destructive",
};

function discountLabel(c: CouponRow): string {
  if (c.discount_type === "percent") return `${c.percent ?? 0}% off`;
  if (c.discount_type === "flat")
    return `Rs ${(c.flat_pkr ?? 0).toLocaleString("en-PK")} off`;
  return "Free delivery";
}

function TypeIcon({ type, className }: { type: CouponRow["discount_type"]; className?: string }) {
  if (type === "percent") return <BadgePercent className={cn("h-4 w-4", className)} />;
  if (type === "flat") return <Wallet className={cn("h-4 w-4", className)} />;
  return <Truck className={cn("h-4 w-4", className)} />;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diffMs = new Date(iso).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function expiryLabel(c: CouponRow): { text: string; tone: "warn" | "danger" | "muted" } | null {
  if (!c.expires_at) return null;
  const d = daysUntil(c.expires_at);
  if (d == null) return null;
  if (d < 0) return { text: `Expired ${Math.abs(d)}d ago`, tone: "muted" };
  if (d === 0) return { text: "Expires today", tone: "danger" };
  if (d <= 7) return { text: `${d}d left`, tone: "warn" };
  return { text: `${d}d left`, tone: "muted" };
}

function estimatedDiscount(c: CouponRow): number {
  // Best-effort estimate reusing existing fields (no new queries).
  if (c.discount_type === "flat") return (c.flat_pkr ?? 0) * c.usage_count;
  if (c.discount_type === "percent") {
    const basis = c.min_subtotal_pkr || 0;
    const raw = (basis * (c.percent ?? 0)) / 100;
    const cap = c.max_discount_pkr ?? Infinity;
    return Math.min(raw, cap) * c.usage_count;
  }
  return 0;
}

export function CouponsContent() {
  const qc = useQueryClient();
  const fetchList = useServerFn(adminListCoupons);
  const toggleFn = useServerFn(adminToggleCoupon);
  const deleteFn = useServerFn(adminDeleteCoupon);

  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("recent");
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<CouponRow | null>(null);
  const [viewRow, setViewRow] = React.useState<CouponRow | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: () => fetchList({ data: undefined }) as Promise<CouponRow[]>,
  });

  React.useEffect(() => {
    const channel = supabase
      .channel("admin-coupons")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coupons" },
        () => qc.invalidateQueries({ queryKey: ["admin", "coupons"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) => toggleFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
      toast.success("Coupon updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
      toast.success("Coupon deleted");
      setDeleteId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  const filtered = React.useMemo(() => {
    let rows = q.data ?? [];
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.code.toLowerCase().includes(s) ||
          r.label.toLowerCase().includes(s) ||
          (r.description ?? "").toLowerCase().includes(s),
      );
    }
    if (filter !== "all") rows = rows.filter((r) => statusOf(r) === filter);
    if (typeFilter !== "all") rows = rows.filter((r) => r.discount_type === typeFilter);
    rows = [...rows].sort((a, b) => {
      if (sort === "code") return a.code.localeCompare(b.code);
      if (sort === "usage") return b.usage_count - a.usage_count;
      if (sort === "expiry") {
        const av = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
        const bv = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
        return av - bv;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return rows;
  }, [q.data, search, filter, typeFilter, sort]);

  const stats = React.useMemo(() => {
    const rows = q.data ?? [];
    const active = rows.filter((r) => statusOf(r) === "active").length;
    const redemptions = rows.reduce((s, r) => s + r.usage_count, 0);
    const estDiscount = rows.reduce((s, r) => s + estimatedDiscount(r), 0);
    const avgDiscount = redemptions > 0 ? Math.round(estDiscount / redemptions) : 0;
    const expiringSoon = rows.filter((r) => {
      const d = daysUntil(r.expires_at);
      return d != null && d >= 0 && d <= 7 && statusOf(r) === "active";
    }).length;
    return { active, redemptions, estDiscount, avgDiscount, expiringSoon };
  }, [q.data]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  React.useEffect(() => {
    setPage(1);
  }, [search, filter, typeFilter, sort]);

  const filtersActive = search.trim() !== "" || filter !== "all" || typeFilter !== "all";
  const clearFilters = () => {
    setSearch("");
    setFilter("all");
    setTypeFilter("all");
    setSort("recent");
  };

  function openNew() {
    setEditRow(null);
    setDrawerOpen(true);
  }

  function duplicate(r: CouponRow) {
    setEditRow({
      ...r,
      id: undefined as unknown as string,
      code: `${r.code}-COPY`,
      usage_count: 0,
    });
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Marketing
          </div>
          <h1 className="mt-0.5 truncate font-display text-2xl font-black tracking-tight md:text-3xl">
            Coupons
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Create, schedule and manage discount codes.
          </p>
        </div>
        <Button onClick={openNew} className="h-10 shrink-0 rounded-xl">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New coupon</span>
          <span className="sm:hidden">New</span>
        </Button>
      </header>

      {/* Marketing KPI strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Marketing overview">
        <Kpi
          label="Active"
          value={String(stats.active)}
          icon={<Ticket className="h-4 w-4" />}
          tone="success"
          loading={q.isLoading}
        />
        <Kpi
          label="Redemptions"
          value={stats.redemptions.toLocaleString("en-PK")}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={q.isLoading}
        />
        <Kpi
          label="Est. Discount"
          value={`Rs ${stats.estDiscount.toLocaleString("en-PK")}`}
          icon={<Wallet className="h-4 w-4" />}
          tone="warn"
          loading={q.isLoading}
        />
        <Kpi
          label="Avg / Use"
          value={`Rs ${stats.avgDiscount.toLocaleString("en-PK")}`}
          icon={<BadgePercent className="h-4 w-4" />}
          loading={q.isLoading}
        />
        <Kpi
          label="Expiring 7d"
          value={String(stats.expiringSoon)}
          icon={<Clock className="h-4 w-4" />}
          tone={stats.expiringSoon > 0 ? "danger" : "muted"}
          loading={q.isLoading}
          className="col-span-2 sm:col-span-1"
        />
      </section>

      {/* Sticky toolbar */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, label, description"
                aria-label="Search coupons"
                className="h-10 rounded-xl border-transparent bg-muted/60 pl-9 pr-9 focus-visible:border-input focus-visible:bg-background"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="Sort coupons"
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="recent">Recent</option>
                <option value="code">Code A→Z</option>
                <option value="usage">Most used</option>
                <option value="expiry">Expiry soonest</option>
              </select>
              {filtersActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-lg text-xs"
                  onClick={clearFilters}
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Filter by status"
          >
            {(["all", "active", "scheduled", "expired", "inactive"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filter === f
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {f !== "all" && (
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[f as StatusKey])}
                    aria-hidden
                  />
                )}
                {f}
              </button>
            ))}
            <div className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden />
            <div className="flex items-center gap-1.5" role="group" aria-label="Filter by type">
              <FilterIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              {(
                [
                  { v: "all" as TypeFilter, label: "All types" },
                  { v: "percent" as TypeFilter, label: "%" },
                  { v: "flat" as TypeFilter, label: "Fixed" },
                  { v: "free_delivery" as TypeFilter, label: "Delivery" },
                ]
              ).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setTypeFilter(opt.v)}
                  aria-pressed={typeFilter === opt.v}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    typeFilter === opt.v
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState onCreate={openNew} filtered={filtersActive} onClear={clearFilters} />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {pageRows.map((c) => (
              <MobileCouponCard
                key={c.id}
                c={c}
                onView={() => setViewRow(c)}
                onEdit={() => {
                  setEditRow(c);
                  setDrawerOpen(true);
                }}
                onDuplicate={() => duplicate(c)}
                onDelete={() => setDeleteId(c.id)}
                onToggle={() => toggleMut.mutate({ id: c.id, is_active: !c.is_active })}
                toggling={toggleMut.isPending}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)] md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-semibold md:px-6">Code</th>
                    <th className="px-2 py-3 font-semibold">Type</th>
                    <th className="px-2 py-3 font-semibold">Discount</th>
                    <th className="px-2 py-3 font-semibold">Min order</th>
                    <th className="px-2 py-3 font-semibold">Usage</th>
                    <th className="px-2 py-3 font-semibold">Expiry</th>
                    <th className="px-2 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold md:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((c) => {
                    const status = statusOf(c);
                    const exp = expiryLabel(c);
                    const pct = usagePct(c);
                    return (
                      <tr
                        key={c.id}
                        className="border-t border-border/50 transition-colors hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 md:px-6">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-black">{c.code}</span>
                            <span className="max-w-[220px] truncate text-[11px] text-muted-foreground">
                              {c.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs font-semibold">
                            <TypeIcon type={c.discount_type} />
                            <span className="capitalize">
                              {c.discount_type.replace("_", " ")}
                            </span>
                          </span>
                        </td>
                        <td className="px-2 py-3 font-semibold tabular-nums">
                          {discountLabel(c)}
                        </td>
                        <td className="px-2 py-3 tabular-nums text-muted-foreground">
                          {c.min_subtotal_pkr
                            ? `Rs ${c.min_subtotal_pkr.toLocaleString("en-PK")}`
                            : "—"}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex min-w-[130px] flex-col gap-1">
                            <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
                              <span>
                                <span className="font-semibold text-foreground">
                                  {c.usage_count}
                                </span>
                                {c.usage_limit != null ? ` / ${c.usage_limit}` : " uses"}
                              </span>
                              {pct != null && <span>{pct}%</span>}
                            </div>
                            {pct != null && (
                              <div
                                className="h-1.5 overflow-hidden rounded-full bg-muted"
                                role="progressbar"
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`Usage ${pct}%`}
                              >
                                <div
                                  className={cn(
                                    "h-full transition-all",
                                    pct >= 90
                                      ? "bg-destructive"
                                      : pct >= 70
                                        ? "bg-warning"
                                        : "bg-primary",
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex flex-col text-[11px]">
                            <span className="text-muted-foreground">
                              {fmtDate(c.expires_at)}
                            </span>
                            {exp && (
                              <span
                                className={cn(
                                  "font-semibold",
                                  exp.tone === "danger" && "text-destructive",
                                  exp.tone === "warn" && "text-warning-foreground",
                                  exp.tone === "muted" && "text-muted-foreground",
                                )}
                              >
                                {exp.text}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <Badge
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                              STATUS_CLASS[status],
                            )}
                          >
                            <span
                              className={cn(
                                "mr-1 inline-block h-1.5 w-1.5 rounded-full",
                                STATUS_DOT[status],
                              )}
                              aria-hidden
                            />
                            {status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right md:px-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-lg"
                              disabled={toggleMut.isPending}
                              onClick={() =>
                                toggleMut.mutate({ id: c.id, is_active: !c.is_active })
                              }
                              aria-label={c.is_active ? "Disable coupon" : "Enable coupon"}
                            >
                              <Power className="h-3.5 w-3.5" />
                              {c.is_active ? "Disable" : "Enable"}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg"
                                  aria-label="More actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                <DropdownMenuItem onClick={() => setViewRow(c)}>
                                  <Eye className="h-4 w-4" /> View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditRow(c);
                                    setDrawerOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => duplicate(c)}>
                                  <Copy className="h-4 w-4" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteId(c.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {filtered.length > pageSize && (
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3 text-xs text-muted-foreground md:px-6">
              <span className="tabular-nums">
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
                <span className="px-2 font-semibold text-foreground tabular-nums">
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
        </>
      )}

      {/* Drawer */}
      <CouponDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        initial={editRow}
        onSaved={() => {
          setDrawerOpen(false);
          qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
        }}
      />

      {/* View coupon */}
      <AlertDialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                {viewRow && <TypeIcon type={viewRow.discount_type} />}
              </span>
              <div className="min-w-0">
                <AlertDialogTitle className="font-mono text-lg">
                  {viewRow?.code}
                </AlertDialogTitle>
                <AlertDialogDescription>{viewRow?.label}</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          {viewRow && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Type" value={viewRow.discount_type.replace("_", " ")} />
              <Detail label="Discount" value={discountLabel(viewRow)} />
              <Detail
                label="Min order"
                value={
                  viewRow.min_subtotal_pkr
                    ? `Rs ${viewRow.min_subtotal_pkr.toLocaleString("en-PK")}`
                    : "None"
                }
              />
              <Detail
                label="Max discount"
                value={
                  viewRow.max_discount_pkr
                    ? `Rs ${viewRow.max_discount_pkr.toLocaleString("en-PK")}`
                    : "—"
                }
              />
              <Detail
                label="Usage"
                value={`${viewRow.usage_count}${viewRow.usage_limit != null ? " / " + viewRow.usage_limit : ""}`}
              />
              <Detail label="Per user" value={String(viewRow.per_user_limit)} />
              <Detail label="Starts" value={fmtDate(viewRow.starts_at)} />
              <Detail label="Expires" value={fmtDate(viewRow.expires_at)} />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the coupon. Any past redemptions stay recorded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function usagePct(c: CouponRow): number | null {
  if (c.usage_limit == null || c.usage_limit <= 0) return null;
  return Math.min(100, Math.round((c.usage_count / c.usage_limit) * 100));
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold capitalize">{value}</div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone = "default",
  loading,
  className,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "default" | "success" | "warn" | "danger" | "muted";
  loading?: boolean;
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success-foreground",
    warn: "bg-warning/15 text-warning-foreground",
    danger: "bg-destructive/15 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
            tones[tone],
          )}
          aria-hidden
        >
          {icon}
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24 rounded" />
      ) : (
        <div className="mt-1 font-display text-2xl font-black leading-none tabular-nums">
          {value}
        </div>
      )}
    </div>
  );
}

function MobileCouponCard({
  c,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onToggle,
  toggling,
}: {
  c: CouponRow;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggle: () => void;
  toggling: boolean;
}) {
  const status = statusOf(c);
  const exp = expiryLabel(c);
  const pct = usagePct(c);
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-1)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-black">{c.code}</span>
            <Badge
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                STATUS_CLASS[status],
              )}
            >
              <span
                className={cn("mr-1 inline-block h-1.5 w-1.5 rounded-full", STATUS_DOT[status])}
                aria-hidden
              />
              {status}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.label}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl">
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 font-semibold">
          <TypeIcon type={c.discount_type} className="h-3.5 w-3.5" />
          <span className="capitalize">{c.discount_type.replace("_", " ")}</span>
        </span>
        <span className="font-semibold tabular-nums">{discountLabel(c)}</span>
      </div>

      {pct != null && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{c.usage_count}</span>
              {c.usage_limit != null ? ` / ${c.usage_limit} uses` : ""}
            </span>
            <span>{pct}%</span>
          </div>
          <div
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(
                "h-full transition-all",
                pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-warning" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Expires {fmtDate(c.expires_at)}</span>
        {exp && (
          <span
            className={cn(
              "font-semibold",
              exp.tone === "danger" && "text-destructive",
              exp.tone === "warn" && "text-warning-foreground",
              exp.tone === "muted" && "text-muted-foreground",
            )}
          >
            {exp.text}
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-9 flex-1 rounded-lg"
          disabled={toggling}
          onClick={onToggle}
        >
          <Power className="h-3.5 w-3.5" />
          {c.is_active ? "Disable" : "Enable"}
        </Button>
        <Button size="sm" className="h-9 flex-1 rounded-lg" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/40 bg-card p-8 text-center shadow-[var(--shadow-1)]">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="mt-3 font-display text-base font-bold">Couldn&apos;t load coupons</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Something went wrong on our side. Please try again in a moment.
      </p>
      <Button size="sm" className="mt-4 rounded-xl" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function EmptyState({
  onCreate,
  filtered,
  onClear,
}: {
  onCreate: () => void;
  filtered: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-12 text-center shadow-[var(--shadow-1)]">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted">
        <Ticket className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="mt-4 font-display text-lg font-black">
        {filtered ? "No coupons match" : "No coupons yet"}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {filtered
          ? "Try adjusting your filters or clearing them."
          : "Create your first coupon to run a campaign."}
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        {filtered && (
          <Button variant="outline" size="sm" className="rounded-xl" onClick={onClear}>
            <X className="h-3.5 w-3.5" /> Clear filters
          </Button>
        )}
        <Button size="sm" className="rounded-xl" onClick={onCreate}>
          <Plus className="h-4 w-4" /> New coupon
        </Button>
      </div>
    </div>
  );
}

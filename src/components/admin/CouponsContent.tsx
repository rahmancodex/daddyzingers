import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgePercent,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Search,
  Ticket,
  Trash2,
  Truck,
  Wallet,
  Eye,
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

type Filter = "all" | "active" | "expired" | "scheduled" | "inactive";
type SortKey = "recent" | "code" | "usage" | "expiry";

function statusOf(c: CouponRow): "active" | "expired" | "scheduled" | "inactive" {
  const now = Date.now();
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return "expired";
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return "scheduled";
  if (!c.is_active) return "inactive";
  return "active";
}

const STATUS_CLASS: Record<ReturnType<typeof statusOf>, string> = {
  active: "bg-success/15 text-success-foreground",
  scheduled: "bg-info/15 text-info",
  expired: "bg-muted text-muted-foreground",
  inactive: "bg-destructive/15 text-destructive",
};

function discountLabel(c: CouponRow): string {
  if (c.discount_type === "percent") return `${c.percent ?? 0}% off`;
  if (c.discount_type === "flat") return `Rs ${(c.flat_pkr ?? 0).toLocaleString("en-PK")} off`;
  return "Free delivery";
}

function TypeIcon({ type }: { type: CouponRow["discount_type"] }) {
  if (type === "percent") return <BadgePercent className="h-4 w-4" />;
  if (type === "flat") return <Wallet className="h-4 w-4" />;
  return <Truck className="h-4 w-4" />;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CouponsContent() {
  const qc = useQueryClient();
  const fetchList = useServerFn(adminListCoupons);
  const toggleFn = useServerFn(adminToggleCoupon);
  const deleteFn = useServerFn(adminDeleteCoupon);

  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
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
  }, [q.data, search, filter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  React.useEffect(() => {
    setPage(1);
  }, [search, filter, sort]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight md:text-3xl">Coupons</h1>
          <p className="text-sm text-muted-foreground">
            Create, schedule and manage discount codes.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditRow(null);
            setDrawerOpen(true);
          }}
          className="h-10 rounded-xl"
        >
          <Plus className="h-4 w-4" /> New coupon
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, label, description"
            className="h-10 rounded-xl border-transparent bg-muted/60 pl-9 focus-visible:border-input focus-visible:bg-background"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "active", "scheduled", "expired", "inactive"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                filter === f
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {f}
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="ml-2 h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
          >
            <option value="recent">Recent</option>
            <option value="code">Code A→Z</option>
            <option value="usage">Most used</option>
            <option value="expiry">Expiry soonest</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold md:px-6">Code</th>
                <th className="px-2 py-3 font-semibold">Type</th>
                <th className="px-2 py-3 font-semibold">Discount</th>
                <th className="px-2 py-3 font-semibold">Min order</th>
                <th className="px-2 py-3 font-semibold">Usage</th>
                <th className="px-2 py-3 font-semibold">Per user</th>
                <th className="px-2 py-3 font-semibold">Expiry</th>
                <th className="px-2 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold md:px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td colSpan={9} className="px-4 py-3 md:px-6">
                      <Skeleton className="h-6 w-full rounded" />
                    </td>
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center md:px-6">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted">
                        <Ticket className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="font-display text-lg font-black">No coupons</div>
                      <p className="text-xs text-muted-foreground">
                        Create your first coupon to run a campaign.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditRow(null);
                          setDrawerOpen(true);
                        }}
                        className="rounded-xl"
                      >
                        <Plus className="h-4 w-4" /> New coupon
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((c) => {
                  const status = statusOf(c);
                  return (
                    <tr
                      key={c.id}
                      className="border-t border-border/50 transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 md:px-6">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-black">{c.code}</span>
                          <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                            {c.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs font-semibold">
                          <TypeIcon type={c.discount_type} />
                          <span className="capitalize">{c.discount_type.replace("_", " ")}</span>
                        </span>
                      </td>
                      <td className="px-2 py-3 font-semibold tabular-nums">{discountLabel(c)}</td>
                      <td className="px-2 py-3 tabular-nums text-muted-foreground">
                        {c.min_subtotal_pkr
                          ? `Rs ${c.min_subtotal_pkr.toLocaleString("en-PK")}`
                          : "—"}
                      </td>
                      <td className="px-2 py-3 tabular-nums text-muted-foreground">
                        {c.usage_count}
                        {c.usage_limit != null ? ` / ${c.usage_limit}` : ""}
                      </td>
                      <td className="px-2 py-3 tabular-nums text-muted-foreground">
                        {c.per_user_limit}
                      </td>
                      <td className="px-2 py-3 text-xs text-muted-foreground">
                        {fmtDate(c.expires_at)}
                      </td>
                      <td className="px-2 py-3">
                        <Badge
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                            STATUS_CLASS[status],
                          )}
                        >
                          {status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right md:px-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg"
                            onClick={() =>
                              toggleMut.mutate({ id: c.id, is_active: !c.is_active })
                            }
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
                                aria-label="More"
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
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 text-xs text-muted-foreground md:px-6">
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
      </div>

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
            <AlertDialogTitle className="font-mono text-lg">{viewRow?.code}</AlertDialogTitle>
            <AlertDialogDescription>{viewRow?.label}</AlertDialogDescription>
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

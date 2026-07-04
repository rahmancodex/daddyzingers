import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Search, ShoppingBag } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

import {
  adminListOrders,
  type AdminOrderStatus,
} from "@/lib/admin-orders.functions";
import {
  STATUS_DOT,
  STATUS_LABEL,
  STATUS_STYLE,
  formatPKR,
  formatRelative,
} from "@/lib/admin-orders";
import { OrderDetailsDrawer } from "./OrderDetailsDrawer";

type FilterKey = "all" | AdminOrderStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15">
        <ShoppingBag className="h-6 w-6 text-foreground" />
      </div>
      <h3 className="mt-4 font-display text-lg font-black">No orders found</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-t border-border/50 px-6 py-4">
      <Skeleton className="h-4 w-24 rounded-md" />
      <Skeleton className="h-4 w-40 rounded-md" />
      <Skeleton className="h-4 w-16 rounded-md" />
      <div className="flex-1" />
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-4 w-16 rounded-md" />
    </div>
  );
}

export function OrdersContent() {
  const qc = useQueryClient();
  const listOrders = useServerFn(adminListOrders);
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [rawSearch, setRawSearch] = React.useState("");
  const search = useDebounced(rawSearch, 300);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "orders", filter, search],
    queryFn: () =>
      listOrders({
        data: {
          status: filter,
          search: search.trim() || undefined,
        },
      }),
    refetchOnWindowFocus: true,
  });

  // Realtime: any change in orders → invalidate.
  React.useEffect(() => {
    const channel = supabase
      .channel("admin-orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin", "orders"] });
          qc.invalidateQueries({ queryKey: ["admin", "order-stats"] });
          if (selectedId) qc.invalidateQueries({ queryKey: ["admin", "order", selectedId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, selectedId]);

  const rows = q.data ?? [];
  const counts = React.useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: rows.length,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live feed of every order coming through Daddy Zingers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              placeholder="Search order #, name, phone…"
              className="h-10 w-72 rounded-xl border-transparent bg-muted/60 pl-9 focus-visible:border-input focus-visible:bg-background"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => q.refetch()}
            className="rounded-xl"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", q.isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const n = filter === "all" ? counts[f.key] : f.key === filter ? counts[f.key] : undefined;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {f.label}
              {n !== undefined && n > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                    active ? "bg-background/20 text-background" : "bg-muted text-foreground",
                  )}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-1)]">
        {/* Header */}
        <div className="hidden border-b border-border/70 bg-muted/40 px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid md:grid-cols-[140px_1fr_80px_140px_180px_100px]">
          <div>Order</div>
          <div>Customer</div>
          <div>Items</div>
          <div>Total</div>
          <div>Status</div>
          <div className="text-right">Time</div>
        </div>

        {q.isLoading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : q.isError ? (
          <div className="px-6 py-16 text-center">
            <div className="text-sm font-semibold text-destructive">Couldn't load orders</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {(q.error as Error)?.message ?? "Unknown error"}
            </div>
            <Button
              onClick={() => q.refetch()}
              variant="outline"
              size="sm"
              className="mt-4 rounded-xl"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              label={
                search
                  ? `No orders match "${search}" in this view.`
                  : filter === "all"
                    ? "New orders will appear here in real time."
                    : `No ${STATUS_LABEL[filter as AdminOrderStatus].toLowerCase()} orders right now.`
              }
            />
          </div>
        ) : (
          <ul>
            {rows.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelectedId(r.id)}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-3 border-t border-border/50 px-6 py-4 text-left transition-colors hover:bg-muted/40 md:grid-cols-[140px_1fr_80px_140px_180px_100px]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs font-bold">{r.order_number}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground md:hidden">
                      {formatRelative(r.created_at)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {r.customer_name ?? "Guest"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.customer_phone ?? r.customer_email ?? "—"}
                    </div>
                  </div>
                  <div className="hidden text-sm tabular-nums text-muted-foreground md:block">
                    {r.items_count}
                  </div>
                  <div className="hidden text-sm font-semibold tabular-nums md:block">
                    {formatPKR(r.total_pkr)}
                  </div>
                  <div className="hidden md:block">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                        STATUS_STYLE[r.status],
                      )}
                    >
                      <span
                        className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", STATUS_DOT[r.status])}
                      />
                      {STATUS_LABEL[r.status]}
                    </Badge>
                  </div>
                  <div className="hidden text-right text-xs text-muted-foreground md:block">
                    {formatRelative(r.created_at)}
                  </div>

                  {/* mobile summary */}
                  <div className="flex flex-col items-end gap-1 md:hidden">
                    <div className="text-sm font-semibold tabular-nums">
                      {formatPKR(r.total_pkr)}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        STATUS_STYLE[r.status],
                      )}
                    >
                      {STATUS_LABEL[r.status]}
                    </Badge>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <OrderDetailsDrawer
        orderId={selectedId}
        open={!!selectedId}
        onOpenChange={(v) => !v && setSelectedId(null)}
      />
    </div>
  );
}

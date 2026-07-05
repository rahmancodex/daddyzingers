import * as React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useSearch, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Download,
  RefreshCw,
  ShoppingBag,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

import {
  adminListOrders,
  adminBranchesForOrders,
  adminUpdateOrderStatus,
  type AdminOrderRow,
  type AdminOrderStatus,
} from "@/lib/admin-orders.functions";
import {
  STATUS_LABEL,
  STATUS_TONE,
  formatPKR,
  formatRelative,
  nextStatus,
} from "@/lib/admin-orders";

import { PageHeader } from "./ui/page-header";
import { FilterBar, SearchInput } from "./ui/filter-bar";
import { DataTable, TablePagination, type DataColumn } from "./ui/data-table";
import { StatusPill } from "./ui/status-pill";
import {
  DateRangeProvider,
  DateRangePicker,
  useDateRange,
  resolvePreset,
  type DateRangePreset,
} from "./ui/date-range";
import { OrderDetailsDrawer } from "./OrderDetailsDrawer";

type StatusFilter = "all" | AdminOrderStatus;
type CouponFilter = "any" | "yes" | "no";

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All statuses" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const PAYMENT_OPTIONS = [
  { key: "all", label: "Any payment" },
  { key: "cod", label: "Cash on Delivery" },
  { key: "card", label: "Card" },
  { key: "wallet", label: "Wallet" },
  { key: "online", label: "Online" },
];

const FULFILLMENT_OPTIONS = [
  { key: "all", label: "Any type" },
  { key: "delivery", label: "Delivery" },
  { key: "pickup", label: "Pickup" },
  { key: "dine_in", label: "Dine-in" },
];

const COUPON_OPTIONS: { key: CouponFilter; label: string }[] = [
  { key: "any", label: "Any coupon" },
  { key: "yes", label: "Coupon used" },
  { key: "no", label: "No coupon" },
];

const PAGE_SIZE = 25;

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function initials(name: string | null | undefined, fallback = "?") {
  const s = (name ?? "").trim();
  if (!s) return fallback;
  const parts = s.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || fallback;
}

function EmptyOrders({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted">
        <ShoppingBag className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <div className="text-base font-semibold">No orders {filtered ? "match these filters" : "yet"}</div>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          {filtered
            ? "Try widening the date range or clearing filters."
            : "New orders will appear here in real time as customers check out."}
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// URL search-param shape (kept compatible with dashboard KPI deep-links)
// -----------------------------------------------------------------------------
export type OrdersSearch = {
  status?: StatusFilter;
  range?: DateRangePreset;
  q?: string;
};

export function validateOrdersSearch(input: Record<string, unknown>): OrdersSearch {
  const status = (STATUS_OPTIONS.map((s) => s.key) as StatusFilter[]).find(
    (s) => s === input.status,
  );
  const range = (
    ["today", "yesterday", "last_7_days", "last_30_days", "this_month", "last_month"] as const
  ).find((r) => r === input.range);
  const q = typeof input.q === "string" ? input.q : undefined;
  const out: OrdersSearch = {};
  if (status) out.status = status;
  if (range) out.range = range;
  if (q) out.q = q;
  return out;
}

// -----------------------------------------------------------------------------
// CSV export
// -----------------------------------------------------------------------------
function exportCSV(rows: AdminOrderRow[]) {
  const headers = [
    "order_number",
    "created_at",
    "status",
    "customer_name",
    "customer_phone",
    "customer_email",
    "fulfillment_method",
    "payment_method",
    "coupon_code",
    "branch_id",
    "items",
    "subtotal_pkr",
    "delivery_fee_pkr",
    "discount_pkr",
    "total_pkr",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) =>
    [
      r.order_number,
      r.created_at,
      r.status,
      r.customer_name,
      r.customer_phone,
      r.customer_email,
      r.fulfillment_method,
      r.payment_method,
      r.coupon_code,
      r.branch_id,
      r.items_count,
      r.subtotal_pkr,
      r.delivery_fee_pkr,
      r.discount_pkr,
      r.total_pkr,
    ]
      .map(esc)
      .join(","),
  );
  const csv = [headers.join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// -----------------------------------------------------------------------------
// Row quick-action button
// -----------------------------------------------------------------------------
function QuickAdvance({
  order,
  onAdvance,
  pending,
}: {
  order: AdminOrderRow;
  onAdvance: (id: string, next: AdminOrderStatus) => void;
  pending: boolean;
}) {
  const upcoming = nextStatus(order.status);
  if (!upcoming) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            disabled={pending}
            onClick={(e) => {
              e.stopPropagation();
              onAdvance(order.id, upcoming);
            }}
            aria-label={`Advance to ${STATUS_LABEL[upcoming]}`}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          Mark as {STATUS_LABEL[upcoming]}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------
function OrdersContentInner() {
  const qc = useQueryClient();
  const listOrders = useServerFn(adminListOrders);
  const listBranches = useServerFn(adminBranchesForOrders);
  const updateStatus = useServerFn(adminUpdateOrderStatus);

  const search = useSearch({ from: "/admin/orders" });
  const navigate = useNavigate({ from: "/admin/orders" });
  const urlStatus: StatusFilter = search.status ?? "all";
  const urlQ = search.q ?? "";

  const { range, setRange } = useDateRange();

  const initialisedRange = React.useRef(false);
  React.useEffect(() => {
    if (initialisedRange.current) return;
    initialisedRange.current = true;
    if (search.range) {
      const r = resolvePreset(search.range);
      setRange({ preset: search.range, from: r.from, to: r.to });
    }
  }, [search.range, setRange]);

  const [branchId, setBranchId] = React.useState<string>("all");
  const [payment, setPayment] = React.useState<string>("all");
  const [fulfillment, setFulfillment] = React.useState<string>("all");
  const [coupon, setCoupon] = React.useState<CouponFilter>("any");
  const [rawSearch, setRawSearch] = React.useState(urlQ);
  const debouncedSearch = useDebounced(rawSearch, 300);
  const [page, setPage] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(
    () => setPage(1),
    [urlStatus, branchId, payment, fulfillment, coupon, debouncedSearch, range],
  );

  const setStatus = (v: StatusFilter) =>
    navigate({ search: (prev: OrdersSearch) => ({ ...prev, status: v === "all" ? undefined : v }) });

  const branchesQ = useQuery({
    queryKey: ["admin", "orders", "branches"],
    queryFn: () => listBranches(),
    staleTime: 5 * 60_000,
  });

  const q = useQuery({
    queryKey: [
      "admin",
      "orders",
      {
        status: urlStatus,
        branchId,
        payment,
        fulfillment,
        coupon,
        search: debouncedSearch,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
    ],
    queryFn: () =>
      listOrders({
        data: {
          status: urlStatus,
          search: debouncedSearch.trim() || undefined,
          branch_id: branchId === "all" ? null : branchId,
          payment_method: payment === "all" ? null : payment,
          fulfillment_method: fulfillment === "all" ? null : fulfillment,
          coupon_used: coupon,
          date_from: range.from.toISOString(),
          date_to: range.to.toISOString(),
          limit: 500,
          exclude_cancelled: urlStatus === "all",
        },
      }),
    refetchOnWindowFocus: true,
  });
      listOrders({
        data: {
          status: urlStatus,
          search: debouncedSearch.trim() || undefined,
          branch_id: branchId === "all" ? null : branchId,
          payment_method: payment === "all" ? null : payment,
          fulfillment_method: fulfillment === "all" ? null : fulfillment,
          coupon_used: coupon,
          date_from: range.from.toISOString(),
          date_to: range.to.toISOString(),
          limit: 500,
        },
      }),
    refetchOnWindowFocus: true,
  });

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

  const rows: AdminOrderRow[] = q.data ?? [];
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const anyFilterActive =
    urlStatus !== "all" ||
    branchId !== "all" ||
    payment !== "all" ||
    fulfillment !== "all" ||
    coupon !== "any" ||
    debouncedSearch.trim().length > 0;

  const clearAll = () => {
    setStatus("all");
    setBranchId("all");
    setPayment("all");
    setFulfillment("all");
    setCoupon("any");
    setRawSearch("");
  };

  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const advanceMut = useMutation({
    mutationFn: (input: { id: string; status: AdminOrderStatus }) =>
      updateStatus({ data: input }),
    onMutate: ({ id }) => setPendingId(id),
    onSettled: () => setPendingId(null),
    onSuccess: (r) => {
      toast.success(`Order marked as ${r.label}`);
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "order-stats"] });
    },
    onError: (err: Error) => toast.error("Failed to advance", { description: err.message }),
  });

  const columns: DataColumn<AdminOrderRow>[] = [
    {
      id: "order",
      header: "Order",
      alwaysVisible: true,
      cell: (r) => (
        <div className="min-w-0">
          <div className="font-mono text-xs font-bold tracking-tight">{r.order_number}</div>
          <div className="mt-0.5 text-[10.5px] uppercase tracking-wider text-muted-foreground">
            {formatRelative(r.created_at)}
          </div>
        </div>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: (r) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-muted to-muted/60 text-[11px] font-bold text-foreground ring-1 ring-border/60">
            {initials(r.customer_name ?? r.customer_email)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{r.customer_name ?? "Guest"}</div>
            <div className="truncate text-xs text-muted-foreground">
              {r.customer_phone ?? r.customer_email ?? "—"}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "type",
      header: "Type",
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
      cell: (r) => (
        <span className="text-xs capitalize text-muted-foreground">
          {r.fulfillment_method.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      id: "payment",
      header: "Payment",
      defaultVisible: false,
      cell: (r) => <span className="text-xs uppercase text-muted-foreground">{r.payment_method}</span>,
    },
    {
      id: "items",
      header: "Items",
      className: "hidden md:table-cell text-right",
      headerClassName: "hidden md:table-cell text-right",
      cell: (r) => <span className="tabular-nums text-sm text-muted-foreground">{r.items_count}</span>,
    },
    {
      id: "total",
      header: "Total",
      className: "text-right",
      headerClassName: "text-right",
      alwaysVisible: true,
      cell: (r) => (
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums">{formatPKR(r.total_pkr)}</div>
          {r.coupon_code && (
            <div className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Ticket className="h-2.5 w-2.5" /> {r.coupon_code}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      alwaysVisible: true,
      cell: (r) => <StatusPill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</StatusPill>,
    },
    {
      id: "actions",
      header: "",
      alwaysVisible: true,
      headerClassName: "w-16",
      className: "w-16",
      cell: (r) => (
        <div className="flex items-center justify-end gap-0.5">
          <QuickAdvance
            order={r}
            onAdvance={(id, next) => advanceMut.mutate({ id, status: next })}
            pending={pendingId === r.id}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Live feed of every order, with advanced filtering, quick actions and inline editing."
        actions={
          <>
            <DateRangePicker />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportCSV(rows)}
              className="h-9 gap-1.5 rounded-lg"
              disabled={rows.length === 0}
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => q.refetch()}
              className="h-9 w-9 rounded-lg"
              aria-label="Refresh orders"
            >
              <RefreshCw className={cn("h-4 w-4", q.isFetching && "animate-spin")} />
            </Button>
          </>
        }
      />

      <FilterBar>
        <SearchInput
          value={rawSearch}
          onChange={setRawSearch}
          placeholder="Search order #, customer, phone, coupon…"
          className="min-w-[240px]"
        />

        <Select value={urlStatus} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="h-9 w-[160px] rounded-lg text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="h-9 w-[160px] rounded-lg text-sm">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {(branchesQ.data ?? []).map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={fulfillment} onValueChange={setFulfillment}>
          <SelectTrigger className="h-9 w-[140px] rounded-lg text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FULFILLMENT_OPTIONS.map((o) => (
              <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={payment} onValueChange={setPayment}>
          <SelectTrigger className="h-9 w-[160px] rounded-lg text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_OPTIONS.map((o) => (
              <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={coupon} onValueChange={(v) => setCoupon(v as CouponFilter)}>
          <SelectTrigger className="h-9 w-[140px] rounded-lg text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUPON_OPTIONS.map((o) => (
              <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {anyFilterActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-9 rounded-lg text-xs font-semibold text-muted-foreground"
          >
            Clear filters
          </Button>
        )}
      </FilterBar>

      <DataTable
        columns={columns}
        data={paged}
        loading={q.isLoading}
        getRowKey={(r) => r.id}
        onRowClick={(r) => setSelectedId(r.id)}
        emptyState={<EmptyOrders filtered={anyFilterActive} />}
        toolbar={
          <div className="text-xs text-muted-foreground">
            {q.isError ? (
              <span className="text-destructive">Couldn't load orders — {(q.error as Error)?.message}</span>
            ) : (
              <>
                <span className="font-semibold text-foreground tabular-nums">{rows.length}</span>{" "}
                {rows.length === 1 ? "order" : "orders"} in view
              </>
            )}
          </div>
        }
      />

      <TablePagination
        page={page}
        pageCount={pageCount}
        onPage={setPage}
        totalLabel={
          rows.length > 0
            ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, rows.length)} of ${rows.length}`
            : "No results"
        }
      />

      <OrderDetailsDrawer
        orderId={selectedId}
        open={!!selectedId}
        onOpenChange={(v) => !v && setSelectedId(null)}
      />
    </div>
  );
}

export function OrdersContent() {
  return (
    <DateRangeProvider>
      <OrdersContentInner />
    </DateRangeProvider>
  );
}

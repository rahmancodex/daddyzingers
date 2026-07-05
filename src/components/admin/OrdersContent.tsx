import * as React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useSearch, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Download,
  MoreVertical,
  RefreshCw,
  ShoppingBag,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// Statuses that make sense as a quick-change target from a row menu.
const QUICK_SET_STATUSES: AdminOrderStatus[] = [
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
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
        <div className="text-base font-semibold">
          No orders {filtered ? "match these filters" : "yet"}
        </div>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          {filtered
            ? "Try widening the date range or clearing filters."
            : "New orders will appear here in real time as customers check out."}
        </p>
      </div>
    </div>
  );
}

function ErrorOrders({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive/15 text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>
      <div className="max-w-sm space-y-1">
        <div className="text-base font-semibold text-foreground">Couldn't load orders</div>
        <p className="text-xs text-muted-foreground">
          Something interrupted the connection. This is usually a temporary hiccup — retry to try
          again.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry} className="rounded-lg">
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </Button>
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
// Row quick actions — visible advance button + status dropdown.
// Visible always on mobile; fades in on hover on desktop for the advance icon.
// -----------------------------------------------------------------------------
function RowActions({
  order,
  onSet,
  pending,
}: {
  order: AdminOrderRow;
  onSet: (id: string, next: AdminOrderStatus) => void;
  pending: boolean;
}) {
  const upcoming = nextStatus(order.status);
  const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();

  return (
    <div className="flex items-center justify-end gap-0.5" onClick={stop}>
      {upcoming && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-md text-muted-foreground opacity-100 transition-opacity hover:text-foreground md:opacity-0 md:group-hover:opacity-100"
                disabled={pending}
                onClick={(e) => {
                  e.stopPropagation();
                  onSet(order.id, upcoming);
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
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Row actions"
            disabled={pending}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 rounded-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuLabel className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Set status
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {QUICK_SET_STATUSES.map((s) => (
            <DropdownMenuItem
              key={s}
              disabled={pending || order.status === s}
              onSelect={(e) => {
                e.preventDefault();
                onSet(order.id, s);
              }}
              className="gap-2 text-xs"
            >
              <StatusPill tone={STATUS_TONE[s]}>{STATUS_LABEL[s]}</StatusPill>
              {order.status === s && (
                <span className="ml-auto text-[10px] uppercase text-muted-foreground">Current</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Mobile card list — replaces the table on small screens.
// -----------------------------------------------------------------------------
function MobileOrderCards({
  rows,
  loading,
  onRowClick,
  onSet,
  pendingId,
  branchNameMap,
  emptyState,
}: {
  rows: AdminOrderRow[];
  loading: boolean;
  onRowClick: (row: AdminOrderRow) => void;
  onSet: (id: string, next: AdminOrderStatus) => void;
  pendingId: string | null;
  branchNameMap: Map<string, string>;
  emptyState: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-border/60 bg-card"
          />
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card">{emptyState}</div>
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const branchName = r.branch_id ? branchNameMap.get(r.branch_id) : null;
        return (
          <li
            key={r.id}
            className="group rounded-2xl border border-border/60 bg-card p-3 shadow-[0_1px_2px_-1px_hsl(var(--foreground)/0.06)] transition-colors active:bg-muted/50"
          >
            <button
              type="button"
              onClick={() => onRowClick(r)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 text-left"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-muted to-muted/60 text-[11px] font-bold ring-1 ring-border/60">
                  {initials(r.customer_name ?? r.customer_email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-[11px] font-bold tracking-tight">
                      {r.order_number}
                    </span>
                    <StatusPill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</StatusPill>
                  </div>
                  <div className="mt-0.5 truncate text-sm font-semibold">
                    {r.customer_name ?? "Guest"}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {r.customer_phone ?? r.customer_email ?? "—"}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between gap-1">
                <div className="text-sm font-semibold tabular-nums">
                  {formatPKR(r.total_pkr)}
                </div>
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  {formatRelative(r.created_at)}
                </div>
              </div>
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2 text-[10.5px] text-muted-foreground">
              <span className="capitalize">{r.fulfillment_method.replace(/_/g, " ")}</span>
              <span className="opacity-40">·</span>
              <span className="uppercase">{r.payment_method}</span>
              {branchName && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="truncate">{branchName}</span>
                </>
              )}
              {r.coupon_code && (
                <span className="ml-1 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  <Ticket className="h-2.5 w-2.5" />
                  {r.coupon_code}
                </span>
              )}
              <div className="ml-auto">
                <RowActions
                  order={r}
                  onSet={onSet}
                  pending={pendingId === r.id}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
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
  const [filtersOpen, setFiltersOpen] = React.useState(false);

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
  const branchNameMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const b of branchesQ.data ?? []) m.set(b.id, b.name);
    return m;
  }, [branchesQ.data]);

  const activeFilterCount =
    (urlStatus !== "all" ? 1 : 0) +
    (branchId !== "all" ? 1 : 0) +
    (payment !== "all" ? 1 : 0) +
    (fulfillment !== "all" ? 1 : 0) +
    (coupon !== "any" ? 1 : 0) +
    (debouncedSearch.trim().length > 0 ? 1 : 0);
  const anyFilterActive = activeFilterCount > 0;

  const clearAll = () => {
    setStatus("all");
    setBranchId("all");
    setPayment("all");
    setFulfillment("all");
    setCoupon("any");
    setRawSearch("");
  };

  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const setStatusMut = useMutation({
    mutationFn: (input: { id: string; status: AdminOrderStatus }) =>
      updateStatus({ data: input }),
    onMutate: ({ id }) => setPendingId(id),
    onSettled: () => setPendingId(null),
    onSuccess: (r) => {
      toast.success(`Order marked as ${r.label}`);
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "order-stats"] });
    },
    onError: (err: Error) => toast.error("Failed to update status", { description: err.message }),
  });

  const handleSet = React.useCallback(
    (id: string, next: AdminOrderStatus) => setStatusMut.mutate({ id, status: next }),
    [setStatusMut],
  );

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
      id: "branch",
      header: "Branch",
      className: "hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
      cell: (r) => (
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border/60">
          {r.branch_id ? branchNameMap.get(r.branch_id) ?? "—" : "—"}
        </span>
      ),
    },
    {
      id: "payment",
      header: "Payment",
      defaultVisible: false,
      cell: (r) => (
        <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-inset ring-border/60">
          {r.payment_method}
        </span>
      ),
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
      headerClassName: "w-24",
      className: "w-24",
      cell: (r) => <RowActions order={r} onSet={handleSet} pending={pendingId === r.id} />,
    },
  ];

  const filterControls = (
    <>
      <SearchInput
        value={rawSearch}
        onChange={setRawSearch}
        placeholder="Search order #, customer, phone, coupon…"
        className="col-span-2 w-full min-w-0 sm:col-span-1 sm:min-w-[240px] sm:flex-1"
      />

      <Select value={urlStatus} onValueChange={(v) => setStatus(v as StatusFilter)}>
        <SelectTrigger className="h-9 rounded-lg text-sm sm:w-[160px] sm:flex-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.key} value={o.key}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={branchId} onValueChange={setBranchId}>
        <SelectTrigger className="h-9 rounded-lg text-sm sm:w-[160px] sm:flex-none">
          <SelectValue placeholder="Branch" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All branches</SelectItem>
          {(branchesQ.data ?? []).map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={fulfillment} onValueChange={setFulfillment}>
        <SelectTrigger className="h-9 rounded-lg text-sm sm:w-[140px] sm:flex-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FULFILLMENT_OPTIONS.map((o) => (
            <SelectItem key={o.key} value={o.key}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={payment} onValueChange={setPayment}>
        <SelectTrigger className="h-9 rounded-lg text-sm sm:w-[160px] sm:flex-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_OPTIONS.map((o) => (
            <SelectItem key={o.key} value={o.key}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={coupon} onValueChange={(v) => setCoupon(v as CouponFilter)}>
        <SelectTrigger className="h-9 rounded-lg text-sm sm:w-[140px] sm:flex-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUPON_OPTIONS.map((o) => (
            <SelectItem key={o.key} value={o.key}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {anyFilterActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="col-span-2 h-9 rounded-lg text-xs font-semibold text-muted-foreground sm:col-span-1 sm:w-auto"
        >
          Clear filters
        </Button>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      {/* Sticky page header + filters stack */}
      <div className="sticky top-0 z-20 -mx-3 space-y-3 border-b border-border/60 bg-background/85 px-3 pb-3 pt-1 backdrop-blur sm:-mx-4 sm:px-4 md:-mx-6 md:px-6">
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
                className="hidden h-9 gap-1.5 rounded-lg sm:inline-flex"
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

        {/* Mobile filters trigger — keeps the sticky area compact on small screens. */}
        <div className="flex items-center gap-2 sm:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 flex-1 justify-between rounded-lg"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <span className="text-xs font-semibold">
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-lg"
            onClick={() => exportCSV(rows)}
            disabled={rows.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Desktop: filters always visible. Mobile: collapsible grid. */}
        <div className={cn("sm:block", filtersOpen ? "block" : "hidden")}>
          <FilterBar className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {filterControls}
          </FilterBar>
        </div>
      </div>

      {/* Error state (replaces table body when the query fails) */}
      {q.isError ? (
        <ErrorOrders onRetry={() => q.refetch()} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={paged}
              loading={q.isLoading}
              getRowKey={(r) => r.id}
              onRowClick={(r) => setSelectedId(r.id)}
              emptyState={<EmptyOrders filtered={anyFilterActive} />}
              toolbar={
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">{rows.length}</span>{" "}
                  {rows.length === 1 ? "order" : "orders"} in view
                </div>
              }
            />
          </div>

          {/* Mobile card list */}
          <div className="md:hidden">
            <div className="mb-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground tabular-nums">{rows.length}</span>{" "}
                {rows.length === 1 ? "order" : "orders"}
              </span>
              {q.isFetching && !q.isLoading && (
                <span className="inline-flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Updating
                </span>
              )}
            </div>
            <MobileOrderCards
              rows={paged}
              loading={q.isLoading}
              onRowClick={(r) => setSelectedId(r.id)}
              onSet={handleSet}
              pendingId={pendingId}
              branchNameMap={branchNameMap}
              emptyState={<EmptyOrders filtered={anyFilterActive} />}
            />
          </div>

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
        </>
      )}

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

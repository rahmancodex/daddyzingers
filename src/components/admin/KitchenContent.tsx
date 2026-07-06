import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertCircle,
  Bike,
  CalendarClock,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock,
  Filter,
  Flame,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Timer,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  orderAgeMinutes,
  orderPriority,
} from "@/lib/admin-orders-derived";
import { PageHeader } from "./ui/page-header";
import { OrderDetailsDrawer } from "./OrderDetailsDrawer";

// ---------- KDS column model ----------
type KColumn = {
  key: "pending" | "confirmed" | "preparing" | "ready" | "completed";
  label: string;
  statuses: AdminOrderStatus[];
  action?: { label: string; to: AdminOrderStatus };
  tone: string; // header tint
};

const COLUMNS: KColumn[] = [
  {
    key: "pending",
    label: "Pending",
    statuses: ["pending"],
    action: { label: "Accept", to: "confirmed" },
    tone: "border-warning/40 bg-warning/5",
  },
  {
    key: "confirmed",
    label: "Confirmed",
    statuses: ["confirmed"],
    action: { label: "Start Preparing", to: "preparing" },
    tone: "border-info/40 bg-info/5",
  },
  {
    key: "preparing",
    label: "Preparing",
    statuses: ["preparing"],
    action: { label: "Mark Ready", to: "ready" },
    tone: "border-info/60 bg-info/10",
  },
  {
    key: "ready",
    label: "Ready",
    statuses: ["ready"],
    action: { label: "Complete", to: "delivered" },
    tone: "border-primary/60 bg-primary/10",
  },
  {
    key: "completed",
    label: "Completed",
    statuses: ["out_for_delivery", "delivered"],
    tone: "border-success/40 bg-success/5",
  },
];

// Bulk-eligible transitions (source → target).
const BULK_TRANSITIONS: {
  key: "preparing" | "ready" | "completed";
  label: string;
  from: AdminOrderStatus[];
  to: AdminOrderStatus;
}[] = [
  { key: "preparing", label: "Preparing", from: ["pending", "confirmed"], to: "preparing" },
  { key: "ready", label: "Ready", from: ["preparing"], to: "ready" },
  { key: "completed", label: "Completed", from: ["ready", "out_for_delivery"], to: "delivered" },
];

// ---------- filter persistence ----------
type KFilters = {
  branchId: string;
  fulfillment: "all" | "delivery" | "pickup" | "dine_in";
  priority: "all" | "urgent" | "high" | "normal";
  scheduled: "all" | "scheduled" | "asap";
  showCancelled: boolean;
  search: string;
  soundOn: boolean;
};

const FILTERS_KEY = "kds.filters.v1";
const DEFAULT_FILTERS: KFilters = {
  branchId: "all",
  fulfillment: "all",
  priority: "all",
  scheduled: "all",
  showCancelled: false,
  search: "",
  soundOn: false,
};

function loadFilters(): KFilters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  try {
    const raw = window.localStorage.getItem(FILTERS_KEY);
    if (!raw) return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...(JSON.parse(raw) as Partial<KFilters>) };
  } catch {
    return DEFAULT_FILTERS;
  }
}

// A single ticker that fires every 15s so all cards recompute elapsed
// minutes without setting a timer per card.
function useTicker(ms = 15_000) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

function elapsedColor(min: number): string {
  if (min < 5) return "text-emerald-600 dark:text-emerald-400";
  if (min < 15) return "text-amber-600 dark:text-amber-400";
  if (min < 25) return "text-orange-600 dark:text-orange-400";
  return "text-destructive";
}

function fmtElapsed(min: number): string {
  if (min < 1) return "just now";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function fmtScheduled(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// WebAudio "ding" — no bundled asset needed.
function playDing() {
  try {
    const AC: typeof AudioContext | undefined =
      typeof window !== "undefined"
        ? window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    };
    beep(880, 0, 0.18);
    beep(1320, 0.18, 0.22);
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    /* ignore */
  }
}

// ---------- Card ----------
const OrderCard = React.memo(function OrderCard({
  row,
  branchName,
  selected,
  onToggleSelect,
  onOpen,
  onAction,
  pendingAction,
  columnAction,
}: {
  row: AdminOrderRow;
  branchName: string | null;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onAction: (id: string, to: AdminOrderStatus) => void;
  pendingAction: boolean;
  columnAction?: { label: string; to: AdminOrderStatus };
}) {
  const elapsed = orderAgeMinutes(row.created_at);
  const prio = orderPriority(row);
  const isDelivery = row.fulfillment_method === "delivery";
  const isScheduled = !!row.schedule_at;

  return (
    <article
      className={cn(
        "group relative rounded-xl border bg-card p-3 shadow-sm ring-1 ring-inset transition motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2",
        selected
          ? "ring-primary/60 border-primary/60"
          : "ring-transparent hover:ring-border/80",
        isDelivery ? "border-l-[3px] border-l-blue-500" : "border-l-[3px] border-l-amber-500",
        prio === "urgent" && "shadow-[0_0_0_1px_hsl(var(--destructive)/0.35)]",
      )}
      aria-label={`Order ${row.order_number}, ${row.status}, ${row.customer_name ?? "Guest"}`}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(row.id)}
          aria-label={`Select order ${row.order_number}`}
          className="mt-0.5"
        />
        <button
          type="button"
          onClick={() => onOpen(row.id)}
          className="flex-1 min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
          aria-label={`Open details for order ${row.order_number}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight">
                #{row.order_number}
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {row.customer_name ?? "Guest"}
              </div>
            </div>
            <div
              className={cn(
                "shrink-0 text-right",
                elapsedColor(elapsed),
              )}
              aria-live="polite"
              aria-label={`Elapsed ${fmtElapsed(elapsed)}`}
            >
              <div className="flex items-center gap-1 text-xs font-bold tabular-nums">
                <Timer className="h-3 w-3" aria-hidden />
                {fmtElapsed(elapsed)}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "gap-1 border-0 text-[10px] font-semibold uppercase tracking-wide",
                isDelivery
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
              )}
            >
              {isDelivery ? <Bike className="h-3 w-3" /> : <Package className="h-3 w-3" />}
              {isDelivery ? "Delivery" : row.fulfillment_method === "pickup" ? "Pickup" : row.fulfillment_method}
            </Badge>
            {branchName && (
              <Badge variant="outline" className="gap-1 text-[10px] font-medium">
                {branchName}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1 text-[10px] font-medium">
              <ClipboardList className="h-3 w-3" />
              {row.items_count} item{row.items_count === 1 ? "" : "s"}
            </Badge>
            {prio !== "normal" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  PRIORITY_CLASS[prio],
                )}
                aria-label={`Priority ${PRIORITY_LABEL[prio]}`}
              >
                <Flame className="h-2.5 w-2.5" />
                {PRIORITY_LABEL[prio]}
              </span>
            )}
            {isScheduled && (
              <Badge
                variant="outline"
                className="gap-1 text-[10px] font-medium border-purple-500/40 text-purple-700 dark:text-purple-300"
              >
                <CalendarClock className="h-3 w-3" />
                {fmtScheduled(row.schedule_at!)}
              </Badge>
            )}
          </div>

          {row.special_instructions && (
            <div className="mt-2 rounded-md bg-muted/70 px-2 py-1.5 text-[11px] leading-snug text-foreground/80">
              <span className="font-semibold">Note: </span>
              {row.special_instructions}
            </div>
          )}
        </button>
      </div>

      {columnAction && (
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            className="h-9 min-w-[7.5rem]"
            disabled={pendingAction}
            onClick={(e) => {
              e.stopPropagation();
              onAction(row.id, columnAction.to);
            }}
            aria-label={`${columnAction.label} order ${row.order_number}`}
          >
            {pendingAction ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {columnAction.label}
          </Button>
        </div>
      )}
    </article>
  );
});

// ---------- Column ----------
function Column({
  col,
  rows,
  branchNameMap,
  selection,
  onToggleSelect,
  onOpen,
  onAction,
  pendingId,
}: {
  col: KColumn;
  rows: AdminOrderRow[];
  branchNameMap: Map<string, string>;
  selection: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onAction: (id: string, to: AdminOrderStatus) => void;
  pendingId: string | null;
}) {
  return (
    <section
      className={cn(
        "flex min-h-[240px] flex-col rounded-2xl border",
        col.tone,
      )}
      aria-label={`${col.label} column, ${rows.length} orders`}
    >
      <header className="sticky top-0 z-[1] flex items-center justify-between rounded-t-2xl border-b bg-background/85 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>{col.label}</span>
          <Badge variant="secondary" className="tabular-nums">
            {rows.length}
          </Badge>
        </div>
      </header>
      <div className="flex flex-col gap-2 p-2">
        {rows.length === 0 ? (
          <div className="grid place-items-center py-10 text-xs text-muted-foreground">
            No orders
          </div>
        ) : (
          rows.map((r) => (
            <OrderCard
              key={r.id}
              row={r}
              branchName={r.branch_id ? branchNameMap.get(r.branch_id) ?? null : null}
              selected={selection.has(r.id)}
              onToggleSelect={onToggleSelect}
              onOpen={onOpen}
              onAction={onAction}
              pendingAction={pendingId === r.id}
              columnAction={col.action}
            />
          ))
        )}
      </div>
    </section>
  );
}

// ---------- Main ----------
export function KitchenContent() {
  const qc = useQueryClient();
  const listOrders = useServerFn(adminListOrders);
  const listBranches = useServerFn(adminBranchesForOrders);
  const updateStatus = useServerFn(adminUpdateOrderStatus);

  // Live timers — one interval, all cards re-render.
  useTicker(15_000);

  const [filters, setFilters] = React.useState<KFilters>(() => loadFilters());
  React.useEffect(() => {
    try {
      window.localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    } catch {
      /* ignore */
    }
  }, [filters]);

  const [selection, setSelection] = React.useState<Set<string>>(new Set());
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [mobileCol, setMobileCol] = React.useState<KColumn["key"]>("pending");
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const branchesQ = useQuery({
    queryKey: ["admin", "orders", "branches"],
    queryFn: () => listBranches(),
    staleTime: 5 * 60_000,
  });

  // Last 24h window is plenty for a live production board.
  const dateFrom = React.useMemo(
    () => new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
    [],
  );

  const ordersQ = useQuery({
    queryKey: ["admin", "orders", "kds", { from: dateFrom }],
    queryFn: () =>
      listOrders({
        data: {
          status: "all",
          date_from: dateFrom,
          limit: 500,
          exclude_cancelled: false,
        },
      }),
    refetchOnWindowFocus: true,
  });

  // Realtime — dedicated channel; only mounted with this page.
  React.useEffect(() => {
    const channel = supabase
      .channel("admin-kds-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin", "orders"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // Sound on new pending orders.
  const seenIdsRef = React.useRef<Set<string> | null>(null);
  React.useEffect(() => {
    const rows = ordersQ.data ?? [];
    const ids = new Set(rows.map((r) => r.id));
    if (seenIdsRef.current == null) {
      seenIdsRef.current = ids;
      return;
    }
    if (filters.soundOn) {
      const isNewPending = rows.some(
        (r) => r.status === "pending" && !seenIdsRef.current!.has(r.id),
      );
      if (isNewPending) playDing();
    }
    seenIdsRef.current = ids;
  }, [ordersQ.data, filters.soundOn]);

  const branchNameMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const b of branchesQ.data ?? []) m.set(b.id, b.name);
    return m;
  }, [branchesQ.data]);

  const rows = ordersQ.data ?? [];

  const filteredRows = React.useMemo(() => {
    const s = filters.search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.branchId !== "all" && r.branch_id !== filters.branchId) return false;
      if (filters.fulfillment !== "all" && r.fulfillment_method !== filters.fulfillment)
        return false;
      if (filters.scheduled === "scheduled" && !r.schedule_at) return false;
      if (filters.scheduled === "asap" && r.schedule_at) return false;
      if (filters.priority !== "all" && orderPriority(r) !== filters.priority) return false;
      if (s) {
        const hay = `${r.order_number} ${r.customer_name ?? ""} ${r.customer_phone ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, filters]);

  const byColumn = React.useMemo(() => {
    const map: Record<KColumn["key"], AdminOrderRow[]> = {
      pending: [],
      confirmed: [],
      preparing: [],
      ready: [],
      completed: [],
    };
    const cancelled: AdminOrderRow[] = [];
    for (const r of filteredRows) {
      if (r.status === "cancelled") {
        cancelled.push(r);
        continue;
      }
      const col = COLUMNS.find((c) => c.statuses.includes(r.status));
      if (col) map[col.key].push(r);
    }
    return { map, cancelled };
  }, [filteredRows]);

  const setStatusMut = useMutation({
    mutationFn: (v: { id: string; status: AdminOrderStatus }) => updateStatus({ data: v }),
    onMutate: ({ id }) => setPendingId(id),
    onSettled: () => setPendingId(null),
    onSuccess: (r) => {
      toast.success(`Marked as ${r.label}`);
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (e: Error) =>
      toast.error("Update failed", { description: e.message }),
  });

  const bulkMut = useMutation({
    mutationFn: async (v: { ids: string[]; status: AdminOrderStatus }) => {
      const results = await Promise.allSettled(
        v.ids.map((id) => updateStatus({ data: { id, status: v.status } })),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      return { ok, fail: results.length - ok, status: v.status };
    },
    onSuccess: ({ ok, fail, status }) => {
      if (fail === 0) toast.success(`Updated ${ok} order${ok === 1 ? "" : "s"} → ${status}`);
      else toast.warning(`Updated ${ok}, ${fail} failed`);
      setSelection(new Set());
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (e: Error) => toast.error("Bulk update failed", { description: e.message }),
  });

  const toggleSelect = React.useCallback((id: string) => {
    setSelection((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const handleAction = React.useCallback(
    (id: string, to: AdminOrderStatus) => setStatusMut.mutate({ id, status: to }),
    [setStatusMut],
  );

  // Bulk button eligibility
  const rowsById = React.useMemo(() => {
    const m = new Map<string, AdminOrderRow>();
    for (const r of filteredRows) m.set(r.id, r);
    return m;
  }, [filteredRows]);

  const bulkEligibleIds = React.useCallback(
    (t: (typeof BULK_TRANSITIONS)[number]) =>
      Array.from(selection).filter((id) => {
        const r = rowsById.get(id);
        return r ? t.from.includes(r.status) : false;
      }),
    [selection, rowsById],
  );

  const anyFilterActive =
    filters.branchId !== "all" ||
    filters.fulfillment !== "all" ||
    filters.priority !== "all" ||
    filters.scheduled !== "all" ||
    filters.showCancelled ||
    filters.search.trim().length > 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kitchen Display"
        description="Live production board — accept, prep and complete orders in one click."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filters.soundOn ? "default" : "outline"}
              onClick={() =>
                setFilters((f) => {
                  const next = { ...f, soundOn: !f.soundOn };
                  if (next.soundOn) playDing();
                  return next;
                })
              }
              aria-pressed={filters.soundOn}
              aria-label={filters.soundOn ? "Disable new order sound" : "Enable new order sound"}
              className="h-9"
            >
              {filters.soundOn ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {filters.soundOn ? "Sound on" : "Sound off"}
              </span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => ordersQ.refetch()}
              aria-label="Refresh orders"
              className="h-9"
            >
              <RefreshCw className={cn("h-4 w-4", ordersQ.isFetching && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      {/* Filter bar */}
      <div className="rounded-2xl border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search order # or customer"
              aria-label="Search kitchen orders"
              className="h-9 pl-8"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-9 sm:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>

          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              filtersOpen ? "w-full" : "hidden sm:flex",
            )}
          >
            <Select
              value={filters.branchId}
              onValueChange={(v) => setFilters((f) => ({ ...f, branchId: v }))}
            >
              <SelectTrigger className="h-9 w-[9rem]" aria-label="Filter by branch">
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

            <Select
              value={filters.fulfillment}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, fulfillment: v as KFilters["fulfillment"] }))
              }
            >
              <SelectTrigger className="h-9 w-[8rem]" aria-label="Filter by fulfillment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any type</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="dine_in">Dine-in</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.priority}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, priority: v as KFilters["priority"] }))
              }
            >
              <SelectTrigger className="h-9 w-[8rem]" aria-label="Filter by priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.scheduled}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, scheduled: v as KFilters["scheduled"] }))
              }
            >
              <SelectTrigger className="h-9 w-[9rem]" aria-label="Filter by scheduled">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All timing</SelectItem>
                <SelectItem value="asap">ASAP</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>

            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={filters.showCancelled}
                onCheckedChange={(v) =>
                  setFilters((f) => ({ ...f, showCancelled: v === true }))
                }
                aria-label="Show cancelled orders"
              />
              <span className="text-muted-foreground">Show cancelled</span>
            </label>

            {anyFilterActive && (
              <Button
                size="sm"
                variant="ghost"
                className="h-9"
                onClick={() =>
                  setFilters({ ...DEFAULT_FILTERS, soundOn: filters.soundOn })
                }
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Bulk actions bar */}
        {selection.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
            <span className="font-medium">
              {selection.size} selected
            </span>
            <div className="flex-1" />
            {BULK_TRANSITIONS.map((t) => {
              const eligible = bulkEligibleIds(t);
              return (
                <Button
                  key={t.key}
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={eligible.length === 0 || bulkMut.isPending}
                  onClick={() => bulkMut.mutate({ ids: eligible, status: t.to })}
                  aria-label={`Mark ${eligible.length} orders as ${t.label}`}
                >
                  → {t.label}
                  {eligible.length > 0 && (
                    <Badge variant="secondary" className="ml-1 tabular-nums">
                      {eligible.length}
                    </Badge>
                  )}
                </Button>
              );
            })}
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => setSelection(new Set())}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Body */}
      {ordersQ.isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      ) : ordersQ.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div className="text-sm font-medium">Couldn't load kitchen orders.</div>
          <Button size="sm" variant="outline" onClick={() => ordersQ.refetch()}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          <div>
            <div className="text-sm font-semibold">
              {anyFilterActive ? "No orders match your filters" : "No active orders"}
            </div>
            <p className="text-xs text-muted-foreground">
              {anyFilterActive
                ? "Clear filters to see everything from the last 24 hours."
                : "New orders will appear here in real time."}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: tabs switch column, no horizontal scroll */}
          <div className="md:hidden">
            <Tabs
              value={mobileCol}
              onValueChange={(v) => setMobileCol(v as KColumn["key"])}
            >
              <TabsList className="w-full overflow-x-auto">
                {COLUMNS.map((c) => (
                  <TabsTrigger key={c.key} value={c.key} className="flex-1 gap-1.5">
                    <span>{c.label}</span>
                    <Badge variant="secondary" className="tabular-nums">
                      {byColumn.map[c.key].length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="mt-3">
              {COLUMNS.filter((c) => c.key === mobileCol).map((c) => (
                <Column
                  key={c.key}
                  col={c}
                  rows={byColumn.map[c.key]}
                  branchNameMap={branchNameMap}
                  selection={selection}
                  onToggleSelect={toggleSelect}
                  onOpen={setOpenId}
                  onAction={handleAction}
                  pendingId={pendingId}
                />
              ))}
            </div>
          </div>

          {/* Tablet+ grid */}
          <div className="hidden gap-3 md:grid md:grid-cols-3 xl:grid-cols-5">
            {COLUMNS.map((c) => (
              <Column
                key={c.key}
                col={c}
                rows={byColumn.map[c.key]}
                branchNameMap={branchNameMap}
                selection={selection}
                onToggleSelect={toggleSelect}
                onOpen={setOpenId}
                onAction={handleAction}
                pendingId={pendingId}
              />
            ))}
          </div>

          {filters.showCancelled && byColumn.cancelled.length > 0 && (
            <section
              className="mt-2 rounded-2xl border border-destructive/30 bg-destructive/5"
              aria-label={`Cancelled orders, ${byColumn.cancelled.length}`}
            >
              <header className="flex items-center justify-between border-b px-3 py-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <X className="h-4 w-4 text-destructive" />
                  Cancelled
                  <Badge variant="secondary" className="tabular-nums">
                    {byColumn.cancelled.length}
                  </Badge>
                </div>
              </header>
              <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {byColumn.cancelled.map((r) => (
                  <OrderCard
                    key={r.id}
                    row={r}
                    branchName={r.branch_id ? branchNameMap.get(r.branch_id) ?? null : null}
                    selected={selection.has(r.id)}
                    onToggleSelect={toggleSelect}
                    onOpen={setOpenId}
                    onAction={handleAction}
                    pendingAction={pendingId === r.id}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <OrderDetailsDrawer
        orderId={openId}
        open={!!openId}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
    </div>
  );
}

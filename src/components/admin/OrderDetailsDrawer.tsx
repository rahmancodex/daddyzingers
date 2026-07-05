import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock,
  Copy,
  History,
  Loader2,
  MapPin,
  Minus,
  Package,
  Pencil,
  Phone,
  Plus,
  Receipt,
  ShoppingBag,
  Sparkles,
  StickyNote,
  Ticket,
  Trash2,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  adminGetOrder,
  adminUpdateOrderStatus,
  adminUpdateOrder,
  adminUpdateOrderItemQty,
  adminOrderAuditLog,
  type AdminOrderDetail,
  type AdminOrderStatus,
  type AdminOrderAuditEntry,
} from "@/lib/admin-orders.functions";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_TONE,
  formatDateTime,
  formatPKR,
  formatRelative,
  nextStatus,
} from "@/lib/admin-orders";
import type { Json } from "@/integrations/supabase/types";
import { StatusPill } from "./ui/status-pill";

// ============ Helpers ============
function getAddressField(snap: Json | null, key: string): string | null {
  if (!snap || typeof snap !== "object" || Array.isArray(snap)) return null;
  const v = (snap as { [k: string]: Json | undefined })[key];
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

const STATUS_ICON: Record<AdminOrderStatus, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  confirmed: CheckCircle2,
  preparing: ChefHat,
  ready: Package,
  out_for_delivery: Truck,
  delivered: Sparkles,
  cancelled: XCircle,
};

// ============ Section shell ============
function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {title}
        </div>
        {action}
      </header>
      <div className="px-4 py-3.5">{children}</div>
    </section>
  );
}

// ============ Timeline ============
function VerticalTimeline({
  detail,
  audit,
}: {
  detail: AdminOrderDetail;
  audit: AdminOrderAuditEntry[];
}) {
  const cancelled = detail.status === "cancelled";
  const current = detail.status;
  const idx = STATUS_ORDER.indexOf(current);

  // Map audit entries by target status.
  const statusEvents = new Map<AdminOrderStatus, AdminOrderAuditEntry>();
  for (const a of audit) {
    if (a.action !== "status_changed") continue;
    const nv = a.new_value as { status?: AdminOrderStatus } | null;
    if (nv?.status) statusEvents.set(nv.status, a);
  }

  const steps: AdminOrderStatus[] = cancelled
    ? (STATUS_ORDER.slice(0, Math.max(1, idx)) as AdminOrderStatus[])
    : STATUS_ORDER;

  return (
    <ol className="relative space-y-4 pl-1">
      <div
        aria-hidden
        className="absolute left-[13px] top-2 bottom-2 w-px bg-border"
      />
      {steps.map((s, i) => {
        const done = cancelled ? true : i <= idx;
        const active = !cancelled && i === idx;
        const evt = statusEvents.get(s);
        const Icon = STATUS_ICON[s];
        const isPlaced = i === 0;
        const timestamp =
          evt?.created_at ?? (isPlaced ? detail.created_at : active ? detail.updated_at : null);
        return (
          <li key={s} className="relative flex items-start gap-3">
            <div
              className={cn(
                "relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : active
                    ? "border-primary bg-background text-primary"
                    : "border-border bg-background text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    !done && !active && "text-muted-foreground",
                  )}
                >
                  {STATUS_LABEL[s]}
                </span>
                {timestamp && (
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {formatDateTime(timestamp)}
                  </span>
                )}
              </div>
              {evt && (
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  by {evt.actor_email ?? "System"}
                  {evt.actor_role ? ` · ${evt.actor_role}` : ""}
                </div>
              )}
            </div>
          </li>
        );
      })}
      {cancelled && (
        <li className="relative flex items-start gap-3">
          <div className="relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-destructive bg-destructive text-destructive-foreground">
            <XCircle className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-semibold text-destructive">Cancelled</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {formatDateTime(detail.updated_at)}
              </span>
            </div>
          </div>
        </li>
      )}
    </ol>
  );
}

// ============ Audit history ============
function AuditHistory({ audit }: { audit: AdminOrderAuditEntry[] }) {
  if (audit.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        No changes have been recorded yet.
      </div>
    );
  }
  return (
    <ol className="space-y-3">
      {[...audit].reverse().map((a) => (
        <li key={a.id} className="rounded-xl border border-border/60 bg-background/60 p-3 text-xs">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-semibold text-foreground">
              {a.summary ?? a.action.replace(/_/g, " ")}
            </div>
            <div className="tabular-nums text-muted-foreground">{formatDateTime(a.created_at)}</div>
          </div>
          <div className="mt-0.5 text-muted-foreground">
            {a.actor_email ?? "System"}
            {a.actor_role ? ` · ${a.actor_role}` : ""}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ============ Edit form types ============
type EditableFields = {
  recipient_name: string;
  recipient_phone: string;
  address_line: string;
  address_area: string;
  address_city: string;
  delivery_instructions: string;
  payment_method: string;
  notes: string;
  special_instructions: string;
  delivery_fee_pkr: number;
  coupon_code: string;
};

function fromDetail(d: AdminOrderDetail): EditableFields {
  return {
    recipient_name: getAddressField(d.address_snapshot, "recipient_name") ?? d.customer_name ?? "",
    recipient_phone: getAddressField(d.address_snapshot, "phone") ?? d.customer_phone ?? "",
    address_line: getAddressField(d.address_snapshot, "address_line") ?? "",
    address_area: getAddressField(d.address_snapshot, "area") ?? "",
    address_city: getAddressField(d.address_snapshot, "city") ?? "",
    delivery_instructions: getAddressField(d.address_snapshot, "notes") ?? "",
    payment_method: d.payment_method ?? "",
    notes: d.notes ?? "",
    special_instructions: d.special_instructions ?? "",
    delivery_fee_pkr: d.delivery_fee_pkr ?? 0,
    coupon_code: d.coupon_code ?? "",
  };
}

const FIELD_LABEL: Record<keyof EditableFields, string> = {
  recipient_name: "Customer name",
  recipient_phone: "Phone",
  address_line: "Address",
  address_area: "Area",
  address_city: "City",
  delivery_instructions: "Delivery instructions",
  payment_method: "Payment method",
  notes: "Internal notes",
  special_instructions: "Kitchen notes",
  delivery_fee_pkr: "Delivery fee",
  coupon_code: "Coupon code",
};

function diffFields(a: EditableFields, b: EditableFields) {
  const out: Array<{ key: keyof EditableFields; from: string; to: string }> = [];
  (Object.keys(a) as (keyof EditableFields)[]).forEach((k) => {
    const av = String(a[k] ?? "");
    const bv = String(b[k] ?? "");
    if (av !== bv) out.push({ key: k, from: av, to: bv });
  });
  return out;
}

function toPatch(a: EditableFields, b: EditableFields) {
  const patch: Record<string, unknown> = {};
  (Object.keys(a) as (keyof EditableFields)[]).forEach((k) => {
    if (String(a[k] ?? "") === String(b[k] ?? "")) return;
    const v = b[k];
    if (k === "delivery_fee_pkr") patch[k] = Number(v) || 0;
    else if (typeof v === "string") patch[k] = v.trim() === "" ? null : v;
    else patch[k] = v;
  });
  return patch;
}

// ============ Field editors ============
function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ============ Item editor ============
function ItemsEditor({
  detail,
  onChangeQty,
  pendingItemId,
}: {
  detail: AdminOrderDetail;
  onChangeQty: (itemId: string, qty: number) => void;
  pendingItemId: string | null;
}) {
  return (
    <ul className="divide-y divide-border/60">
      {detail.items.map((it) => {
        const isPending = pendingItemId === it.id;
        return (
          <li key={it.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold tabular-nums">
              {it.qty}×
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{it.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {formatPKR(it.unit_price_pkr)} each
              </div>
              {it.options && typeof it.options === "object" && "notes" in it.options && (it.options as { notes?: string }).notes && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Note: {(it.options as { notes?: string }).notes}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={isPending || it.qty <= 1}
                onClick={() => onChangeQty(it.id, it.qty - 1)}
                className="h-7 w-7 rounded-md"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="w-6 text-center text-sm font-semibold tabular-nums">
                {isPending ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : it.qty}
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={isPending}
                onClick={() => onChangeQty(it.id, it.qty + 1)}
                className="h-7 w-7 rounded-md"
                aria-label="Increase quantity"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={isPending}
                onClick={() => onChangeQty(it.id, 0)}
                className="ml-1 h-7 w-7 rounded-md text-muted-foreground hover:text-destructive"
                aria-label="Remove item"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
              {formatPKR(it.unit_price_pkr * it.qty)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ============ Skeleton ============
function DetailSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-40 rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

// ============ Drawer ============
export function OrderDetailsDrawer({
  orderId,
  open,
  onOpenChange,
}: {
  orderId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const getOrder = useServerFn(adminGetOrder);
  const updateStatus = useServerFn(adminUpdateOrderStatus);
  const updateOrder = useServerFn(adminUpdateOrder);
  const updateItemQty = useServerFn(adminUpdateOrderItemQty);
  const getAudit = useServerFn(adminOrderAuditLog);

  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<EditableFields | null>(null);
  const [confirmSave, setConfirmSave] = React.useState(false);
  const [pendingItemId, setPendingItemId] = React.useState<string | null>(null);

  const orderQ = useQuery({
    queryKey: ["admin", "order", orderId],
    queryFn: () => getOrder({ data: { id: orderId! } }),
    enabled: !!orderId && open,
  });

  const auditQ = useQuery({
    queryKey: ["admin", "order-audit", orderId],
    queryFn: () => getAudit({ data: { order_id: orderId! } }),
    enabled: !!orderId && open,
  });

  const detail = orderQ.data ?? null;
  const audit = auditQ.data ?? [];

  // Sync form when order loads / edit begins.
  React.useEffect(() => {
    if (!detail) return;
    if (editing && form === null) setForm(fromDetail(detail));
    if (!editing) setForm(null);
  }, [detail, editing, form]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    qc.invalidateQueries({ queryKey: ["admin", "order", orderId] });
    qc.invalidateQueries({ queryKey: ["admin", "order-audit", orderId] });
    qc.invalidateQueries({ queryKey: ["admin", "order-stats"] });
  };

  const statusMut = useMutation({
    mutationFn: (status: AdminOrderStatus) => updateStatus({ data: { id: orderId!, status } }),
    onSuccess: (r) => {
      toast.success(`Order marked as ${r.label}`);
      invalidate();
    },
    onError: (err: Error) => toast.error("Failed to update", { description: err.message }),
  });

  const saveMut = useMutation({
    mutationFn: async (input: { patch: Record<string, unknown>; summary: string }) =>
      updateOrder({
        data: { id: orderId!, patch: input.patch as never, changes_summary: input.summary },
      }),
    onSuccess: () => {
      toast.success("Order updated");
      setEditing(false);
      setForm(null);
      setConfirmSave(false);
      invalidate();
    },
    onError: (err: Error) => toast.error("Failed to save", { description: err.message }),
  });

  const itemMut = useMutation({
    mutationFn: (input: { itemId: string; qty: number }) =>
      updateItemQty({ data: { order_id: orderId!, item_id: input.itemId, qty: input.qty } }),
    onMutate: ({ itemId }) => {
      setPendingItemId(itemId);
    },
    onSettled: () => setPendingItemId(null),
    onSuccess: () => {
      toast.success("Items updated");
      invalidate();
    },
    onError: (err: Error) => toast.error("Failed to update item", { description: err.message }),
  });

  const upcoming = detail ? nextStatus(detail.status) : null;

  const diff = React.useMemo(() => {
    if (!detail || !form) return [];
    return diffFields(fromDetail(detail), form);
  }, [detail, form]);

  const patchForSave = React.useMemo(() => {
    if (!detail || !form) return {};
    return toPatch(fromDetail(detail), form);
  }, [detail, form]);

  const isPickup = detail?.fulfillment_method !== "delivery";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl md:max-w-2xl"
      >
        {orderQ.isLoading || !detail ? (
          <DetailSkeleton />
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-border/70 bg-background/95 px-5 py-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Order
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(detail.order_number);
                        toast.success("Order number copied");
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-accent"
                      aria-label="Copy order number"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="mt-0.5 font-display text-2xl font-black tracking-tight">
                    {detail.order_number}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span>Placed {formatDateTime(detail.created_at)}</span>
                    <span className="opacity-40">·</span>
                    <span className="capitalize">{detail.fulfillment_method.replace(/_/g, " ")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill tone={STATUS_TONE[detail.status]}>{STATUS_LABEL[detail.status]}</StatusPill>
                  {!editing && detail.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 rounded-lg"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenChange(false)}
                    className="h-8 w-8 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {/* Customer */}
              <Section icon={User} title="Customer">
                {!editing ? (
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">
                      {detail.customer_name ?? "—"}
                    </div>
                    {detail.customer_email && (
                      <div className="text-xs text-muted-foreground">{detail.customer_email}</div>
                    )}
                    {detail.customer_phone && (
                      <a
                        href={`tel:${detail.customer_phone}`}
                        className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs font-semibold hover:bg-accent"
                      >
                        <Phone className="h-3 w-3" /> {detail.customer_phone}
                      </a>
                    )}
                  </div>
                ) : (
                  form && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FieldRow label="Name">
                        <Input
                          value={form.recipient_name}
                          onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                          className="h-9"
                        />
                      </FieldRow>
                      <FieldRow label="Phone">
                        <Input
                          value={form.recipient_phone}
                          onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })}
                          className="h-9"
                        />
                      </FieldRow>
                    </div>
                  )
                )}
              </Section>

              {/* Delivery */}
              <Section icon={MapPin} title="Delivery">
                {isPickup ? (
                  <div className="text-sm capitalize text-muted-foreground">
                    {detail.fulfillment_method.replace(/_/g, " ")} — no delivery address
                  </div>
                ) : !editing ? (
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold">
                      {getAddressField(detail.address_snapshot, "address_line") ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[
                        getAddressField(detail.address_snapshot, "area"),
                        getAddressField(detail.address_snapshot, "city"),
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                    {getAddressField(detail.address_snapshot, "notes") && (
                      <div className="mt-2 rounded-lg bg-muted px-2 py-1.5 text-xs">
                        {getAddressField(detail.address_snapshot, "notes")}
                      </div>
                    )}
                  </div>
                ) : (
                  form && (
                    <div className="grid gap-3">
                      <FieldRow label="Address">
                        <Input
                          value={form.address_line}
                          onChange={(e) => setForm({ ...form, address_line: e.target.value })}
                          className="h-9"
                        />
                      </FieldRow>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FieldRow label="Area">
                          <Input
                            value={form.address_area}
                            onChange={(e) => setForm({ ...form, address_area: e.target.value })}
                            className="h-9"
                          />
                        </FieldRow>
                        <FieldRow label="City">
                          <Input
                            value={form.address_city}
                            onChange={(e) => setForm({ ...form, address_city: e.target.value })}
                            className="h-9"
                          />
                        </FieldRow>
                      </div>
                      <FieldRow label="Delivery instructions">
                        <Textarea
                          value={form.delivery_instructions}
                          onChange={(e) => setForm({ ...form, delivery_instructions: e.target.value })}
                          rows={2}
                        />
                      </FieldRow>
                    </div>
                  )
                )}
              </Section>

              {/* Items */}
              <Section
                icon={ShoppingBag}
                title={`Items · ${detail.items.length}`}
                action={
                  editing && (
                    <span className="text-[10.5px] font-medium text-muted-foreground">
                      Adjust qty inline
                    </span>
                  )
                }
              >
                {editing ? (
                  <ItemsEditor
                    detail={detail}
                    pendingItemId={pendingItemId}
                    onChangeQty={(itemId, qty) => itemMut.mutate({ itemId, qty })}
                  />
                ) : (
                  <ul className="divide-y divide-border/60">
                    {detail.items.map((it) => (
                      <li key={it.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold tabular-nums">
                          {it.qty}×
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold">{it.name}</div>
                          {it.options && typeof it.options === "object" && "notes" in it.options && (it.options as { notes?: string }).notes && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              Note: {(it.options as { notes?: string }).notes}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-sm font-semibold tabular-nums">
                          {formatPKR(it.unit_price_pkr * it.qty)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {/* Payment / Bill */}
              <Section icon={Receipt} title="Payment">
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="tabular-nums">{formatPKR(detail.subtotal_pkr)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Delivery fee</dt>
                    <dd className="tabular-nums">
                      {editing && form ? (
                        <Input
                          type="number"
                          min={0}
                          value={form.delivery_fee_pkr}
                          onChange={(e) =>
                            setForm({ ...form, delivery_fee_pkr: Number(e.target.value) || 0 })
                          }
                          className="h-8 w-28 text-right tabular-nums"
                        />
                      ) : (
                        formatPKR(detail.delivery_fee_pkr)
                      )}
                    </dd>
                  </div>
                  {detail.tax_pkr > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Tax</dt>
                      <dd className="tabular-nums">{formatPKR(detail.tax_pkr)}</dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <dt className="inline-flex items-center gap-1 text-muted-foreground">
                      <Ticket className="h-3 w-3" /> Coupon
                    </dt>
                    <dd className="tabular-nums">
                      {editing && form ? (
                        <Input
                          value={form.coupon_code}
                          onChange={(e) => setForm({ ...form, coupon_code: e.target.value })}
                          placeholder="—"
                          className="h-8 w-32 text-right uppercase"
                        />
                      ) : detail.coupon_code ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {detail.coupon_code} · −{formatPKR(detail.discount_pkr)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </dd>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-base font-black">
                    <dt>Total</dt>
                    <dd className="tabular-nums">{formatPKR(detail.total_pkr)}</dd>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                    <dt className="text-muted-foreground">Payment method</dt>
                    <dd>
                      {editing && form ? (
                        <Select
                          value={form.payment_method}
                          onValueChange={(v) => setForm({ ...form, payment_method: v })}
                        >
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cod">Cash on Delivery</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="wallet">Wallet</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="uppercase">{detail.payment_method}</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </Section>

              {/* Timeline */}
              <Section icon={Truck} title="Timeline">
                <VerticalTimeline detail={detail} audit={audit} />
              </Section>

              {/* Internal notes */}
              <Section icon={StickyNote} title="Internal notes">
                {!editing ? (
                  <div className="whitespace-pre-line text-sm">
                    {detail.notes ? (
                      detail.notes
                    ) : (
                      <span className="text-muted-foreground">No internal notes.</span>
                    )}
                  </div>
                ) : (
                  form && (
                    <div className="grid gap-3">
                      <FieldRow label="Internal (staff only)">
                        <Textarea
                          value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                          rows={2}
                          placeholder="Only visible to staff…"
                        />
                      </FieldRow>
                      <FieldRow label="Kitchen notes">
                        <Textarea
                          value={form.special_instructions}
                          onChange={(e) => setForm({ ...form, special_instructions: e.target.value })}
                          rows={2}
                          placeholder="e.g. no onions, extra sauce"
                        />
                      </FieldRow>
                    </div>
                  )
                )}
                {!editing && detail.special_instructions && (
                  <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
                    <div className="mb-0.5 inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      <ChefHat className="h-3 w-3" /> Kitchen
                    </div>
                    <div className="whitespace-pre-line text-foreground">
                      {detail.special_instructions}
                    </div>
                  </div>
                )}
              </Section>

              {/* Audit history */}
              <Section
                icon={History}
                title="Audit history"
                action={
                  auditQ.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                }
              >
                <AuditHistory audit={audit} />
              </Section>
            </div>

            {/* Footer actions */}
            <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-border/70 bg-background/95 px-5 py-3 backdrop-blur">
              {editing ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditing(false);
                      setForm(null);
                    }}
                    className="rounded-lg"
                  >
                    Discard
                  </Button>
                  <div className="flex-1" />
                  <div className="text-xs text-muted-foreground">
                    {diff.length === 0 ? "No changes yet" : `${diff.length} change${diff.length === 1 ? "" : "s"}`}
                  </div>
                  <Button
                    disabled={diff.length === 0 || saveMut.isPending}
                    onClick={() => setConfirmSave(true)}
                    className="rounded-lg"
                  >
                    Review & save
                  </Button>
                </>
              ) : (
                <>
                  {detail.status !== "cancelled" && detail.status !== "delivered" && (
                    <Button
                      variant="outline"
                      onClick={() => setConfirmCancel(true)}
                      className="rounded-lg border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={statusMut.isPending}
                    >
                      <XCircle className="h-4 w-4" /> Cancel order
                    </Button>
                  )}
                  <div className="flex-1" />
                  {upcoming && (
                    <Button
                      onClick={() => statusMut.mutate(upcoming)}
                      disabled={statusMut.isPending}
                      className="rounded-lg"
                    >
                      {statusMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Mark as {STATUS_LABEL[upcoming]} <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>

      {/* Cancel confirmation */}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              The customer will see it as cancelled and it will be logged in the audit trail.
              This can't be undone from the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Keep order</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                statusMut.mutate("cancelled");
                setConfirmCancel(false);
              }}
            >
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save-diff confirmation */}
      <AlertDialog open={confirmSave} onOpenChange={setConfirmSave}>
        <AlertDialogContent className="rounded-2xl sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Review changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              These changes will be saved to the order and recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-border/60 bg-muted/40 p-3">
            {diff.length === 0 ? (
              <div className="text-sm text-muted-foreground">No fields changed.</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {diff.map((d) => (
                  <li
                    key={d.key}
                    className="grid grid-cols-[110px_1fr] items-start gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {FIELD_LABEL[d.key]}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="truncate text-xs text-muted-foreground line-through">
                        {d.from || "—"}
                      </div>
                      <div className="truncate text-sm font-semibold text-foreground">
                        {d.to || "—"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg" disabled={saveMut.isPending}>
              Back
            </AlertDialogCancel>
            <Button
              className="rounded-lg"
              disabled={diff.length === 0 || saveMut.isPending}
              onClick={() =>
                saveMut.mutate({
                  patch: patchForSave,
                  summary: `Edited ${diff.map((d) => FIELD_LABEL[d.key]).join(", ")}`,
                })
              }
            >
              {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}

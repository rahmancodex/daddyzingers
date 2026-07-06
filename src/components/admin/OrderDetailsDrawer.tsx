import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowRight,
  Bike,
  Building2,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock,
  Copy,
  Flame,
  History,
  Loader2,
  Mail,
  MapPin,
  Minus,
  Navigation,
  Package,
  Pencil,
  Phone,
  Plus,
  Printer,
  Receipt,
  Save,
  ShoppingBag,
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
  adminCancelOrder,
  adminBranchesForOrders,
  CANCEL_REASONS,
  type AdminOrderDetail,
  type AdminOrderStatus,
  type AdminOrderAuditEntry,
  type OrderCancelReason,
} from "@/lib/admin-orders.functions";
import {
  STATUS_LABEL,
  STATUS_TONE,
  formatDateTime,
  formatPKR,
  nextStatus,
} from "@/lib/admin-orders";
import {
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  estimatedPrepMinutes,
  formatEta,
  orderPriority,
} from "@/lib/admin-orders-derived";

import type { Json } from "@/integrations/supabase/types";
import { StatusPill, STATUS_TONE_CLASS } from "./ui/status-pill";

// ============ Snapshot helpers ============
function snapField(snap: Json | null, key: string): string | null {
  if (!snap || typeof snap !== "object" || Array.isArray(snap)) return null;
  const v = (snap as { [k: string]: Json | undefined })[key];
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function snapNumber(snap: Json | null, keys: string[]): number | null {
  if (!snap || typeof snap !== "object" || Array.isArray(snap)) return null;
  for (const k of keys) {
    const v = (snap as { [k: string]: Json | undefined })[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

function initialsOf(name: string | null | undefined): string {
  const s = (name ?? "").trim();
  if (!s) return "??";
  const p = s.split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "??";
}

const CANCEL_REASON_LABEL: Record<OrderCancelReason, string> = {
  customer_cancelled: "Customer cancelled",
  kitchen_issue: "Kitchen issue",
  out_of_stock: "Out of stock",
  duplicate_order: "Duplicate order",
  fake_order: "Fake order",
  delivery_failed: "Delivery failed",
  other: "Other",
};

// ============ Section shell ============
function Section({
  icon: Icon,
  title,
  action,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_0_0_hsl(var(--foreground)/0.02),0_1px_2px_-1px_hsl(var(--foreground)/0.06)]",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border/70 bg-muted/40 px-4 py-2.5">
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {title}
        </div>
        {action}
      </header>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  );
}

// ============ Simplified restaurant timeline ============
type SimpleStep = "preparing" | "ready" | "delivered";
const SIMPLE_ICON: Record<SimpleStep, React.ComponentType<{ className?: string }>> = {
  preparing: ChefHat,
  ready: Package,
  delivered: Truck,
};
const SIMPLE_LABEL: Record<SimpleStep, string> = {
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
};

function reachedStep(status: AdminOrderStatus): number {
  switch (status) {
    case "pending":
    case "confirmed":
      return -1;
    case "preparing":
      return 0;
    case "ready":
    case "out_for_delivery":
      return 1;
    case "delivered":
      return 2;
    case "cancelled":
      return -1;
  }
}

function findCancelAudit(audit: AdminOrderAuditEntry[]): AdminOrderAuditEntry | null {
  for (let i = audit.length - 1; i >= 0; i--) {
    if (audit[i].action === "order_cancelled") return audit[i];
  }
  return null;
}

function RestaurantTimeline({
  detail,
  audit,
  onSet,
  pending,
}: {
  detail: AdminOrderDetail;
  audit: AdminOrderAuditEntry[];
  onSet: (status: AdminOrderStatus) => void;
  pending: boolean;
}) {
  const cancelled = detail.status === "cancelled";
  const idx = reachedStep(detail.status);
  const steps: Array<{ key: SimpleStep; targetStatus: AdminOrderStatus }> = [
    { key: "preparing", targetStatus: "preparing" },
    { key: "ready", targetStatus: "ready" },
    { key: "delivered", targetStatus: "delivered" },
  ];

  if (cancelled) {
    const entry = findCancelAudit(audit);
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive text-destructive-foreground">
          <XCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-destructive">Cancelled</div>
          {entry?.summary && (
            <div className="mt-0.5 text-xs text-foreground">{entry.summary}</div>
          )}
          <div className="mt-1 text-[11px] text-muted-foreground">
            {formatDateTime(entry?.created_at ?? detail.updated_at)}
            {entry?.actor_email ? ` · by ${entry.actor_email}` : ""}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ol className="grid grid-cols-3 gap-2">
      {steps.map((s, i) => {
        const done = i <= idx;
        const current = i === idx;
        const Icon = SIMPLE_ICON[s.key];
        return (
          <li key={s.key} className="min-w-0">
            <button
              type="button"
              onClick={() => onSet(s.targetStatus)}
              disabled={pending || current}
              className={cn(
                "group flex w-full min-w-0 flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                done
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/70 bg-card hover:border-primary/40 hover:bg-primary/5",
                current && "shadow-[0_0_0_2px_hsl(var(--primary)/0.35)]",
                pending && "opacity-70",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                  done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <div className={cn("truncate text-sm font-semibold", !done && "text-muted-foreground")}>
                  {SIMPLE_LABEL[s.key]}
                </div>
                <div className="text-[10.5px] text-muted-foreground">
                  {done ? "Done" : current ? "Current" : "Tap to set"}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// ============ Audit history ============
const AUDIT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  status_changed: ArrowRight,
  order_cancelled: XCircle,
  order_edited: Pencil,
  item_qty_changed: ShoppingBag,
  item_removed: Trash2,
};

function AuditDiff({ entry }: { entry: AdminOrderAuditEntry }) {
  const before = (entry.before_state ?? {}) as Record<string, unknown>;
  const after = (entry.after_state ?? {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(
    (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]),
  );
  if (keys.length === 0) return null;
  const fmt = (v: unknown) => {
    if (v === null || v === undefined || v === "") return "∅";
    if (typeof v === "string") return v;
    return JSON.stringify(v);
  };
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {keys.slice(0, 6).map((k) => (
        <span
          key={k}
          className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 text-[10px] text-muted-foreground ring-1 ring-inset ring-border/60"
        >
          <span className="font-semibold text-foreground">{k.replace(/_/g, " ")}</span>
          <span className="line-through opacity-70">{fmt(before[k])}</span>
          <ArrowRight className="h-2.5 w-2.5" />
          <span className="font-semibold text-foreground">{fmt(after[k])}</span>
        </span>
      ))}
      {keys.length > 6 && (
        <span className="text-[10px] text-muted-foreground">+{keys.length - 6} more</span>
      )}
    </div>
  );
}

function AuditHistory({ audit }: { audit: AdminOrderAuditEntry[] }) {
  if (audit.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
        No changes have been recorded yet.
      </div>
    );
  }
  return (
    <ol className="relative space-y-3 pl-5 before:absolute before:left-1.5 before:top-1.5 before:bottom-1.5 before:w-px before:bg-border">
      {[...audit].reverse().map((a) => {
        const Icon = AUDIT_ICON[a.action] ?? History;
        return (
          <li key={a.id} className="relative">
            <span className="absolute -left-[14px] top-1.5 grid h-4 w-4 place-items-center rounded-full bg-background ring-2 ring-primary/40">
              <Icon className="h-2.5 w-2.5 text-primary" />
            </span>
            <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-xs">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-semibold text-foreground">
                  {a.summary ?? a.action.replace(/_/g, " ")}
                </div>
                <div className="tabular-nums text-muted-foreground">
                  {formatDateTime(a.created_at)}
                </div>
              </div>
              <div className="mt-0.5 text-muted-foreground">
                {a.actor_email ?? "System"}
                {a.actor_role ? ` · ${a.actor_role}` : ""}
              </div>
              <AuditDiff entry={a} />
            </div>
          </li>
        );
      })}
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
  landmark: string;
  delivery_instructions: string;
  payment_method: string;
  branch_id: string;
  special_instructions: string;
  delivery_fee_pkr: number;
  coupon_code: string;
  fulfillment_method: "delivery" | "pickup" | "dinein";
  schedule_at: string; // "" = ASAP; otherwise ISO string
};

function fromDetail(d: AdminOrderDetail): EditableFields {
  return {
    recipient_name: snapField(d.address_snapshot, "recipient_name") ?? d.customer_name ?? "",
    recipient_phone: snapField(d.address_snapshot, "phone") ?? d.customer_phone ?? "",
    address_line: snapField(d.address_snapshot, "address_line") ?? "",
    address_area: snapField(d.address_snapshot, "area") ?? "",
    address_city: snapField(d.address_snapshot, "city") ?? "",
    landmark: snapField(d.address_snapshot, "landmark") ?? "",
    delivery_instructions: snapField(d.address_snapshot, "notes") ?? "",
    payment_method: d.payment_method ?? "",
    branch_id: d.branch_id ?? "",
    special_instructions: d.special_instructions ?? "",
    delivery_fee_pkr: d.delivery_fee_pkr ?? 0,
    coupon_code: d.coupon_code ?? "",
    fulfillment_method: (d.fulfillment_method as EditableFields["fulfillment_method"]) ?? "delivery",
    schedule_at: d.schedule_at ?? "",
  };
}

const FIELD_LABEL: Record<keyof EditableFields, string> = {
  recipient_name: "Customer name",
  recipient_phone: "Phone",
  address_line: "Address",
  address_area: "Area",
  address_city: "City",
  landmark: "Landmark",
  delivery_instructions: "Delivery instructions",
  payment_method: "Payment method",
  branch_id: "Branch",
  special_instructions: "Kitchen notes",
  delivery_fee_pkr: "Delivery fee",
  coupon_code: "Coupon code",
  fulfillment_method: "Fulfillment method",
  schedule_at: "Scheduled time",
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
  const NULLABLE_UUIDS: Array<keyof EditableFields> = ["branch_id"];
  (Object.keys(a) as (keyof EditableFields)[]).forEach((k) => {
    if (String(a[k] ?? "") === String(b[k] ?? "")) return;
    const v = b[k];
    if (k === "delivery_fee_pkr") {
      patch[k] = Number(v) || 0;
    } else if (k === "schedule_at") {
      const s = typeof v === "string" ? v.trim() : "";
      if (!s) {
        patch[k] = null;
      } else {
        // datetime-local yields "YYYY-MM-DDTHH:MM"; normalize to ISO
        const d = new Date(s);
        patch[k] = Number.isNaN(d.getTime()) ? null : d.toISOString();
      }
    } else if (NULLABLE_UUIDS.includes(k)) {
      patch[k] = typeof v === "string" && v.trim() !== "" ? v : null;
    } else if (typeof v === "string") {
      patch[k] = v.trim() === "" ? null : v;
    } else {
      patch[k] = v;
    }
  });
  return patch;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ============ Autosize textarea ============
function Autosize({
  value,
  onChange,
  placeholder,
  minRows = 3,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={minRows}
      className={cn("resize-none overflow-hidden", className)}
    />
  );
}

// ============ Items list (read-only + editor) ============
type ItemOptionShape = {
  customizations?: Array<{ id: string; label: string; price?: number }>;
  upgrades?: Array<{ id: string; label: string; price?: number }>;
  notes?: string;
  size?: string;
  image?: string;
  image_url?: string;
};

function itemOpts(opts: Json | null): ItemOptionShape {
  if (!opts || typeof opts !== "object" || Array.isArray(opts)) return {};
  return opts as ItemOptionShape;
}

function ItemModifiers({ opts }: { opts: ItemOptionShape }) {
  const rows: Array<{ label: string; price?: number; tone: "size" | "extra" | "upgrade" }> = [];
  if (opts.size) rows.push({ label: opts.size, tone: "size" });
  (opts.customizations ?? []).forEach((c) => rows.push({ label: c.label, price: c.price, tone: "extra" }));
  (opts.upgrades ?? []).forEach((u) => rows.push({ label: u.label, price: u.price, tone: "upgrade" }));
  if (rows.length === 0 && !opts.notes) return null;
  return (
    <div className="mt-1.5 space-y-1">
      {rows.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {rows.map((r, i) => (
            <li
              key={`${r.tone}-${i}-${r.label}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium",
                r.tone === "size" && "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
                r.tone === "extra" && "bg-muted text-foreground ring-1 ring-inset ring-border",
                r.tone === "upgrade" && "bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400",
              )}
            >
              {r.label}
              {r.price ? <span className="tabular-nums opacity-70">+{formatPKR(r.price)}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {opts.notes && (
        <div className="text-[11px] italic text-muted-foreground">“{opts.notes}”</div>
      )}
    </div>
  );
}

function ItemThumb({ opts, name }: { opts: ItemOptionShape; name: string }) {
  const src = opts.image ?? opts.image_url;
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="h-12 w-12 shrink-0 rounded-lg border border-border/60 object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-muted to-muted/60 text-[11px] font-black text-muted-foreground ring-1 ring-inset ring-border/60">
      {initialsOf(name)}
    </div>
  );
}

function ItemsList({
  detail,
  editable,
  onChangeQty,
  pendingItemId,
}: {
  detail: AdminOrderDetail;
  editable: boolean;
  onChangeQty?: (itemId: string, qty: number) => void;
  pendingItemId?: string | null;
}) {
  return (
    <ul className="divide-y divide-border/60">
      {detail.items.map((it) => {
        const opts = itemOpts(it.options);
        const isPending = editable && pendingItemId === it.id;
        const subtotal = it.unit_price_pkr * it.qty;
        return (
          <li key={it.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <ItemThumb opts={opts} name={it.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{it.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                    {formatPKR(it.unit_price_pkr)} each
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold tabular-nums">{formatPKR(subtotal)}</div>
                  {!editable && (
                    <div className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums">
                      ×{it.qty}
                    </div>
                  )}
                </div>
              </div>
              <ItemModifiers opts={opts} />
              {editable && onChangeQty && (
                <div className="mt-2 flex items-center gap-1">
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
                  <div className="min-w-[2rem] text-center text-sm font-semibold tabular-nums">
                    {isPending ? (
                      <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
                    ) : (
                      it.qty
                    )}
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
                    className="ml-auto h-7 w-7 rounded-md text-muted-foreground hover:text-destructive"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ============ Print helpers ============
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

function printReceipt(kind: "invoice" | "kitchen", detail: AdminOrderDetail) {
  const win = window.open("", "_blank", "width=420,height=640");
  if (!win) {
    toast.error("Popup blocked — please allow popups to print.");
    return;
  }
  const itemsRows = detail.items
    .map(
      (it) => `
        <tr>
          <td>${it.qty}×</td>
          <td>${escapeHtml(it.name)}</td>
          ${kind === "invoice" ? `<td style="text-align:right">${formatPKR(it.unit_price_pkr * it.qty)}</td>` : ""}
        </tr>`,
    )
    .join("");
  const totals =
    kind === "invoice"
      ? `
        <table style="width:100%;margin-top:12px;font-size:12px">
          <tr><td>Subtotal</td><td style="text-align:right">${formatPKR(detail.subtotal_pkr)}</td></tr>
          <tr><td>Delivery</td><td style="text-align:right">${formatPKR(detail.delivery_fee_pkr)}</td></tr>
          ${detail.tax_pkr > 0 ? `<tr><td>Tax</td><td style="text-align:right">${formatPKR(detail.tax_pkr)}</td></tr>` : ""}
          ${detail.discount_pkr > 0 ? `<tr><td>Discount</td><td style="text-align:right">−${formatPKR(detail.discount_pkr)}</td></tr>` : ""}
          <tr style="font-weight:900;border-top:1px dashed #999"><td>Total</td><td style="text-align:right">${formatPKR(detail.total_pkr)}</td></tr>
        </table>`
      : "";
  const addr = [
    snapField(detail.address_snapshot, "address_line"),
    snapField(detail.address_snapshot, "area"),
    snapField(detail.address_snapshot, "city"),
  ]
    .filter(Boolean)
    .join(", ");
  win.document.write(`<!doctype html>
<html><head><title>${kind === "invoice" ? "Invoice" : "Kitchen ticket"} · ${escapeHtml(detail.order_number)}</title>
<style>
  body{font-family:ui-sans-serif,system-ui,-apple-system;margin:16px;color:#111}
  h1{font-size:16px;margin:0 0 4px}
  .muted{color:#666;font-size:11px}
  table{width:100%;border-collapse:collapse}
  td{padding:4px 0;vertical-align:top;font-size:12px}
  .box{border:1px dashed #999;padding:8px;margin-top:8px;border-radius:6px}
  @media print{@page{margin:8mm}}
</style></head><body>
  <h1>${kind === "invoice" ? "Invoice" : "Kitchen ticket"}</h1>
  <div class="muted">Order ${escapeHtml(detail.order_number)} · ${formatDateTime(detail.created_at)}</div>
  ${
    kind === "invoice"
      ? `<div class="box">
          <div><strong>${escapeHtml(detail.customer_name ?? "Guest")}</strong></div>
          <div class="muted">${escapeHtml(detail.customer_phone ?? "—")}</div>
          ${addr ? `<div class="muted">${escapeHtml(addr)}</div>` : ""}
        </div>`
      : `<div class="box">
          <div><strong>${detail.fulfillment_method.replace(/_/g, " ").toUpperCase()}</strong></div>
          ${detail.special_instructions ? `<div class="muted"><em>${escapeHtml(detail.special_instructions)}</em></div>` : ""}
        </div>`
  }
  <table style="margin-top:12px">${itemsRows}</table>
  ${totals}
  <div class="muted" style="margin-top:16px;text-align:center">Thank you</div>
  <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script>
</body></html>`);
  win.document.close();
}

// ============ Skeleton ============
function DetailSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
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
  const cancelOrder = useServerFn(adminCancelOrder);
  const listBranches = useServerFn(adminBranchesForOrders);

  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState<OrderCancelReason>("customer_cancelled");
  const [cancelDetails, setCancelDetails] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<EditableFields | null>(null);
  const [confirmSave, setConfirmSave] = React.useState(false);
  const [pendingItemId, setPendingItemId] = React.useState<string | null>(null);
  const [internalNote, setInternalNote] = React.useState("");
  const [noteDirty, setNoteDirty] = React.useState(false);

  const orderQ = useQuery({
    queryKey: ["admin", "order", orderId],
    queryFn: () => getOrder({ data: { id: orderId! } }),
    enabled: !!orderId && open,
  });

  const auditQ = useQuery({
    queryKey: ["admin", "order-audit", orderId],
    queryFn: () => getAudit({ data: { order_id: orderId! } }),
    enabled: !!orderId && open,
    refetchOnWindowFocus: true,
  });

  // Realtime: refetch audit as soon as any new audit_logs row for this order lands.
  React.useEffect(() => {
    if (!orderId || !open) return;
    let cancelled = false;
    let channelRef: ReturnType<typeof import("@/integrations/supabase/client").supabase.channel> | null = null;
    (async () => {
      const mod = await import("@/integrations/supabase/client");
      if (cancelled) return;
      const ch = mod.supabase
        .channel(`order-audit-${orderId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "audit_logs",
            filter: `entity_id=eq.${orderId}`,
          },
          () => {
            qc.invalidateQueries({ queryKey: ["admin", "order-audit", orderId] });
          },
        )
        .subscribe();
      channelRef = ch;
    })();
    return () => {
      cancelled = true;
      if (channelRef) {
        import("@/integrations/supabase/client").then((mod) => {
          if (channelRef) mod.supabase.removeChannel(channelRef);
        });
      }
    };
  }, [orderId, open, qc]);

  const branchesQ = useQuery({
    queryKey: ["admin", "orders", "branches"],
    queryFn: () => listBranches(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const detail = orderQ.data ?? null;
  const audit = auditQ.data ?? [];
  const branches = branchesQ.data ?? [];
  const branchName = detail?.branch_id
    ? branches.find((b) => b.id === detail.branch_id)?.name ?? null
    : null;

  React.useEffect(() => {
    if (!detail) return;
    if (editing && form === null) setForm(fromDetail(detail));
    if (!editing) setForm(null);
  }, [detail, editing, form]);

  // Reset internal note when order changes
  React.useEffect(() => {
    if (detail) {
      setInternalNote(detail.special_instructions ?? "");
      setNoteDirty(false);
    }
  }, [detail?.id, detail?.special_instructions]);

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

  const cancelMut = useMutation({
    mutationFn: (input: { reason: OrderCancelReason; details: string }) =>
      cancelOrder({ data: { id: orderId!, reason: input.reason, details: input.details || undefined } }),
    onSuccess: () => {
      toast.success("Order cancelled");
      setConfirmCancel(false);
      setCancelDetails("");
      invalidate();
    },
    onError: (err: Error) => toast.error("Failed to cancel", { description: err.message }),
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

  const noteMut = useMutation({
    mutationFn: async (value: string) =>
      updateOrder({
        data: {
          id: orderId!,
          patch: { special_instructions: value.trim() === "" ? null : value } as never,
          changes_summary: "Updated kitchen notes",
        },
      }),
    onSuccess: () => {
      toast.success("Notes saved");
      setNoteDirty(false);
      invalidate();
    },
    onError: (err: Error) => toast.error("Failed to save notes", { description: err.message }),
  });

  const itemMut = useMutation({
    mutationFn: (input: { itemId: string; qty: number }) =>
      updateItemQty({ data: { order_id: orderId!, item_id: input.itemId, qty: input.qty } }),
    onMutate: ({ itemId }) => setPendingItemId(itemId),
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

  // Effective method reflects the in-progress edit while editing, otherwise the saved value.
  const effectiveMethod = (editing && form ? form.fulfillment_method : detail?.fulfillment_method) ?? "delivery";
  const isDelivery = effectiveMethod === "delivery";
  const isPickup = effectiveMethod === "pickup";
  const pickupBranch =
    isPickup && detail?.branch_id
      ? branches.find((b) => b.id === (editing && form ? form.branch_id : detail.branch_id)) ?? null
      : null;
  const lat = detail ? snapNumber(detail.address_snapshot, ["lat", "latitude"]) : null;
  const lng = detail ? snapNumber(detail.address_snapshot, ["lng", "longitude", "long"]) : null;
  const mapsHref =
    lat != null && lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : detail
        ? (() => {
            const parts = [
              snapField(detail.address_snapshot, "address_line"),
              snapField(detail.address_snapshot, "area"),
              snapField(detail.address_snapshot, "city"),
            ].filter(Boolean);
            return parts.length
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`
              : null;
          })()
        : null;

  const addrLine = detail && snapField(detail.address_snapshot, "address_line");
  const addrArea = detail && snapField(detail.address_snapshot, "area");
  const addrCity = detail && snapField(detail.address_snapshot, "city");
  const addrLandmark = detail && snapField(detail.address_snapshot, "landmark");
  const addrNotes = detail && snapField(detail.address_snapshot, "notes");

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
            {/* ============ Header ============ */}
            <div className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur">
              <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Order</span>
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
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <div className="font-display text-xl font-black tracking-tight sm:text-2xl">
                      {detail.order_number}
                    </div>
                    <StatusPill tone={STATUS_TONE[detail.status]}>
                      {STATUS_LABEL[detail.status]}
                    </StatusPill>
                    {(() => {
                      const p = orderPriority(detail);
                      if (p === "normal") return null;
                      return (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            PRIORITY_CLASS[p],
                          )}
                        >
                          <Flame className="h-2.5 w-2.5" /> {PRIORITY_LABEL[p]}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(detail.created_at)}
                    </span>
                    {(() => {
                      const eta = estimatedPrepMinutes(detail);
                      if (eta == null) return null;
                      return (
                        <>
                          <span className="opacity-40">·</span>
                          <span
                            className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums"
                            title="Estimated remaining time"
                          >
                            <Clock className="h-3 w-3" /> ETA {formatEta(eta)}
                          </span>
                        </>
                      );
                    })()}
                    <span className="opacity-40">·</span>
                    <span className="capitalize">
                      {detail.fulfillment_method.replace(/_/g, " ")}
                    </span>
                    {branchName && (
                      <>
                        <span className="opacity-40">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {branchName}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {!editing && detail.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="hidden h-8 gap-1.5 rounded-lg sm:inline-flex"
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
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* ============ Body ============ */}
            <div className="flex-1 space-y-4 overflow-y-auto bg-muted/20 px-3 py-4 sm:px-5 sm:py-5">
              {/* Kitchen ops — big touch targets */}
              {detail.status !== "cancelled" && (
                <Section icon={ChefHat} title="Kitchen operations">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(
                      [
                        { s: "preparing" as AdminOrderStatus, label: "Preparing", icon: ChefHat, forMethods: ["delivery", "pickup", "dinein"] },
                        { s: "ready" as AdminOrderStatus, label: "Ready", icon: Package, forMethods: ["delivery", "pickup", "dinein"] },
                        { s: "out_for_delivery" as AdminOrderStatus, label: "To rider", icon: Bike, forMethods: ["delivery"] },
                        { s: "delivered" as AdminOrderStatus, label: isPickup ? "Picked up" : "Delivered", icon: CheckCircle2, forMethods: ["delivery", "pickup", "dinein"] },
                      ] as const
                    )
                      .filter((b) => (b.forMethods as readonly string[]).includes(effectiveMethod))
                      .map((b) => {
                        const Icon = b.icon;
                        const active = detail.status === b.s;
                        return (
                          <Button
                            key={b.s}
                            type="button"
                            size="lg"
                            variant={active ? "default" : "outline"}
                            className={cn(
                              "h-16 flex-col gap-1 rounded-xl px-2 text-xs font-semibold sm:text-sm",
                              active && "pointer-events-none",
                            )}
                            disabled={statusMut.isPending}
                            onClick={() => statusMut.mutate(b.s)}
                            aria-label={`Mark as ${b.label}`}
                          >
                            <Icon className="h-5 w-5" />
                            {b.label}
                          </Button>
                        );
                      })}
                  </div>
                </Section>
              )}

              {/* Timeline */}
              <Section icon={Truck} title="Order timeline">
                <RestaurantTimeline
                  detail={detail}
                  audit={audit}
                  onSet={(s) => statusMut.mutate(s)}
                  pending={statusMut.isPending}
                />
              </Section>

              {/* Customer */}
              <Section icon={User} title="Customer">
                {!editing ? (
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-sm font-black text-primary ring-1 ring-inset ring-primary/20">
                      {initialsOf(detail.customer_name ?? detail.customer_email)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="truncate text-sm font-semibold">
                        {detail.customer_name ?? "Guest customer"}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.customer_phone && (
                          <a
                            href={`tel:${detail.customer_phone}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs font-semibold hover:bg-accent"
                          >
                            <Phone className="h-3 w-3" /> {detail.customer_phone}
                          </a>
                        )}
                        {detail.customer_email && (
                          <a
                            href={`mailto:${detail.customer_email}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <Mail className="h-3 w-3" />
                            <span className="max-w-[180px] truncate">{detail.customer_email}</span>
                          </a>
                        )}
                      </div>
                    </div>
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

              {/* Fulfillment (delivery vs pickup) */}
              <Section
                icon={isDelivery ? MapPin : Building2}
                title={isDelivery ? "Delivery" : isPickup ? "Pickup" : "Fulfillment"}
                action={
                  !editing && isDelivery && mapsHref ? (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-accent"
                      aria-label="Open delivery location in Google Maps"
                    >
                      <Navigation className="h-3 w-3" /> Maps
                    </a>
                  ) : undefined
                }
              >
                {!editing ? (
                  isDelivery ? (
                    <div className="space-y-2 text-sm">
                      <div className="font-semibold">{addrLine ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {[addrArea, addrCity].filter(Boolean).join(", ") || "—"}
                      </div>
                      {addrLandmark && (
                        <div className="text-xs text-muted-foreground">Landmark: {addrLandmark}</div>
                      )}
                      {addrNotes && (
                        <div className="rounded-lg border border-border/60 bg-muted/60 px-3 py-2 text-xs">
                          <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Delivery notes
                          </div>
                          {addrNotes}
                        </div>
                      )}
                    </div>
                  ) : isPickup ? (
                    <div className="space-y-2 text-sm">
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                        <Building2 className="h-3 w-3" /> Pickup at branch
                      </div>
                      <div className="font-semibold">{pickupBranch?.name ?? branchName ?? "—"}</div>
                      {pickupBranch?.address && (
                        <div className="text-xs text-muted-foreground">{pickupBranch.address}</div>
                      )}
                      {pickupBranch?.phone && (
                        <a
                          href={`tel:${pickupBranch.phone}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs font-semibold hover:bg-accent"
                        >
                          <Phone className="h-3 w-3" /> {pickupBranch.phone}
                        </a>
                      )}
                      {detail.schedule_at && (
                        <div className="text-xs text-muted-foreground">
                          Pickup at {formatDateTime(detail.schedule_at)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm capitalize text-muted-foreground">
                      {detail.fulfillment_method.replace(/_/g, " ")}
                    </div>
                  )
                ) : (
                  form && (
                    <div className="grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FieldRow label="Fulfillment method">
                          <Select
                            value={form.fulfillment_method}
                            onValueChange={(v) =>
                              setForm({
                                ...form,
                                fulfillment_method: v as EditableFields["fulfillment_method"],
                              })
                            }
                          >
                            <SelectTrigger className="h-9" aria-label="Fulfillment method">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="delivery">Delivery</SelectItem>
                              <SelectItem value="pickup">Pickup</SelectItem>
                              <SelectItem value="dinein">Dine-in</SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldRow>
                        <FieldRow label="Scheduled time (optional)">
                          <Input
                            type="datetime-local"
                            aria-label="Scheduled time"
                            value={
                              form.schedule_at
                                ? (() => {
                                    const d = new Date(form.schedule_at);
                                    if (Number.isNaN(d.getTime())) return "";
                                    const pad = (n: number) => String(n).padStart(2, "0");
                                    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                  })()
                                : ""
                            }
                            onChange={(e) => setForm({ ...form, schedule_at: e.target.value })}
                            className="h-9"
                          />
                        </FieldRow>
                      </div>
                      {isDelivery && (
                        <>
                          <FieldRow label="Address">
                            <Input
                              value={form.address_line}
                              onChange={(e) => setForm({ ...form, address_line: e.target.value })}
                              className="h-9"
                              aria-required
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
                                aria-required
                              />
                            </FieldRow>
                          </div>
                          <FieldRow label="Landmark">
                            <Input
                              value={form.landmark}
                              onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                              className="h-9"
                            />
                          </FieldRow>
                          <FieldRow label="Delivery instructions">
                            <Textarea
                              value={form.delivery_instructions}
                              onChange={(e) =>
                                setForm({ ...form, delivery_instructions: e.target.value })
                              }
                              rows={2}
                            />
                          </FieldRow>
                        </>
                      )}
                      {isPickup && (
                        <div className="rounded-lg border border-dashed border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                          Pickup orders don’t use a delivery address. Delivery fee will be removed
                          automatically on save.
                        </div>
                      )}
                    </div>
                  )
                )}
              </Section>

              {/* Branch selector (edit only) */}
              {editing && form && (
                <Section icon={Building2} title="Branch">
                  <FieldRow label="Branch">
                    <Select
                      value={form.branch_id || "none"}
                      onValueChange={(v) => setForm({ ...form, branch_id: v === "none" ? "" : v })}
                    >
                      <SelectTrigger className="h-9" aria-label="Branch">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Unassigned —</SelectItem>
                        {branches
                          .filter((b) => {
                            if (!b.is_active) return b.id === form.branch_id;
                            if (isDelivery && !b.delivery_available) return false;
                            if (isPickup && !b.pickup_available) return false;
                            return true;
                          })
                          .map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  {isDelivery && !form.branch_id && (
                    <p className="mt-1.5 text-[11px] text-destructive">
                      Delivery orders require a branch.
                    </p>
                  )}
                </Section>
              )}

              {/* Items */}
              <Section
                icon={ShoppingBag}
                title={`Items · ${detail.items.length}`}
                action={
                  editing && (
                    <span className="text-[10.5px] font-medium text-muted-foreground">
                      Tap qty to adjust
                    </span>
                  )
                }
              >
                <ItemsList
                  detail={detail}
                  editable={editing}
                  pendingItemId={pendingItemId}
                  onChangeQty={(itemId, qty) => itemMut.mutate({ itemId, qty })}
                />
              </Section>

              {/* Payment */}
              <Section icon={Receipt} title="Payment summary">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="tabular-nums">{formatPKR(detail.subtotal_pkr)}</dd>
                  </div>
                  {(isDelivery || detail.delivery_fee_pkr > 0) && (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">
                        Delivery fee
                        {editing && isPickup && (
                          <span className="ml-1 text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            (removed on save)
                          </span>
                        )}
                      </dt>
                      <dd className="tabular-nums">
                        {editing && form && isDelivery ? (
                          <Input
                            type="number"
                            min={0}
                            value={form.delivery_fee_pkr}
                            onChange={(e) =>
                              setForm({ ...form, delivery_fee_pkr: Number(e.target.value) || 0 })
                            }
                            className="h-8 w-28 text-right tabular-nums"
                            aria-label="Delivery fee"
                          />
                        ) : editing && isPickup ? (
                          <span className="text-muted-foreground line-through">
                            {formatPKR(detail.delivery_fee_pkr)}
                          </span>
                        ) : (
                          formatPKR(detail.delivery_fee_pkr)
                        )}
                      </dd>
                    </div>
                  )}
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
                          {detail.coupon_code}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </dd>
                  </div>
                  {detail.discount_pkr > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <dt>Discount</dt>
                      <dd className="tabular-nums">−{formatPKR(detail.discount_pkr)}</dd>
                    </div>
                  )}
                  <Separator className="my-1" />
                  <div className="flex items-baseline justify-between rounded-lg bg-muted/60 px-3 py-2">
                    <dt className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Grand total
                    </dt>
                    <dd className="font-display text-xl font-black tabular-nums">
                      {formatPKR(detail.total_pkr)}
                    </dd>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
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
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                            STATUS_TONE_CLASS.neutral,
                          )}
                        >
                          {detail.payment_method}
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </Section>

              {/* Customer notes (read only) + Internal notes (editable) */}
              {detail.notes && (
                <Section icon={StickyNote} title="Customer notes">
                  <div className="whitespace-pre-line text-sm text-foreground">{detail.notes}</div>
                </Section>
              )}

              <Section
                icon={ChefHat}
                title="Internal notes"
                action={
                  noteDirty && (
                    <span className="text-[10.5px] font-medium text-amber-600 dark:text-amber-400">
                      Unsaved
                    </span>
                  )
                }
              >
                <div className="space-y-2">
                  <Autosize
                    value={internalNote}
                    onChange={(v) => {
                      setInternalNote(v);
                      setNoteDirty(v !== (detail.special_instructions ?? ""));
                    }}
                    placeholder="Kitchen or ops notes visible only to staff…"
                    minRows={3}
                  />
                  <div className="flex items-center justify-end gap-2">
                    {noteDirty && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg"
                        onClick={() => {
                          setInternalNote(detail.special_instructions ?? "");
                          setNoteDirty(false);
                        }}
                        disabled={noteMut.isPending}
                      >
                        Reset
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1.5 rounded-lg"
                      disabled={!noteDirty || noteMut.isPending}
                      onClick={() => noteMut.mutate(internalNote)}
                    >
                      {noteMut.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Save notes
                    </Button>
                  </div>
                </div>
              </Section>

              {/* Audit history */}
              <Section
                icon={History}
                title="Audit history"
                action={
                  auditQ.isFetching && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )
                }
              >
                <AuditHistory audit={audit} />
              </Section>
            </div>

            {/* ============ Sticky footer ============ */}
            <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-border/70 bg-background/95 px-3 py-3 backdrop-blur sm:px-5">
              {editing ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditing(false);
                      setForm(null);
                    }}
                    className="rounded-lg"
                    aria-label="Discard changes"
                  >
                    Discard
                  </Button>
                  <div className="flex-1" />
                  <div className="hidden text-xs text-muted-foreground sm:block">
                    {(() => {
                      if (!form) return null;
                      if (form.fulfillment_method === "delivery") {
                        if (!form.branch_id) return <span className="text-destructive">Branch required</span>;
                        if (!form.address_line.trim() || !form.address_city.trim())
                          return <span className="text-destructive">Address required</span>;
                      }
                      return diff.length === 0
                        ? "No changes yet"
                        : `${diff.length} change${diff.length === 1 ? "" : "s"}`;
                    })()}
                  </div>
                  <Button
                    disabled={
                      diff.length === 0 ||
                      saveMut.isPending ||
                      (form?.fulfillment_method === "delivery" &&
                        (!form.branch_id ||
                          !form.address_line.trim() ||
                          !form.address_city.trim()))
                    }
                    onClick={() => setConfirmSave(true)}
                    className="rounded-lg"
                    aria-label="Review and save changes"
                  >
                    <Save className="h-4 w-4" />
                    Review &amp; save
                  </Button>
                </>
              ) : (
                <>
                  {detail.status !== "cancelled" && detail.status !== "delivered" && (
                    <Button
                      variant="outline"
                      onClick={() => setConfirmCancel(true)}
                      className="rounded-lg border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={cancelMut.isPending}
                      size="sm"
                    >
                      <XCircle className="h-4 w-4" /> Cancel
                    </Button>
                  )}
                  {detail.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg sm:hidden"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => printReceipt("invoice", detail)}
                    className="rounded-lg"
                    size="sm"
                  >
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">Invoice</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => printReceipt("kitchen", detail)}
                    className="rounded-lg"
                    size="sm"
                  >
                    <ClipboardList className="h-4 w-4" />
                    <span className="hidden sm:inline">Kitchen</span>
                  </Button>
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
                          <span className="hidden sm:inline">Mark as</span>{" "}
                          {STATUS_LABEL[upcoming]} <ArrowRight className="h-4 w-4" />
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

      {/* Cancel dialog */}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a reason. The customer will see the order as cancelled and this action is
              recorded in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Reason
              </Label>
              <Select
                value={cancelReason}
                onValueChange={(v) => setCancelReason(v as OrderCancelReason)}
              >
                <SelectTrigger className="mt-1.5 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANCEL_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {CANCEL_REASON_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Details (optional)
              </Label>
              <Textarea
                value={cancelDetails}
                onChange={(e) => setCancelDetails(e.target.value)}
                rows={2}
                placeholder="Add any context for the audit log…"
                className="mt-1.5"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg" disabled={cancelMut.isPending}>
              Keep order
            </AlertDialogCancel>
            <Button
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelMut.isPending}
              onClick={() => cancelMut.mutate({ reason: cancelReason, details: cancelDetails })}
            >
              {cancelMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Yes, cancel
            </Button>
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

import type { AdminOrderStatus } from "./admin-orders.functions";

export const STATUS_LABEL: Record<AdminOrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_STYLE: Record<AdminOrderStatus, string> = {
  pending: "bg-warning/20 text-warning-foreground border-warning/30",
  confirmed: "bg-info/15 text-info border-info/30",
  preparing: "bg-info/20 text-info border-info/40",
  ready: "bg-primary/20 text-foreground border-primary/40",
  out_for_delivery: "bg-primary/25 text-foreground border-primary/50",
  delivered: "bg-success/15 text-success-foreground border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export const STATUS_DOT: Record<AdminOrderStatus, string> = {
  pending: "bg-warning",
  confirmed: "bg-info",
  preparing: "bg-info",
  ready: "bg-primary",
  out_for_delivery: "bg-primary",
  delivered: "bg-success",
  cancelled: "bg-destructive",
};

export const STATUS_ORDER: AdminOrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];

export function nextStatus(current: AdminOrderStatus): AdminOrderStatus | null {
  if (current === "cancelled" || current === "delivered") return null;
  const idx = STATUS_ORDER.indexOf(current);
  return idx >= 0 && idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
}

export function formatPKR(v: number | null | undefined): string {
  const n = v ?? 0;
  return `PKR ${n.toLocaleString("en-PK")}`;
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

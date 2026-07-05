// Purely derived, front-end-only helpers for Orders UX polish.
// No schema changes, no new backend fields — everything is inferred from
// existing columns (status, created_at, fulfillment_method, estimated_delivery_minutes).

import type { AdminOrderRow, AdminOrderStatus } from "./admin-orders.functions";

export type OrderPriority = "urgent" | "high" | "normal";

export function orderAgeMinutes(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
}

/**
 * Derive a visual priority for an in-progress order.
 * Rules (no backend field required):
 *   - delivered/cancelled → normal (never highlighted)
 *   - > 25 min old and not yet ready → urgent
 *   - > 15 min old and not yet ready → high
 *   - otherwise → normal
 */
export function orderPriority(row: {
  status: AdminOrderStatus;
  created_at: string;
}): OrderPriority {
  if (row.status === "delivered" || row.status === "cancelled") return "normal";
  const age = orderAgeMinutes(row.created_at);
  const reachedReady =
    row.status === "ready" || row.status === "out_for_delivery";
  if (!reachedReady && age > 25) return "urgent";
  if (!reachedReady && age > 15) return "high";
  return "normal";
}

export const PRIORITY_LABEL: Record<OrderPriority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
};

export const PRIORITY_CLASS: Record<OrderPriority, string> = {
  urgent:
    "bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/30",
  high:
    "bg-amber-500/15 text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:text-amber-400",
  normal:
    "bg-muted text-muted-foreground ring-1 ring-inset ring-border/60",
};

/**
 * Rough remaining prep time (minutes) if the order still has to be worked on.
 * Derived from status only when no `estimated_delivery_minutes` is available.
 * Returns `null` for terminal states.
 */
export function estimatedPrepMinutes(row: {
  status: AdminOrderStatus;
  fulfillment_method: string;
  estimated_delivery_minutes: number | null;
  created_at: string;
}): number | null {
  if (row.status === "delivered" || row.status === "cancelled") return null;
  const base =
    row.estimated_delivery_minutes && row.estimated_delivery_minutes > 0
      ? row.estimated_delivery_minutes
      : row.fulfillment_method === "delivery"
        ? 40
        : row.fulfillment_method === "pickup"
          ? 20
          : 25;
  const stageOffset: Record<AdminOrderStatus, number> = {
    pending: 0,
    confirmed: 5,
    preparing: 10,
    ready: base - 5,
    out_for_delivery: base - 8,
    delivered: base,
    cancelled: 0,
  };
  const elapsed = orderAgeMinutes(row.created_at);
  const remaining = Math.max(0, base - Math.max(elapsed, stageOffset[row.status]));
  return remaining;
}

export function formatEta(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes === 0) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Compact re-export so components don't need to know about individual helpers.
export function decorateOrder(row: AdminOrderRow) {
  return {
    priority: orderPriority(row),
    eta: estimatedPrepMinutes(row),
    age: orderAgeMinutes(row.created_at),
  };
}

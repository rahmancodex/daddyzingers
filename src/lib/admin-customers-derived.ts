/** Derived, client-side helpers for the admin Customers module.
 *  Zero backend logic: all computations run against the payload already
 *  returned by adminListCustomers / adminGetCustomer. */

import type { AdminCustomerRow, AdminCustomerOrder } from "@/lib/admin-customers.functions";

export type CustomerSegment =
  | "new"
  | "returning"
  | "vip"
  | "frequent"
  | "high_spender"
  | "inactive";

const DAY = 24 * 60 * 60 * 1000;

export function customerSegments(r: AdminCustomerRow, now: number = Date.now()): CustomerSegment[] {
  const out: CustomerSegment[] = [];
  const createdAge = now - new Date(r.created_at).getTime();
  const lastAge = r.last_order_at ? now - new Date(r.last_order_at).getTime() : Infinity;

  if (createdAge <= 7 * DAY) out.push("new");
  if (r.total_orders >= 2 && lastAge <= 60 * DAY) out.push("returning");
  if (r.loyalty_tier === "platinum" || r.total_spend_pkr >= 50_000) out.push("vip");
  if (r.total_orders >= 10) out.push("frequent");
  if (r.total_spend_pkr >= 20_000) out.push("high_spender");
  if (r.total_orders > 0 && lastAge > 60 * DAY) out.push("inactive");
  return out;
}

export const SEGMENT_LABEL: Record<CustomerSegment, string> = {
  new: "New",
  returning: "Returning",
  vip: "VIP",
  frequent: "Frequent",
  high_spender: "High spender",
  inactive: "Inactive",
};

export const SEGMENT_STYLE: Record<CustomerSegment, string> = {
  new: "bg-info/15 text-info",
  returning: "bg-success/15 text-success-foreground",
  vip: "bg-primary/20 text-foreground",
  frequent: "bg-purple-500/15 text-purple-600 dark:text-purple-300",
  high_spender: "bg-amber-500/15 text-amber-700 dark:text-amber-200",
  inactive: "bg-muted text-muted-foreground",
};

export function averageOrderValue(r: AdminCustomerRow): number {
  if (!r.total_orders) return 0;
  return r.total_spend_pkr / r.total_orders;
}

export function shortCustomerId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

// ---------- Aggregate insights across the full list ----------

export function summarizeCustomers(rows: AdminCustomerRow[], now: number = Date.now()) {
  const total = rows.length;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  let newToday = 0;
  let returning = 0;
  let active30d = 0;
  let spendSum = 0;
  let spendCount = 0;

  for (const r of rows) {
    if (new Date(r.created_at).getTime() >= todayMs) newToday++;
    if (r.total_orders >= 2) returning++;
    if (r.last_order_at && now - new Date(r.last_order_at).getTime() <= 30 * DAY) active30d++;
    if (r.total_spend_pkr > 0) {
      spendSum += r.total_spend_pkr;
      spendCount++;
    }
  }

  return {
    total,
    newToday,
    returning,
    active30d,
    avgSpend: spendCount ? Math.round(spendSum / spendCount) : 0,
  };
}

// ---------- Timeline events derived from customer + orders ----------

export type TimelineKind =
  | "account_created"
  | "order_placed"
  | "order_delivered"
  | "order_cancelled";

export type TimelineEvent = {
  id: string;
  kind: TimelineKind;
  title: string;
  detail?: string;
  at: string; // ISO
};

export function buildTimeline(
  profile: { id: string; created_at: string; full_name: string | null },
  orders: AdminCustomerOrder[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    id: `acct-${profile.id}`,
    kind: "account_created",
    title: "Account created",
    detail: profile.full_name ?? undefined,
    at: profile.created_at,
  });

  for (const o of orders) {
    events.push({
      id: `placed-${o.id}`,
      kind: "order_placed",
      title: `Order #${o.order_number} placed`,
      detail: `${o.items_count} item${o.items_count === 1 ? "" : "s"} · ${o.fulfillment_method}`,
      at: o.created_at,
    });
    if (o.status === "delivered") {
      events.push({
        id: `delivered-${o.id}`,
        kind: "order_delivered",
        title: `Order #${o.order_number} delivered`,
        at: o.created_at,
      });
    } else if (o.status === "cancelled") {
      events.push({
        id: `cancelled-${o.id}`,
        kind: "order_cancelled",
        title: `Order #${o.order_number} cancelled`,
        at: o.created_at,
      });
    }
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return events;
}

export function orderCounts(orders: AdminCustomerOrder[]) {
  let completed = 0;
  let cancelled = 0;
  for (const o of orders) {
    if (o.status === "delivered") completed++;
    else if (o.status === "cancelled") cancelled++;
  }
  return { completed, cancelled };
}

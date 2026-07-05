import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePerm } from "@/lib/admin-guard";
import type { Json } from "@/integrations/supabase/types";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type AdminOrderStatus = (typeof ORDER_STATUSES)[number];

const StatusSchema = z.enum(ORDER_STATUSES);

const ListInput = z.object({
  status: z.union([StatusSchema, z.literal("all")]).optional(),
  search: z.string().max(120).optional(),
  limit: z.number().int().min(1).max(500).optional(),
  branch_id: z.string().uuid().nullish(),
  payment_method: z.string().max(40).nullish(),
  fulfillment_method: z.string().max(40).nullish(),
  coupon_used: z.enum(["any", "yes", "no"]).optional(),
  date_from: z.string().datetime().nullish(),
  date_to: z.string().datetime().nullish(),
});

export type AdminOrderRow = {
  id: string;
  order_number: string;
  status: AdminOrderStatus;
  subtotal_pkr: number;
  delivery_fee_pkr: number;
  tax_pkr: number;
  discount_pkr: number;
  total_pkr: number;
  payment_method: string;
  fulfillment_method: string;
  coupon_code: string | null;
  notes: string | null;
  special_instructions: string | null;
  address_snapshot: Json | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  branch_id: string | null;
  schedule_at: string | null;
  estimated_delivery_minutes: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  items_count: number;
};

export type AdminOrderItem = {
  id: string;
  product_id: string;
  name: string;
  qty: number;
  unit_price_pkr: number;
  options: Json | null;
};

export type AdminOrderDetail = AdminOrderRow & {
  items: AdminOrderItem[];
};

export type AdminOrderStats = {
  today_orders: number;
  today_revenue_pkr: number;
  pending: number;
  confirmed: number;
  preparing: number;
  ready: number;
  out_for_delivery: number;
  delivered: number;
  cancelled: number;
};

export type AdminOrderAuditEntry = {
  id: string;
  created_at: string;
  action: string;
  summary: string | null;
  actor_email: string | null;
  actor_role: string | null;
  old_value: Json | null;
  new_value: Json | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

async function attachCustomers<T extends { user_id: string; address_snapshot: Json | null }>(
  rows: T[],
): Promise<Array<T & { customer_name: string | null; customer_phone: string | null; customer_email: string | null }>> {
  if (rows.length === 0) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, phone")
    .in("id", userIds);
  const pmap = new Map<string, ProfileRow>((profiles ?? []).map((p) => [p.id, p as ProfileRow]));

  const emailMap = new Map<string, string | null>();
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      emailMap.set(id, data.user?.email ?? null);
    }),
  );

  return rows.map((r) => {
    const p = pmap.get(r.user_id);
    const snap = (r.address_snapshot && typeof r.address_snapshot === "object" && !Array.isArray(r.address_snapshot)
      ? (r.address_snapshot as { [key: string]: Json | undefined })
      : {}) as { recipient_name?: unknown; phone?: unknown };
    const snapName = typeof snap.recipient_name === "string" ? snap.recipient_name : null;
    const snapPhone = typeof snap.phone === "string" ? snap.phone : null;
    return {
      ...r,
      customer_name: p?.full_name ?? snapName ?? null,
      customer_phone: p?.phone ?? snapPhone ?? null,
      customer_email: emailMap.get(r.user_id) ?? null,
    };
  });
}

const ORDER_SELECT =
  "id, order_number, status, subtotal_pkr, delivery_fee_pkr, tax_pkr, discount_pkr, total_pkr, payment_method, fulfillment_method, coupon_code, notes, special_instructions, address_snapshot, created_at, updated_at, user_id, branch_id, schedule_at, estimated_delivery_minutes";

export const adminListOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("orders.view")])
  .inputValidator((data: unknown) => ListInput.parse(data ?? {}))
  .handler(async ({ data }): Promise<AdminOrderRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("orders")
      .select(`${ORDER_SELECT}, order_items(id)`)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);

    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.branch_id) query = query.eq("branch_id", data.branch_id);
    if (data.payment_method) query = query.eq("payment_method", data.payment_method);
    if (data.fulfillment_method) query = query.eq("fulfillment_method", data.fulfillment_method);
    if (data.coupon_used === "yes") query = query.not("coupon_code", "is", null);
    if (data.coupon_used === "no") query = query.is("coupon_code", null);
    if (data.date_from) query = query.gte("created_at", data.date_from);
    if (data.date_to) query = query.lte("created_at", data.date_to);

    const search = data.search?.trim();
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,notes.ilike.%${search}%,coupon_code.ilike.%${search}%`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const base = (rows ?? []).map((r) => ({
      ...r,
      address_snapshot: (r.address_snapshot ?? null) as Json | null,
      items_count: Array.isArray(r.order_items) ? r.order_items.length : 0,
    }));

    const withCustomer = await attachCustomers(base);

    if (search) {
      const s = search.toLowerCase();
      return withCustomer.filter(
        (r) =>
          r.order_number.toLowerCase().includes(s) ||
          (r.customer_name ?? "").toLowerCase().includes(s) ||
          (r.customer_phone ?? "").toLowerCase().includes(s) ||
          (r.customer_email ?? "").toLowerCase().includes(s) ||
          (r.coupon_code ?? "").toLowerCase().includes(s),
      );
    }
    return withCustomer;
  });

export const adminGetOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("orders.view")])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<AdminOrderDetail | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", data.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!order) return null;

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .select("id, product_id, name, qty, unit_price_pkr, options")
      .eq("order_id", order.id)
      .order("id");
    if (itemsErr) throw new Error(itemsErr.message);

    const base = {
      ...order,
      address_snapshot: (order.address_snapshot ?? null) as Json | null,
      items_count: items?.length ?? 0,
    };
    const [withCustomer] = await attachCustomers([base]);

    return {
      ...withCustomer,
      items: (items ?? []).map((it) => ({
        ...it,
        options: (it.options ?? null) as Json | null,
      })),
    };
  });

// ============ Audit helpers ============
async function writeAudit(
  context: { userId: string },
  entry: {
    action: string;
    summary?: string | null;
    entity_id: string;
    old_value?: unknown;
    new_value?: unknown;
  },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
  const { data: roleRows } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .limit(1);
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: context.userId,
    actor_email: u?.user?.email ?? null,
    actor_role: ((roleRows?.[0] as { role?: string } | undefined)?.role ?? null) as never,
    module: "orders",
    entity_type: "order",
    entity_id: entry.entity_id,
    action: entry.action,
    summary: entry.summary ?? null,
    old_value: (entry.old_value ?? null) as Json,
    new_value: (entry.new_value ?? null) as Json,
  });
}

const STATUS_LABEL: Record<AdminOrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("orders.update")])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: StatusSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prev } = await supabaseAdmin
      .from("orders")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      action: "status_changed",
      entity_id: data.id,
      summary: `Status: ${prev?.status ?? "?"} → ${data.status}`,
      old_value: { status: prev?.status ?? null },
      new_value: { status: data.status },
    });
    return { ok: true, label: STATUS_LABEL[data.status] };
  });

const UpdateOrderInput = z.object({
  id: z.string().uuid(),
  patch: z
    .object({
      notes: z.string().max(2000).nullable().optional(),
      special_instructions: z.string().max(2000).nullable().optional(),
      payment_method: z.string().max(40).optional(),
      delivery_fee_pkr: z.number().int().min(0).max(100000).optional(),
      coupon_code: z.string().max(40).nullable().optional(),
      recipient_name: z.string().max(120).nullable().optional(),
      recipient_phone: z.string().max(40).nullable().optional(),
      address_line: z.string().max(300).nullable().optional(),
      address_area: z.string().max(120).nullable().optional(),
      address_city: z.string().max(120).nullable().optional(),
      delivery_instructions: z.string().max(500).nullable().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, "Empty patch"),
  changes_summary: z.string().max(500).optional(),
});

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("orders.update")])
  .inputValidator((data: unknown) => UpdateOrderInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prev, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select(
        "notes, special_instructions, payment_method, delivery_fee_pkr, coupon_code, discount_pkr, subtotal_pkr, tax_pkr, total_pkr, address_snapshot",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!prev) throw new Error("Order not found");

    const p = data.patch;
    const update: Record<string, unknown> = {};
    if (p.notes !== undefined) update.notes = p.notes;
    if (p.special_instructions !== undefined) update.special_instructions = p.special_instructions;
    if (p.payment_method !== undefined) update.payment_method = p.payment_method;
    if (p.coupon_code !== undefined) update.coupon_code = p.coupon_code;

    // Delivery fee changes total
    let newTotal = prev.total_pkr;
    if (p.delivery_fee_pkr !== undefined) {
      update.delivery_fee_pkr = p.delivery_fee_pkr;
      newTotal =
        (prev.subtotal_pkr ?? 0) +
        (p.delivery_fee_pkr ?? 0) +
        (prev.tax_pkr ?? 0) -
        (prev.discount_pkr ?? 0);
      update.total_pkr = newTotal;
    }

    // Address snapshot merge
    const addrKeys = [
      "recipient_name",
      "recipient_phone",
      "address_line",
      "address_area",
      "address_city",
      "delivery_instructions",
    ] as const;
    const hasAddr = addrKeys.some((k) => p[k] !== undefined);
    if (hasAddr) {
      const prevSnap =
        prev.address_snapshot && typeof prev.address_snapshot === "object" && !Array.isArray(prev.address_snapshot)
          ? (prev.address_snapshot as Record<string, unknown>)
          : {};
      const nextSnap = { ...prevSnap };
      if (p.recipient_name !== undefined) nextSnap.recipient_name = p.recipient_name;
      if (p.recipient_phone !== undefined) nextSnap.phone = p.recipient_phone;
      if (p.address_line !== undefined) nextSnap.address_line = p.address_line;
      if (p.address_area !== undefined) nextSnap.area = p.address_area;
      if (p.address_city !== undefined) nextSnap.city = p.address_city;
      if (p.delivery_instructions !== undefined) nextSnap.notes = p.delivery_instructions;
      update.address_snapshot = nextSnap as Json;
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update(update)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await writeAudit(context, {
      action: "order_edited",
      entity_id: data.id,
      summary: data.changes_summary ?? "Order details updated",
      old_value: prev as unknown as Json,
      new_value: update as Json,
    });

    return { ok: true };
  });

const UpdateItemInput = z.object({
  order_id: z.string().uuid(),
  item_id: z.string().uuid(),
  qty: z.number().int().min(0).max(999),
});

export const adminUpdateOrderItemQty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("orders.update")])
  .inputValidator((data: unknown) => UpdateItemInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: item, error: itemErr } = await supabaseAdmin
      .from("order_items")
      .select("id, name, qty, unit_price_pkr")
      .eq("id", data.item_id)
      .eq("order_id", data.order_id)
      .maybeSingle();
    if (itemErr) throw new Error(itemErr.message);
    if (!item) throw new Error("Item not found");

    if (data.qty === 0) {
      const { error: delErr } = await supabaseAdmin
        .from("order_items")
        .delete()
        .eq("id", data.item_id);
      if (delErr) throw new Error(delErr.message);
    } else {
      const { error: upErr } = await supabaseAdmin
        .from("order_items")
        .update({ qty: data.qty })
        .eq("id", data.item_id);
      if (upErr) throw new Error(upErr.message);
    }

    // Recompute totals from remaining items
    const { data: remaining } = await supabaseAdmin
      .from("order_items")
      .select("qty, unit_price_pkr")
      .eq("order_id", data.order_id);
    const newSubtotal = (remaining ?? []).reduce(
      (acc, r) => acc + (r.qty ?? 0) * (r.unit_price_pkr ?? 0),
      0,
    );
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("delivery_fee_pkr, tax_pkr, discount_pkr")
      .eq("id", data.order_id)
      .maybeSingle();
    const newTotal =
      newSubtotal +
      (order?.delivery_fee_pkr ?? 0) +
      (order?.tax_pkr ?? 0) -
      (order?.discount_pkr ?? 0);
    await supabaseAdmin
      .from("orders")
      .update({ subtotal_pkr: newSubtotal, total_pkr: newTotal })
      .eq("id", data.order_id);

    await writeAudit(context, {
      action: data.qty === 0 ? "item_removed" : "item_qty_changed",
      entity_id: data.order_id,
      summary:
        data.qty === 0
          ? `Removed item "${item.name}"`
          : `Qty for "${item.name}": ${item.qty} → ${data.qty}`,
      old_value: { item_id: data.item_id, qty: item.qty },
      new_value: { item_id: data.item_id, qty: data.qty },
    });

    return { ok: true };
  });

export const adminOrderAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("orders.view")])
  .inputValidator((data: unknown) =>
    z.object({ order_id: z.string().uuid(), limit: z.number().int().min(1).max(200).optional() }).parse(data),
  )
  .handler(async ({ data }): Promise<AdminOrderAuditEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("audit_logs")
      .select("id, created_at, action, summary, actor_email, actor_role, old_value, new_value")
      .eq("module", "orders")
      .eq("entity_id", data.order_id)
      .order("created_at", { ascending: true })
      .limit(data.limit ?? 100);
    if (error) throw new Error(error.message);
    return (rows ?? []) as AdminOrderAuditEntry[];
  });

export const adminBranchesForOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requirePerm("orders.view")])
  .handler(async (): Promise<{ id: string; name: string }[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("branches")
      .select("id, name")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; name: string }[];
  });

export const adminOrderStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("orders.view")])
  .handler(async (): Promise<AdminOrderStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const iso = startOfDay.toISOString();

    const { data: todayRows, error } = await supabaseAdmin
      .from("orders")
      .select("total_pkr, status")
      .gte("created_at", iso);
    if (error) throw new Error(error.message);

    const stats: AdminOrderStats = {
      today_orders: 0,
      today_revenue_pkr: 0,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
    };

    for (const r of todayRows ?? []) {
      stats.today_orders += 1;
      if (r.status !== "cancelled") stats.today_revenue_pkr += r.total_pkr ?? 0;
    }

    const { data: openRows } = await supabaseAdmin
      .from("orders")
      .select("status")
      .in("status", ["pending", "confirmed", "preparing", "ready", "out_for_delivery"]);
    for (const r of openRows ?? []) {
      const k = r.status as AdminOrderStatus;
      if (k in stats) (stats[k as keyof AdminOrderStats] as number) += 1;
    }

    for (const r of todayRows ?? []) {
      if (r.status === "delivered") stats.delivered += 1;
      if (r.status === "cancelled") stats.cancelled += 1;
    }

    return stats;
  });

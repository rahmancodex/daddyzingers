import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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
  limit: z.number().int().min(1).max(200).optional(),
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
  address_snapshot: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  user_id: string;
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
  options: Record<string, unknown> | null;
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

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

async function attachCustomers<T extends { user_id: string; address_snapshot: Record<string, unknown> | null }>(
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
    const snap = r.address_snapshot ?? {};
    const snapName =
      typeof snap === "object" && snap && "recipient_name" in snap
        ? ((snap as Record<string, unknown>).recipient_name as string | null | undefined)
        : null;
    const snapPhone =
      typeof snap === "object" && snap && "phone" in snap
        ? ((snap as Record<string, unknown>).phone as string | null | undefined)
        : null;
    return {
      ...r,
      customer_name: p?.full_name ?? snapName ?? null,
      customer_phone: p?.phone ?? snapPhone ?? null,
      customer_email: emailMap.get(r.user_id) ?? null,
    };
  });
}

export const adminListOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ListInput.parse(data ?? {}))
  .handler(async ({ data }): Promise<AdminOrderRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, status, subtotal_pkr, delivery_fee_pkr, tax_pkr, discount_pkr, total_pkr, payment_method, fulfillment_method, coupon_code, notes, special_instructions, address_snapshot, created_at, updated_at, user_id, order_items(id)",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);

    if (data.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }

    const search = data.search?.trim();
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const base = (rows ?? []).map((r) => ({
      ...r,
      address_snapshot: (r.address_snapshot ?? null) as Record<string, unknown> | null,
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
          (r.customer_email ?? "").toLowerCase().includes(s),
      );
    }
    return withCustomer;
  });

export const adminGetOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<AdminOrderDetail | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, status, subtotal_pkr, delivery_fee_pkr, tax_pkr, discount_pkr, total_pkr, payment_method, fulfillment_method, coupon_code, notes, special_instructions, address_snapshot, created_at, updated_at, user_id",
      )
      .eq("id", data.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!order) return null;

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .select("id, product_id, name, qty, unit_price_pkr, options")
      .eq("order_id", order.id);
    if (itemsErr) throw new Error(itemsErr.message);

    const base = {
      ...order,
      address_snapshot: (order.address_snapshot ?? null) as Record<string, unknown> | null,
      items_count: items?.length ?? 0,
    };
    const [withCustomer] = await attachCustomers([base]);

    return {
      ...withCustomer,
      items: (items ?? []).map((it) => ({
        ...it,
        options: (it.options ?? null) as Record<string, unknown> | null,
      })),
    };
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: StatusSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminOrderStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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

    // Also count non-terminal statuses across all time so the ops team sees
    // outstanding orders even if they were placed the previous night.
    const { data: openRows } = await supabaseAdmin
      .from("orders")
      .select("status")
      .in("status", ["pending", "confirmed", "preparing", "ready", "out_for_delivery"]);
    for (const r of openRows ?? []) {
      const k = r.status as AdminOrderStatus;
      if (k in stats) (stats[k as keyof AdminOrderStats] as number) += 1;
    }

    // Terminal statuses scoped to today only.
    for (const r of todayRows ?? []) {
      if (r.status === "delivered") stats.delivered += 1;
      if (r.status === "cancelled") stats.cancelled += 1;
    }

    return stats;
  });

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
  exclude_cancelled: z.boolean().optional(),
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
  before_state: Json | null;
  after_state: Json | null;
  metadata: Json | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

// ============ Customer attach helper ============
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

type OrderRaw = {
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
};

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
    else if (data.exclude_cancelled) query = query.neq("status", "cancelled");
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

    const base = (rows ?? []).map((r) => {
      const rec = r as unknown as OrderRaw & { order_items?: unknown[] };
      return {
        ...(rec as OrderRaw),
        items_count: Array.isArray(rec.order_items) ? rec.order_items.length : 0,
      };
    });

    const withCust = await attachCustomers(base);

    if (search) {
      const s = search.toLowerCase();
      const addrText = (snap: Json | null): string => {
        if (!snap || typeof snap !== "object" || Array.isArray(snap)) return "";
        const o = snap as { [k: string]: Json | undefined };
        return [o.address_line, o.area, o.city, o.landmark, o.recipient_name, o.phone]
          .map((v) => (typeof v === "string" ? v : ""))
          .join(" ")
          .toLowerCase();
      };
      return withCust.filter(
        (r) =>
          r.order_number.toLowerCase().includes(s) ||
          (r.customer_name ?? "").toLowerCase().includes(s) ||
          (r.customer_phone ?? "").toLowerCase().includes(s) ||
          (r.customer_email ?? "").toLowerCase().includes(s) ||
          (r.coupon_code ?? "").toLowerCase().includes(s) ||
          addrText(r.address_snapshot).includes(s),
      );
    }
    return withCust;
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
      .eq("order_id", (order as { id: string }).id)
      .order("id");
    if (itemsErr) throw new Error(itemsErr.message);

    const raw = order as unknown as OrderRaw;
    const [withCust] = await attachCustomers([raw]);

    return {
      ...withCust,
      items_count: items?.length ?? 0,
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
    before_state?: unknown;
    after_state?: unknown;
    metadata?: Record<string, unknown>;
  },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: u }, { data: roleRows }] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(context.userId),
    supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .limit(1),
  ]);
  const { data: inserted, error } = await (supabaseAdmin as any).from("audit_logs").insert({
    actor_id: context.userId,
    actor_email: u?.user?.email ?? null,
    actor_role: ((roleRows?.[0] as { role?: string } | undefined)?.role ?? null) as never,
    action: entry.action,
    entity_type: "order",
    entity_id: entry.entity_id,
    summary: entry.summary ?? null,
    before_state: (entry.before_state ?? null) as Json,
    after_state: (entry.after_state ?? null) as Json,
    metadata: { module: "orders", ...(entry.metadata ?? {}) },
  }).select("id")
    .single();
  if (error) {
    console.error("[audit_logs insert failed]", {
      action: entry.action,
      entity_id: entry.entity_id,
      message: error.message,
      code: (error as { code?: string }).code,
    });
    throw new Error(`Audit log insert failed: ${error.message}`);
  }
  if (!inserted?.id) {
    console.error("[audit_logs insert failed] no inserted row returned", {
      action: entry.action,
      entity_id: entry.entity_id,
    });
    throw new Error("Audit log insert failed: no inserted row returned");
  }

  const { data: persisted, error: readBackError } = await supabaseAdmin
    .from("audit_logs")
    .select("id")
    .eq("id", inserted.id)
    .maybeSingle();
  if (readBackError || !persisted) {
    console.error("[audit_logs readback failed]", {
      action: entry.action,
      entity_id: entry.entity_id,
      audit_id: inserted.id,
      message: readBackError?.message,
      code: (readBackError as { code?: string } | null)?.code,
    });
    throw new Error(`Audit log verification failed${readBackError ? `: ${readBackError.message}` : ""}`);
  }
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
      summary: `Status: ${(prev as { status?: string } | null)?.status ?? "?"} → ${data.status}`,
      before_state: { status: (prev as { status?: string } | null)?.status ?? null },
      after_state: { status: data.status },
    });
    return { ok: true, label: STATUS_LABEL[data.status] };
  });

// ============ Cancel order (audit-only reason storage; no schema change) ============
export const CANCEL_REASONS = [
  "customer_cancelled",
  "kitchen_issue",
  "out_of_stock",
  "duplicate_order",
  "fake_order",
  "delivery_failed",
  "other",
] as const;
export type OrderCancelReason = (typeof CANCEL_REASONS)[number];

const CancelInput = z.object({
  id: z.string().uuid(),
  reason: z.enum(CANCEL_REASONS),
  details: z.string().max(500).optional(),
});

export const adminCancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("orders.update")])
  .inputValidator((data: unknown) => CancelInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prev } = await supabaseAdmin
      .from("orders")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    const reasonText = data.details?.trim()
      ? `${data.reason}: ${data.details.trim()}`
      : data.reason;
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit(context, {
      action: "order_cancelled",
      entity_id: data.id,
      summary: `Cancelled — ${reasonText}`,
      before_state: { status: (prev as { status?: string } | null)?.status ?? null },
      after_state: { status: "cancelled", reason: reasonText },
    });
    return { ok: true };
  });

// ============ Editable patch ============
const FulfillmentSchema = z.enum(["delivery", "pickup", "dinein"]);

const UpdateOrderInput = z.object({
  id: z.string().uuid(),
  patch: z
    .object({
      notes: z.string().max(2000).nullable().optional(),
      special_instructions: z.string().max(2000).nullable().optional(),
      payment_method: z.string().max(40).optional(),
      delivery_fee_pkr: z.number().int().min(0).max(100000).optional(),
      coupon_code: z.string().max(40).nullable().optional(),
      branch_id: z.string().uuid().nullable().optional(),
      recipient_name: z.string().max(120).nullable().optional(),
      recipient_phone: z.string().max(40).nullable().optional(),
      address_line: z.string().max(300).nullable().optional(),
      address_area: z.string().max(120).nullable().optional(),
      address_city: z.string().max(120).nullable().optional(),
      landmark: z.string().max(200).nullable().optional(),
      delivery_instructions: z.string().max(500).nullable().optional(),
      fulfillment_method: FulfillmentSchema.optional(),
      schedule_at: z.string().datetime().nullable().optional(),
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
        "notes, special_instructions, payment_method, delivery_fee_pkr, coupon_code, discount_pkr, subtotal_pkr, tax_pkr, total_pkr, address_snapshot, branch_id, fulfillment_method, schedule_at",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!prev) throw new Error("Order not found");
    const prevRow = prev as unknown as Record<string, unknown>;

    const p = data.patch;
    const update: Record<string, unknown> = {};
    if (p.notes !== undefined) update.notes = p.notes;
    if (p.special_instructions !== undefined) update.special_instructions = p.special_instructions;
    if (p.payment_method !== undefined) update.payment_method = p.payment_method;
    if (p.coupon_code !== undefined) update.coupon_code = p.coupon_code;
    if (p.branch_id !== undefined) update.branch_id = p.branch_id;
    if (p.schedule_at !== undefined) update.schedule_at = p.schedule_at;
    if (p.fulfillment_method !== undefined) update.fulfillment_method = p.fulfillment_method;

    // Resolve effective values for validation + fee recomputation
    const effectiveMethod =
      (p.fulfillment_method ?? (prevRow.fulfillment_method as string | null) ?? "delivery") as
        | "delivery" | "pickup" | "dinein";
    const effectiveBranchId =
      p.branch_id !== undefined ? p.branch_id : ((prevRow.branch_id as string | null) ?? null);

    const prevSnap =
      prevRow.address_snapshot && typeof prevRow.address_snapshot === "object" && !Array.isArray(prevRow.address_snapshot)
        ? (prevRow.address_snapshot as Record<string, unknown>)
        : {};

    let branchFee: number | null = null;
    if (effectiveBranchId) {
      const { data: b } = await supabaseAdmin
        .from("branches")
        .select("id, is_active, delivery_charges, delivery_available, pickup_available")
        .eq("id", effectiveBranchId)
        .maybeSingle();
      if (!b) throw new Error("Selected branch does not exist");
      if (!b.is_active) throw new Error("Selected branch is inactive");
      if (effectiveMethod === "delivery" && !b.delivery_available) {
        throw new Error("Selected branch does not support delivery");
      }
      if (effectiveMethod === "pickup" && !b.pickup_available) {
        throw new Error("Selected branch does not support pickup");
      }
      branchFee = typeof b.delivery_charges === "number" ? b.delivery_charges : null;
    }

    if (effectiveMethod === "delivery") {
      const line =
        p.address_line !== undefined ? p.address_line : (prevSnap.address_line as string | null | undefined);
      const city =
        p.address_city !== undefined ? p.address_city : (prevSnap.city as string | null | undefined);
      if (!line || !String(line).trim() || !city || !String(city).trim()) {
        throw new Error("Delivery orders require an address (line + city)");
      }
      if (!effectiveBranchId) {
        throw new Error("Delivery orders require a branch");
      }
    }

    const addrKeys = [
      "recipient_name",
      "recipient_phone",
      "address_line",
      "address_area",
      "address_city",
      "landmark",
      "delivery_instructions",
    ] as const;
    const hasAddr = addrKeys.some((k) => p[k] !== undefined);
    if (hasAddr) {
      const nextSnap: Record<string, unknown> = { ...prevSnap };
      if (p.recipient_name !== undefined) nextSnap.recipient_name = p.recipient_name;
      if (p.recipient_phone !== undefined) nextSnap.phone = p.recipient_phone;
      if (p.address_line !== undefined) nextSnap.address_line = p.address_line;
      if (p.address_area !== undefined) nextSnap.area = p.address_area;
      if (p.address_city !== undefined) nextSnap.city = p.address_city;
      if (p.landmark !== undefined) nextSnap.landmark = p.landmark;
      if (p.delivery_instructions !== undefined) nextSnap.notes = p.delivery_instructions;
      update.address_snapshot = nextSnap as Json;
    }

    // Authoritative delivery-fee recomputation. Never keep stale delivery
    // charges when switching to pickup. When switching to delivery or
    // changing branch, resolve fresh from settings + branch override.
    const methodChanged = p.fulfillment_method !== undefined && p.fulfillment_method !== prevRow.fulfillment_method;
    const branchChanged = p.branch_id !== undefined && p.branch_id !== prevRow.branch_id;
    const feeExplicit = p.delivery_fee_pkr !== undefined;

    let newDeliveryFee = Number(prevRow.delivery_fee_pkr) || 0;
    if (effectiveMethod !== "delivery") {
      newDeliveryFee = 0;
    } else if (methodChanged || branchChanged) {
      const { data: settings } = await supabaseAdmin
        .from("restaurant_settings")
        .select("delivery_settings")
        .eq("singleton", true)
        .maybeSingle();
      const ds = ((settings?.delivery_settings ?? {}) as Record<string, unknown>);
      const defaultFee = typeof ds.default_fee === "number" ? ds.default_fee : 0;
      const freeThreshold = typeof ds.free_delivery_threshold === "number" ? ds.free_delivery_threshold : 0;
      const base = branchFee != null ? branchFee : defaultFee;
      const subtotal = Number(prevRow.subtotal_pkr) || 0;
      newDeliveryFee =
        freeThreshold > 0 && subtotal >= freeThreshold ? 0 : Math.max(0, Math.round(base));
    } else if (feeExplicit) {
      newDeliveryFee = p.delivery_fee_pkr!;
    }

    if (newDeliveryFee !== (Number(prevRow.delivery_fee_pkr) || 0)) {
      update.delivery_fee_pkr = newDeliveryFee;
      const newTotal =
        (Number(prevRow.subtotal_pkr) || 0) +
        newDeliveryFee +
        (Number(prevRow.tax_pkr) || 0) -
        (Number(prevRow.discount_pkr) || 0);
      update.total_pkr = newTotal;
    }

    if (Object.keys(update).length === 0) {
      return { ok: true };
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update(update as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Per-field audit diff restricted to what actually changed
    const ADDR_MAP: Record<string, string> = {
      recipient_name: "recipient_name",
      recipient_phone: "phone",
      address_line: "address_line",
      address_area: "area",
      address_city: "city",
      landmark: "landmark",
      delivery_instructions: "notes",
    };
    const oldDiff: Record<string, unknown> = {};
    const newDiff: Record<string, unknown> = {};
    const labels: string[] = [];
    const norm = (v: unknown) => (v === undefined || v === "" ? null : v);
    for (const [k, v] of Object.entries(p)) {
      if (v === undefined) continue;
      if (k in ADDR_MAP) {
        const snapKey = ADDR_MAP[k];
        const before = norm(prevSnap[snapKey]);
        const after = norm(v);
        if (before !== after) {
          oldDiff[k] = before;
          newDiff[k] = after;
          labels.push(`${k.replace(/_/g, " ")}`);
        }
      } else {
        const before = norm(prevRow[k]);
        const after = norm(v);
        if (before !== after) {
          oldDiff[k] = before;
          newDiff[k] = after;
          labels.push(`${k.replace(/_/g, " ")}`);
        }
      }
    }
    if (update.delivery_fee_pkr !== undefined && !("delivery_fee_pkr" in newDiff)) {
      oldDiff.delivery_fee_pkr = Number(prevRow.delivery_fee_pkr) || 0;
      newDiff.delivery_fee_pkr = update.delivery_fee_pkr;
      if (!labels.includes("delivery fee")) labels.push("delivery fee");
    }

    if (Object.keys(newDiff).length > 0) {
      await writeAudit(context, {
        action: "order_edited",
        entity_id: data.id,
        summary:
          data.changes_summary?.trim() ||
          (labels.length ? `Order edited by Admin — ${labels.join(", ")}` : "Order edited by Admin"),
        before_state: oldDiff as Json,
        after_state: newDiff as Json,
      });
    }

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
    const orderRow = (order ?? {}) as { delivery_fee_pkr?: number; tax_pkr?: number; discount_pkr?: number };
    const newTotal =
      newSubtotal +
      (orderRow.delivery_fee_pkr ?? 0) +
      (orderRow.tax_pkr ?? 0) -
      (orderRow.discount_pkr ?? 0);
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
      before_state: { item_id: data.item_id, qty: item.qty },
      after_state: { item_id: data.item_id, qty: data.qty },
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
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("audit_logs")
      .select("id, created_at, action, summary, actor_email, actor_role, before_state, after_state, metadata, entity_type, entity_id")
      .eq("entity_type", "order")
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

const StatsInput = z.object({ today_start: z.string().datetime().optional() }).optional();

export const adminOrderStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requirePerm("orders.view")])
  .inputValidator((data: unknown) => StatsInput.parse(data))
  .handler(async ({ data }): Promise<AdminOrderStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const iso = data?.today_start ?? (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    })();

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

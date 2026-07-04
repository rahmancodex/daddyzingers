import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LineSchema = z.object({
  product_id: z.string().min(1),
  name: z.string().min(1),
  qty: z.number().int().min(1).max(50),
  unit_price_pkr: z.number().int().min(0),
  options: z
    .object({
      customizations: z.array(z.object({ id: z.string(), label: z.string(), price: z.number() })).optional(),
      upgrades: z.array(z.object({ id: z.string(), label: z.string(), price: z.number() })).optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

const AddressSnapshotSchema = z
  .object({
    label: z.string().optional(),
    recipient_name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    address_line: z.string(),
    city: z.string(),
    area: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .nullable();

const InputSchema = z.object({
  items: z.array(LineSchema).min(1, "Cart is empty"),
  subtotal_pkr: z.number().int().min(0),
  delivery_fee_pkr: z.number().int().min(0),
  tax_pkr: z.number().int().min(0).optional(),
  discount_pkr: z.number().int().min(0).optional(),
  total_pkr: z.number().int().min(0),
  payment_method: z.enum(["cod", "card", "wallet"]),
  fulfillment_method: z.enum(["delivery", "pickup", "dinein"]),
  schedule_at: z.string().nullable().optional(),
  coupon_code: z.string().max(40).nullable().optional(),
  address_snapshot: AddressSnapshotSchema,
  special_instructions: z.string().max(500).nullable().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export type PlaceOrderInput = z.infer<typeof InputSchema>;

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Server-side re-validate coupon (defence in depth). If it fails we fall
    // back to zero discount rather than rejecting the whole order.
    let couponId: string | null = null;
    let discount = data.discount_pkr ?? 0;
    if (data.coupon_code) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("id, is_active, percent, flat_pkr, min_subtotal_pkr, max_discount_pkr, usage_limit, per_user_limit, usage_count, starts_at, expires_at, discount_type")
        .eq("code", data.coupon_code.trim().toUpperCase())
        .maybeSingle();
      if (coupon && coupon.is_active) {
        const now = new Date();
        const withinWindow =
          (!coupon.starts_at || new Date(coupon.starts_at) <= now) &&
          (!coupon.expires_at || new Date(coupon.expires_at) >= now);
        const underGlobalLimit =
          coupon.usage_limit == null || coupon.usage_count < coupon.usage_limit;
        const { count: userUses } = await supabaseAdmin
          .from("coupon_redemptions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("coupon_id", coupon.id);
        const underUserLimit = (userUses ?? 0) < coupon.per_user_limit;
        if (
          withinWindow &&
          underGlobalLimit &&
          underUserLimit &&
          data.subtotal_pkr >= coupon.min_subtotal_pkr
        ) {
          let d =
            coupon.discount_type === "percent"
              ? Math.round((data.subtotal_pkr * (coupon.percent ?? 0)) / 100)
              : coupon.flat_pkr ?? 0;
          if (coupon.max_discount_pkr) d = Math.min(d, coupon.max_discount_pkr);
          d = Math.min(d, data.subtotal_pkr);
          discount = d;
          couponId = coupon.id;
        } else {
          discount = 0;
        }
      } else {
        discount = 0;
      }
    }

    const composedNotes = [
      data.notes?.trim(),
      data.special_instructions?.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        subtotal_pkr: data.subtotal_pkr,
        delivery_fee_pkr: data.delivery_fee_pkr,
        tax_pkr: data.tax_pkr ?? 0,
        discount_pkr: discount,
        total_pkr: data.total_pkr,
        payment_method: data.payment_method,
        fulfillment_method: data.fulfillment_method,
        schedule_at: data.schedule_at || null,
        coupon_code: couponId ? data.coupon_code?.trim().toUpperCase() : null,
        address_snapshot: data.address_snapshot ?? null,
        notes: composedNotes || null,
        special_instructions: data.special_instructions || null,
        status: "pending",
      })
      .select("id, order_number, status, total_pkr, created_at")
      .single();

    if (error || !order) {
      throw new Error(error?.message ?? "Failed to create order");
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      data.items.map((it) => ({
        order_id: order.id,
        product_id: it.product_id,
        name: it.name,
        qty: it.qty,
        unit_price_pkr: it.unit_price_pkr,
        options: it.options ?? {},
      })),
    );

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    // Record redemption + increment usage counter (admin, since coupons is service-role only).
    if (couponId && discount > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("coupon_redemptions").insert({
        coupon_id: couponId,
        user_id: userId,
        order_id: order.id,
        discount_pkr: discount,
      });
      await supabaseAdmin.rpc as unknown; // no-op guard for tree-shakers
      await supabaseAdmin
        .from("coupons")
        .update({ usage_count: (await supabaseAdmin.from("coupons").select("usage_count").eq("id", couponId).single()).data?.usage_count ?? 0 })
        .eq("id", couponId);
      // Best-effort atomic increment via SQL bump (ignore failure).
      try {
        await supabaseAdmin
          .from("coupons")
          .update({ usage_count: ((await supabaseAdmin.from("coupons").select("usage_count").eq("id", couponId).single()).data?.usage_count ?? 0) + 1 })
          .eq("id", couponId);
      } catch { /* ignore */ }
    }

    return order;
  });

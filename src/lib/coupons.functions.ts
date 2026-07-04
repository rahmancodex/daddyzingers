import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

const InputSchema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal_pkr: z.number().int().min(0),
});

/**
 * Public coupon validation.
 * Uses a privileged server client to look up coupons (they are not exposed to
 * the browser via RLS) and enforces every rule server-side:
 *   - active + within start/expiry window
 *   - min subtotal
 *   - global usage_limit
 *   - per-user usage_limit (only if request is authenticated)
 *
 * Returns a small DTO the checkout store already understands.
 */
export const validateCouponServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const supabaseAdmin = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const code = data.code.trim().toUpperCase();
    const { data: coupon, error } = await supabaseAdmin
      .from("coupons")
      .select(
        "id, code, label, description, discount_type, percent, flat_pkr, min_subtotal_pkr, max_discount_pkr, usage_limit, per_user_limit, usage_count, starts_at, expires_at, is_active",
      )
      .eq("code", code)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!coupon || !coupon.is_active) {
      return { ok: false as const, error: "Invalid coupon code" };
    }
    const now = new Date();
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return { ok: false as const, error: "This coupon isn't active yet" };
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return { ok: false as const, error: "This coupon has expired" };
    }
    if (coupon.usage_limit != null && coupon.usage_count >= coupon.usage_limit) {
      return { ok: false as const, error: "This coupon has reached its limit" };
    }
    if (data.subtotal_pkr < coupon.min_subtotal_pkr) {
      const gap = coupon.min_subtotal_pkr - data.subtotal_pkr;
      return {
        ok: false as const,
        error: `Add Rs ${gap.toLocaleString("en-PK")} more to use ${code}`,
      };
    }

    // Best-effort per-user check when a bearer is attached.
    try {
      const req = getRequest();
      const auth = req?.headers.get("authorization");
      if (auth?.startsWith("Bearer ")) {
        const token = auth.slice(7);
        const { data: claims } = await supabaseAdmin.auth.getClaims(token);
        const uid = claims?.claims?.sub;
        if (uid) {
          const { count } = await supabaseAdmin
            .from("coupon_redemptions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", uid)
            .eq("coupon_id", coupon.id);
          if ((count ?? 0) >= coupon.per_user_limit) {
            return {
              ok: false as const,
              error: "You've already used this coupon",
            };
          }
        }
      }
    } catch {
      // Non-fatal — final enforcement happens in placeOrder.
    }

    return {
      ok: true as const,
      coupon: {
        code: coupon.code,
        label: coupon.label,
        percent: coupon.percent ?? undefined,
        flat: coupon.flat_pkr ?? undefined,
        minSubtotal: coupon.min_subtotal_pkr,
      },
    };
  });

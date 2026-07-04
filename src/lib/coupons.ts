import type { AppliedCoupon } from "./checkout-store";
import { validateCouponServer } from "./coupons.functions";

export type CouponResult =
  | { ok: true; coupon: AppliedCoupon }
  | { ok: false; error: string };

/**
 * Thin client wrapper. Delegates to a Supabase-backed server function so the
 * coupon list stays server-side and every rule (active window, limits, min
 * subtotal, per-user cap) is enforced with the service role.
 */
export async function validateCoupon(rawCode: string, subtotal: number): Promise<CouponResult> {
  const code = rawCode.trim();
  if (!code) return { ok: false, error: "Enter a coupon code" };
  try {
    const res = await validateCouponServer({
      data: { code, subtotal_pkr: Math.max(0, Math.round(subtotal)) },
    });
    return res as CouponResult;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not validate coupon",
    };
  }
}

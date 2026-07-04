import type { AppliedCoupon } from "./checkout-store";

/**
 * Local coupon registry. Future-ready for Supabase validation:
 * swap `validateCoupon` to hit a server function without changing callers.
 */
export const COUPONS: (AppliedCoupon & { description: string })[] = [
  {
    code: "WELCOME10",
    label: "Welcome 10% off",
    description: "10% off your first order",
    percent: 10,
    minSubtotal: 500,
  },
  {
    code: "ZINGER20",
    label: "Zinger 20% off",
    description: "20% off orders above Rs 1,500",
    percent: 20,
    minSubtotal: 1500,
  },
  {
    code: "FREESHIP",
    label: "Free delivery",
    description: "Flat Rs 150 off (covers delivery)",
    flat: 150,
    minSubtotal: 800,
  },
];

export type CouponResult =
  | { ok: true; coupon: AppliedCoupon }
  | { ok: false; error: string };

export async function validateCoupon(rawCode: string, subtotal: number): Promise<CouponResult> {
  // Simulate a lightweight network round-trip so UI can show a loading state.
  await new Promise((r) => setTimeout(r, 550));
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a coupon code" };
  const found = COUPONS.find((c) => c.code === code);
  if (!found) return { ok: false, error: "Invalid coupon code" };
  if (found.minSubtotal && subtotal < found.minSubtotal) {
    return {
      ok: false,
      error: `Add Rs ${(found.minSubtotal - subtotal).toLocaleString("en-PK")} more to use ${code}`,
    };
  }
  return { ok: true, coupon: found };
}

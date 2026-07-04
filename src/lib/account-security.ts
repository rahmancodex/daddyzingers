/**
 * Phase 4A — Account security & Daddy Pass foundation (types only).
 *
 * No database tables or UI ship with this file. It defines the shapes we
 * expect Phase 4B to store so that dashboards, settings, and subscription
 * flows can be built against a stable contract today.
 */

export type TwoFactorMethod = "totp" | "sms" | "whatsapp";

export type TrustedDevice = {
  id: string;
  user_id: string;
  device_name: string;
  user_agent: string;
  last_seen_at: string; // ISO
  ip_hash: string;
  trusted_until: string; // ISO
};

export type LoginEventKind =
  | "signin.password"
  | "signin.google"
  | "signin.apple"
  | "signin.phone_otp"
  | "signout"
  | "password.reset"
  | "2fa.enabled"
  | "2fa.disabled"
  | "security.alert";

export type LoginEvent = {
  id: string;
  user_id: string;
  kind: LoginEventKind;
  ip_hash: string | null;
  user_agent: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
};

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

export type DaddyPassStatus = "none" | "active" | "cancelled" | "past_due";

export type DaddyPassPlan = {
  code: "monthly" | "yearly";
  price_pkr: number;
  benefits: string[];
};

export const DADDY_PASS_PLANS: DaddyPassPlan[] = [
  {
    code: "monthly",
    price_pkr: 499,
    benefits: [
      "Unlimited free delivery",
      "Exclusive member-only discounts",
      "2x reward points on every order",
      "Priority promotions & early access",
      "Premium birthday gift",
    ],
  },
];

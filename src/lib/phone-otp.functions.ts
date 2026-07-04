/**
 * Phase 4A — Phone OTP architecture placeholder.
 *
 * This module wires the client to a server-side entry point for phone-based
 * one-time-code login. No real SMS/WhatsApp provider is connected yet — we
 * ship the shape of the API so Phase 4B can plug in Twilio / Vonage / the
 * WhatsApp Cloud API without touching UI code.
 *
 * When implementing:
 *   1. Add provider credentials via `secrets--add_secret`
 *      (e.g. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID).
 *   2. Replace the stub bodies below with the provider SDK call.
 *   3. Issue a Supabase session on successful verification via the Admin API
 *      (createUser / linkIdentity) or migrate to Supabase Phone Auth.
 */

import { createServerFn } from "@tanstack/react-start";
import { pkPhoneSchema, otpSchema } from "./auth-schemas";

export const sendPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((data: { phone: string }) => ({ phone: pkPhoneSchema.parse(data.phone) }))
  .handler(async ({ data }) => {
    // TODO(phase-4B): call SMS provider here. For now, return a stub.
    return {
      ok: true as const,
      provider: "stub" as const,
      phone: data.phone,
      cooldownSeconds: 60,
      message: "SMS provider is not connected yet — architecture is ready.",
    };
  });

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((data: { phone: string; code: string }) => ({
    phone: pkPhoneSchema.parse(data.phone),
    code: otpSchema.parse(data.code),
  }))
  .handler(async () => {
    // TODO(phase-4B): verify code with provider, then mint a Supabase session.
    return {
      ok: false as const,
      reason: "not_implemented" as const,
      message: "Phone login will unlock once an SMS provider is connected.",
    };
  });

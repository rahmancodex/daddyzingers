# Phase 4A — Authentication & Customer Identity

Scope: authentication surfaces + profile foundation only. Homepage, Menu, Cart, Checkout untouched. No color/type/branding changes — reuse the existing Daddy Zinger tokens (brand black, primary red, display font) already used in `src/routes/auth.tsx`.

## 1. Audit (what exists today)

- `src/routes/auth.tsx` — email/password + Google via `lovable.auth.signInWithOAuth`, Tabs (signin/signup), forgot-password inline link. Good design baseline — extend, don't redesign.
- `src/routes/auth.callback.tsx` — OAuth return.
- `src/routes/reset-password.tsx` — password reset.
- `src/routes/_authenticated/route.tsx` — integration-managed gate (do not touch).
- `src/lib/auth.tsx` — `AuthProvider` with `session`, `user`, `signOut`.
- `profiles` table: `id, full_name, avatar_url, phone, marketing_opt_in, created_at, updated_at`. `handle_new_user` trigger seeds it.
- No phone/OTP, no birthday, no rewards/loyalty fields, no OTP UI component, no password strength meter, no welcome/onboarding screen.

## 2. Database (single migration)

Extend `profiles` — additive, nullable, safe with existing rows:

```
alter table public.profiles add column if not exists birthday date;
alter table public.profiles add column if not exists avatar_url text;      -- already exists, no-op guard
alter table public.profiles add column if not exists reward_points integer not null default 0;
alter table public.profiles add column if not exists loyalty_tier text not null default 'bronze';
alter table public.profiles add column if not exists daddy_pass_status text not null default 'none'; -- none | active | cancelled
alter table public.profiles add column if not exists daddy_pass_renews_at timestamptz;
alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists referral_count integer not null default 0;
alter table public.profiles add column if not exists total_orders integer not null default 0;
alter table public.profiles add column if not exists total_spend_pkr integer not null default 0;
alter table public.profiles add column if not exists favorite_category text;
```

Update `handle_new_user` to also generate a `referral_code` (short random, unique) and copy `birthday` from `raw_user_meta_data` when present. Grants already exist on `profiles` — no changes needed. Types file regenerates automatically.

## 3. Reusable primitives (new)

- `src/components/auth/PasswordStrength.tsx` — 4-step meter (length, mixed case, number, symbol) + live requirement checklist.
- `src/components/auth/PasswordField.tsx` — Input with show/hide toggle, aria-label, forwardRef.
- `src/components/auth/PhoneField.tsx` — Pakistan-only phone input. Accepts `+92XXXXXXXXXX` or `03XXXXXXXXX`; normalizes to E.164 `+92…`. Zod schema `pkPhoneSchema` exported for reuse.
- `src/components/auth/OtpInput.tsx` — thin wrapper over existing shadcn `InputOTP` (6 slots, auto-focus, auto-advance, paste). Countdown + Resend handled by parent.
- `src/components/auth/AuthShell.tsx` — extracts the current split brand-panel + card layout from `auth.tsx` so signin/signup/phone/otp/welcome all share the exact same shell (spacing, ambient glows, logo, mobile fallback).
- `src/lib/auth-schemas.ts` — Zod: `emailSchema`, `passwordSchema` (min 8 + strength), `pkPhoneSchema`, `otpSchema`, `birthdaySchema` (age ≥ 13), `registerSchema`.

Reuses existing shadcn primitives (Input, Label, Button, Tabs, Checkbox, InputOTP, Sonner toast) and framer-motion — no new deps.

## 4. Auth route restructure

Convert `src/routes/auth.tsx` into a mode-switcher (Tabs stay for Sign in / Create account; adds a "Continue with phone" secondary CTA under Google):

- **Sign in**: email/password (existing) + Google (existing) + "Continue with phone" → phone step.
- **Create account** (expanded): Full name, Email, PK phone, Password (with strength + show/hide), Confirm password, Birthday (date input, ≥13), Terms checkbox (required), Marketing opt-in (optional). On submit → `supabase.auth.signUp` with `data: { full_name, phone, birthday, marketing_opt_in }` — trigger picks them up. On successful session → `/welcome`.
- **Phone step** (`?mode=phone`): PK phone entry → "Send code". Architecture-only: calls a stub `sendPhoneOtp` server fn that returns `{ ok: true, devHint }` and toasts "SMS provider not connected yet — architecture ready." No Supabase phone auth activation.
- **OTP step** (`?mode=otp`): 6-digit InputOTP, 60s countdown, resend, verify stub `verifyPhoneOtp` — clearly marked as future integration.
- **Remember me** checkbox on sign-in (Supabase JS already persists by default; when unchecked, we call `supabase.auth.signOut({ scope: 'local' })` on `beforeunload` — minimal, honest behavior).
- Apple button rendered as disabled "Coming soon" chip alongside Google (architecture placeholder, no wiring).

All transitions use framer-motion fade+slide (already in project). Reuse existing card, glow, and typography — no new colors.

## 5. Welcome / onboarding route

New public route `src/routes/welcome.tsx` (SSR-safe; if no session, redirect to `/auth`).

- Three-step slide (framer-motion): 1) "Welcome to the family, {name}" 2) Rewards & Points intro 3) Daddy Pass coming-soon teaser card.
- Skip + Continue buttons; final CTA → `/dashboard`.
- Purely presentational — reads profile via existing client.

## 6. Phone OTP architecture stub

`src/lib/phone-otp.functions.ts`:

- `sendPhoneOtp({ phone })` — validates PK phone, returns `{ ok: true, provider: 'stub' }`. Comment block documents where Twilio/Vonage/WhatsApp Cloud API would plug in.
- `verifyPhoneOtp({ phone, code })` — accepts any 6-digit code in dev; returns `{ ok: false, reason: 'not_implemented' }` in prod so it can't be used to bypass auth. No session issued.

Documented in file header as Phase-4A architecture placeholder.

## 7. Session / security scaffolding (types only)

`src/lib/account-security.ts` — exports TS types + stub functions for `TrustedDevice`, `LoginEvent`, `TwoFactorMethod`, `DaddyPassPlan`. No DB tables yet, no UI. Comments describe intended tables so Phase 4B can lift straight in.

## 8. QA pass

- Responsive check at 360, 414, 570 (current viewport), 768, 1024, 1440.
- Keyboard tab order through every field; visible focus rings (already on shadcn Input).
- ARIA labels on icon-only toggles (show/hide password).
- Toasts via existing sonner.
- Verify no changes leaked into Home / Menu / Cart / Checkout by grepping edited files.

## Files

**New**
- `src/components/auth/AuthShell.tsx`
- `src/components/auth/PasswordField.tsx`
- `src/components/auth/PasswordStrength.tsx`
- `src/components/auth/PhoneField.tsx`
- `src/components/auth/OtpInput.tsx`
- `src/lib/auth-schemas.ts`
- `src/lib/phone-otp.functions.ts`
- `src/lib/account-security.ts`
- `src/routes/welcome.tsx`
- one Supabase migration (profiles fields + trigger update)

**Edited**
- `src/routes/auth.tsx` — refactor to use AuthShell + expanded sign-up + phone/OTP mode + Apple placeholder + Remember-me.

**Untouched**
- Homepage, Menu, Cart, Checkout, existing design tokens, Supabase client files, `_authenticated` gate.

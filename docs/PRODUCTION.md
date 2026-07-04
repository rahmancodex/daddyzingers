# Daddy Zinger — Production Operations Guide

Internal reference for launching, operating, and recovering the platform.

## 1. Environment Variables

Runtime (server functions & SSR):

| Name | Purpose |
| ---- | ------- |
| `SUPABASE_URL` | Backend URL |
| `SUPABASE_PUBLISHABLE_KEY` | Public API key (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server-only key (never expose) |
| `SUPABASE_DB_URL` | Direct DB connection (migrations only) |
| `LOVABLE_API_KEY` | Lovable AI Gateway |

Client (`import.meta.env.VITE_*`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## 2. Deployment

- Frontend: click **Publish** in Lovable → deploys to `daddyzingers.lovable.app`.
- Backend (migrations, edge functions): deploy automatically on save.
- Custom domain: Project Settings → Domains.

## 3. Backup & Restore

- **Automatic**: managed nightly snapshots (7-day retention).
- **Manual**: Admin → Production → Maintenance → *Record backup snapshot*
  captures metadata into `backup_snapshots`.
- **Restore**: contact support with the snapshot ID; DB restore is a
  managed operation.

## 4. Database Structure

Key public tables (see `src/integrations/supabase/types.ts` for full schema):

- `profiles`, `user_roles`, `staff_profiles`, `staff_invitations`
- `menu_items`, `categories`, `promo_banners`, `coupons`
- `orders`, `order_items`, `order_status_events`
- `loyalty_points`, `loyalty_transactions`
- `restaurant_settings`, `branches`
- `integration_configs`, `email_templates`, `webhook_endpoints`,
  `webhook_deliveries`, `error_logs`, `backup_snapshots`, `audit_logs`

Every public table has RLS enabled and explicit `GRANT` statements.

## 5. Storage Buckets

| Bucket | Public | Contents |
| ------ | ------ | -------- |
| `avatars` | No | Customer avatars |
| `menu-images` | No | Product photos |
| `promo-banners` | No | Marketing banners |
| `brand-assets` | No | Logo / OG images |

Signed URLs are generated server-side; do not make buckets public.

## 6. Admin Roles & Permissions

Roles: `owner`, `admin`, `manager`, `kitchen`, `cashier`, `rider`,
`support`, `customer`.

The full matrix lives in `src/lib/rbac.ts` (`ROLE_PERMISSIONS`).
Highlights:

- `owner`: everything, including `production.manage`.
- `admin`: everything except production integrations.
- `manager`: orders, menu, categories, banners, coupons, reports.
- `kitchen` / `cashier` / `rider`: order operations only.
- `support`: read-only customer + order access.

Bootstrap: the first authenticated admin auto-receives the Owner role
if none exists.

## 7. Webhook Configuration

Admin → Production → Integrations → Webhooks.
- Endpoints stored in `webhook_endpoints`.
- Deliveries logged to `webhook_deliveries` with retry support.
- Public receivers live under `/api/public/*` and MUST verify signatures.

## 8. Payment Setup

Admin → Production → Payments. Supports Stripe, JazzCash, EasyPaisa,
COD. Toggle sandbox/production per provider. Secrets are stored in
`integration_configs` (owner-only RLS).

## 9. OAuth Setup

Admin → Production → Auth. Configure Google OAuth client ID/secret
and redirect URI (`{origin}/auth/callback`). Never point the redirect
URI at a protected route.

## 10. SMTP Setup

Admin → Production → Email. Configure SMTP host/port/user/pass and
sender identity. Templates edited under the Email tab; variables use
`{{double_braces}}`.

## 11. Launch Checklist

`/admin/launch` runs a live readiness check across environment,
database, storage, auth, integrations, and monitoring.

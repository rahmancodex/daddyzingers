# Admin Panel Stabilization Audit — Plan

## Approach

A single "audit everything" pass would touch 100+ files blindly and almost certainly break working modules. Instead I'll work in **sequenced waves**, verify each wave before moving on, and hand you an incremental report. No schema changes, no new features, no customer-site edits.

## Wave 0 — Shared foundations (one pass, blocks everything else)

Fix issues that affect every admin page at once:

1. **Hydration mismatch** currently in console (`data-tsd-source` diff in `__root.tsx`) — strip the dev-only source-map attribute or move the affected block so SSR/CSR agree.
2. **React Query defaults** for admin: `staleTime`, `refetchOnWindowFocus`, retry policy — one place, applied to all admin queries.
3. **Shared admin primitives**: audit `AdminPlaceholder`, standard `EmptyState`, `ErrorState`, `TableSkeleton`, `ConfirmDialog` — make sure every module reuses them (no duplicates).
4. **Toast contract**: every mutation → loading + success + failure toast via one helper.
5. **Error boundary** around `<AdminShell>` children so a single module crash doesn't blank the panel.

## Waves 1–5 — Module audits (2–3 modules per wave)

For each module I check: console/runtime/hydration errors, loading/empty/error states, pagination, search, sort, filters, CRUD, uploads, realtime, responsiveness, keyboard/a11y, duplicate requests, placeholder/mock data removal, destructive-action confirmations.

- **Wave 1**: Dashboard, Orders (highest-traffic, most complex)
- **Wave 2**: Menu, Categories (uploads, drawers)
- **Wave 3**: Customers, Coupons, Promo Banners
- **Wave 4**: Reports, Staff & Access, Audit Logs
- **Wave 5**: Settings, Production, Launch Checklist

After each wave I return a short delta report (issues found → fix → files changed) so you can course-correct before I move on.

## Non-goals (explicit)

- No new tables, columns, or RLS changes.
- No new server functions — reuse existing `admin-*.functions.ts`.
- No customer-site edits.
- No visual redesign; only replace placeholders/mocks with live data or a proper empty state.

## Deliverable per wave

- List of issues found
- List of files changed
- Any residual known limitation

## What I need from you

1. **Approve the wave sequence** (or reorder — e.g. Orders first if that's your priority).
2. **Confirm the RBAC migration in `supabase/manual/rbac_bootstrap.sql` was run** against the production DB. Without it several modules will legitimately fail with "table not found" and will look broken during the audit.
3. **Confirm a staff Owner account exists** so I can validate authenticated admin flows end-to-end during the audit.

Reply "go" (with any reordering) and I'll start Wave 0.

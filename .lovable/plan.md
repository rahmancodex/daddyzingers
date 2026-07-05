## Sprint 3 — Production-Grade Orders Management

Massive scope. Before writing code I need to lock in the schema surface and the split of work, because several requested features cannot be implemented without small, additive columns on the existing `orders` table (no new tables, no changes to customer flow).

### Schema additions required (single additive migration on `public.orders`)

The existing `orders` table has no columns for cancellation metadata, staff assignment, internal notes, or trash. Everything else can reuse existing columns (`notes`, `special_instructions`, `address_snapshot`, `branch_id`, `status`, `estimated_delivery_minutes`).

Proposed additive columns (all nullable, no data migration, no RLS change beyond mirroring current admin policy):

```
alter table public.orders
  add column cancellation_reason text,
  add column cancelled_by uuid references auth.users(id),
  add column cancelled_at timestamptz,
  add column assigned_staff_id uuid references auth.users(id),
  add column assigned_rider_id uuid references auth.users(id),
  add column internal_notes text,
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id);
```

Everything is nullable/backfill-free. Existing customer checkout, customer tracking, and RLS keep working unchanged. If you'd rather I keep the module strictly zero-schema, I'll drop features #10 (reasons), #11 (cancelled section metadata), #12 (trash), #17 (internal notes), #19 (assignment) and just deliver UI + status quick-actions + editing on existing columns.

### Delivery structure (single sprint, one turn)

**A. Backend (`src/lib/admin-orders.functions.ts`)**
- Extend `adminListOrders` filters: add `assignedStaffId`, `trashed` flag; keep existing branch/payment/etc.
- Extend `adminUpdateOrder` to accept the new editable fields (customer name/phone via `address_snapshot` merge, landmark, special_instructions, branch, payment_method, assigned_staff_id, assigned_rider_id, internal_notes) — each diff written to `audit_logs`.
- New `adminCancelOrder({ id, reason })` — sets status=cancelled + cancellation_reason + cancelled_by/at, audit log.
- New `adminSoftDeleteOrder`, `adminRestoreOrder`, `adminHardDeleteOrder` (owner/admin gated via `has_role`).
- New `adminListStaff` (reuse existing staff query) for assignment dropdowns.

**B. Orders list (`OrdersContent.tsx`)**
- Read filters from URL search params (`validateSearch` + `zodValidator`) so dashboard cards can deep-link with `?status=pending&range=today` etc.
- New premium FilterBar row: DateRange, Search, Status, Branch, Payment, Fulfillment, Coupon, Sort, Export CSV.
- `DataTable` row: customer avatar+name, order#, items count, payment pill, coupon pill, branch, assigned staff avatar, created (relative), ETA, total, status pill, quick-action popover (advance status, cancel, open drawer).
- Inline status advance with optimistic update + toast + audit.
- Tabs: **Active / Cancelled / Trash** (trash = owner/admin only).
- Realtime channel on `orders` invalidates query.

**C. Order Details Drawer (`OrderDetailsDrawer.tsx`)**
- Sectioned: Customer · Delivery · Items · Payment · Coupon · Assignment · Internal Notes · Timeline · Audit.
- All fields editable inline; Save opens a diff-review dialog (already exists — extend to new fields).
- Simplified restaurant timeline: Preparing → Ready → Delivered, with red Cancelled branch showing reason & actor.
- Kitchen ops panel with large touch buttons: Preparing / Ready / Handed to Rider / Delivered.
- Cancel Order flow with reason select (Customer Cancelled, Kitchen Issue, Out of Stock, Duplicate, Fake, Delivery Failed, Other + free text).
- Sticky footer: Save · Update Status · Cancel Order · Print Invoice · Close.
- Print Invoice + Kitchen Receipt via `window.print()` on a hidden print-only template (no PDF lib to keep bundle lean; browser "Save as PDF" covers the download requirement).
- Internal Notes textarea with debounced autosave + "Saved" indicator; never surfaced to customer queries.

**D. Dashboard integration (`AdminDashboardContent.tsx`)**
- Make the six KPI cards (`Orders Today`, `Revenue Today`, `Pending`, `Preparing`, `Delivered`, `Cancelled`) `<Link>`s to `/admin/orders?...` with the correct pre-applied search params. No new page.

**E. Sidebar (`admin-nav.ts`)**
- Add "Cancelled" and "Trash" as sub-links under Orders (owner/admin sees Trash).

**F. Customer tracking**
- Verify the customer-facing tracker maps internal statuses to the coarse set (Preparing / Ready / On the way / Delivered / Cancelled). No UI redesign of customer pages — only a mapping helper in `src/lib/admin-orders.ts` (already partly there) reused where needed. If mapping is already correct I leave the customer view untouched.

### Explicitly NOT doing
- No new tables, no changes to `order_items`, no changes to checkout/cart, no redesign of customer website.
- No PDF library — printing via browser print CSS.
- No new realtime infra — reusing existing channel subscription.

### Please confirm one thing

Do you approve the additive `orders` columns above? Options:

1. **Yes, apply the migration** — full sprint as scoped.
2. **No schema changes** — I ship UI + quick status + editing on existing columns only, and drop cancellation reasons, staff assignment, internal notes, and trash.

Once you pick, I execute in one turn: migration (if #1) → backend fns → OrdersContent → OrderDetailsDrawer → Dashboard links → sidebar.

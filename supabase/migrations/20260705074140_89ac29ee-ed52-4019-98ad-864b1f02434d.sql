-- Sprint 3 Orders additive columns. No data migration. All nullable.
alter table public.orders
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null,
  add column if not exists cancelled_at timestamptz,
  add column if not exists assigned_staff_id uuid references auth.users(id) on delete set null,
  add column if not exists assigned_rider_id uuid references auth.users(id) on delete set null,
  add column if not exists internal_notes text,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists orders_deleted_at_idx on public.orders (deleted_at) where deleted_at is not null;
create index if not exists orders_assigned_staff_idx on public.orders (assigned_staff_id) where assigned_staff_id is not null;
create index if not exists orders_assigned_rider_idx on public.orders (assigned_rider_id) where assigned_rider_id is not null;
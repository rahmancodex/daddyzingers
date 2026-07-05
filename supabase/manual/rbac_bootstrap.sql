-- =====================================================================
-- RBAC Bootstrap Migration (idempotent, safe to run on production)
-- =====================================================================
-- Creates ONLY the missing RBAC objects. Does not touch customer,
-- order, menu, or any other existing tables.
--
-- Objects created (if missing):
--   * enum      public.app_role
--   * table     public.user_roles
--   * table     public.staff_profiles
--   * table     public.staff_invitations
--   * table     public.audit_logs
--   * functions public.has_role / has_any_role / is_staff /
--               current_user_top_role / prevent_last_owner_removal /
--               touch_updated_at
--   * triggers  updated_at + last-owner guard
--   * indexes, GRANTs, RLS policies
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. app_role enum
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'owner','admin','manager','cashier','kitchen','rider','support','customer'
    );
  END IF;
END $$;

-- Backfill any missing enum values (safe on existing enum)
DO $$
DECLARE v text;
BEGIN
  FOREACH v IN ARRAY ARRAY['owner','admin','manager','cashier','kitchen','rider','support','customer'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'app_role' AND e.enumlabel = v
    ) THEN
      EXECUTE format('ALTER TYPE public.app_role ADD VALUE %L', v);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 2. Shared updated_at trigger function
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------
-- 3. user_roles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.app_role NOT NULL,
  granted_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role    ON public.user_roles(role);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL    ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 4. Role helper functions (SECURITY DEFINER — safe for RLS)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner','admin','manager','kitchen','cashier','rider','support')
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_top_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'owner'   THEN 1
    WHEN 'admin'   THEN 2
    WHEN 'manager' THEN 3
    WHEN 'cashier' THEN 4
    WHEN 'kitchen' THEN 5
    WHEN 'rider'   THEN 6
    WHEN 'support' THEN 7
    WHEN 'customer' THEN 8
  END
  LIMIT 1
$$;

-- ---------------------------------------------------------------------
-- 5. user_roles RLS policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read their own roles"       ON public.user_roles;
DROP POLICY IF EXISTS "Owners and admins can manage roles"   ON public.user_roles;

CREATE POLICY "Users can read their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));

CREATE POLICY "Owners and admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));

-- ---------------------------------------------------------------------
-- 6. Last-owner protection trigger
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_last_owner_removal()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE remaining int;
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.role = 'owner')
     OR (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role <> 'owner') THEN
    SELECT count(*) INTO remaining
      FROM public.user_roles
     WHERE role = 'owner' AND user_id <> OLD.user_id;
    IF remaining = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last remaining Owner account';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_prevent_last_owner_removal ON public.user_roles;
CREATE TRIGGER trg_prevent_last_owner_removal
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_owner_removal();

DROP TRIGGER IF EXISTS trg_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER trg_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 7. staff_profiles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text,
  email         text,
  phone         text,
  branch_id     uuid,
  position      text,
  active        boolean NOT NULL DEFAULT true,
  notes         text,
  last_active_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_user_id ON public.staff_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_active  ON public.staff_profiles(active);

GRANT SELECT, INSERT, UPDATE ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view their own profile" ON public.staff_profiles;
DROP POLICY IF EXISTS "Managers can view staff profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Owners and admins can manage staff profiles" ON public.staff_profiles;

CREATE POLICY "Staff can view their own profile"
ON public.staff_profiles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Managers can view staff profiles"
ON public.staff_profiles
FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['owner','admin','manager']::public.app_role[]));

CREATE POLICY "Owners and admins can manage staff profiles"
ON public.staff_profiles
FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));

DROP TRIGGER IF EXISTS trg_staff_profiles_updated_at ON public.staff_profiles;
CREATE TRIGGER trg_staff_profiles_updated_at
BEFORE UPDATE ON public.staff_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 8. staff_invitations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  role         public.app_role NOT NULL,
  token        text NOT NULL UNIQUE,
  invited_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at  timestamptz,
  accepted_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_email  ON public.staff_invitations(email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token  ON public.staff_invitations(token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_invitations TO authenticated;
GRANT ALL ON public.staff_invitations TO service_role;

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners and admins can manage invitations" ON public.staff_invitations;
DROP POLICY IF EXISTS "Invitee can read own invitation"           ON public.staff_invitations;

CREATE POLICY "Owners and admins can manage invitations"
ON public.staff_invitations
FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));

CREATE POLICY "Invitee can read own invitation"
ON public.staff_invitations
FOR SELECT TO authenticated
USING (lower(email) = lower(coalesce((auth.jwt() ->> 'email'), '')));

DROP TRIGGER IF EXISTS trg_staff_invitations_updated_at ON public.staff_invitations;
CREATE TRIGGER trg_staff_invitations_updated_at
BEFORE UPDATE ON public.staff_invitations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 9. audit_logs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email    text,
  actor_role     public.app_role,
  action         text NOT NULL,
  entity_type    text,
  entity_id      text,
  summary        text,
  before_state   jsonb,
  after_state    jsonb,
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address     text,
  user_agent     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id    ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity      ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON public.audit_logs(created_at DESC);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners and admins can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated can insert audit logs"    ON public.audit_logs;

CREATE POLICY "Owners and admins can read audit logs"
ON public.audit_logs
FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));

CREATE POLICY "Authenticated can insert audit logs"
ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

COMMIT;

-- =====================================================================
-- Optional: bootstrap the first Owner (RUN MANUALLY, not part of migration)
-- =====================================================================
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'owner'::public.app_role FROM auth.users
-- WHERE email = 'you@example.com'
-- ON CONFLICT (user_id, role) DO NOTHING;

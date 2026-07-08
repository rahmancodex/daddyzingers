
-- ============ 1. branches: restrict writes to owner/admin/manager ============
DROP POLICY IF EXISTS "Authenticated can insert branches" ON public.branches;
DROP POLICY IF EXISTS "Authenticated can update branches" ON public.branches;
DROP POLICY IF EXISTS "Authenticated can delete branches" ON public.branches;

CREATE POLICY "Managers can insert branches"
ON public.branches FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin','manager']::public.app_role[]));

CREATE POLICY "Managers can update branches"
ON public.branches FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['owner','admin','manager']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin','manager']::public.app_role[]));

CREATE POLICY "Owners and admins can delete branches"
ON public.branches FOR DELETE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));

-- ============ 2. staff_profiles: block self-escalation on sensitive columns ============
CREATE OR REPLACE FUNCTION public.prevent_staff_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only guard when the acting user is updating their OWN row and is not an owner/admin.
  IF auth.uid() = OLD.user_id
     AND NOT public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]) THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Not allowed to change your own employment status';
    END IF;
    IF NEW.branch_id IS DISTINCT FROM OLD.branch_id THEN
      RAISE EXCEPTION 'Not allowed to change your own branch assignment';
    END IF;
    IF NEW.suspended_at IS DISTINCT FROM OLD.suspended_at THEN
      RAISE EXCEPTION 'Not allowed to change your own suspension date';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_staff_self_escalation ON public.staff_profiles;
CREATE TRIGGER trg_prevent_staff_self_escalation
BEFORE UPDATE ON public.staff_profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_staff_self_escalation();

-- ============ 3. Revoke public/anon EXECUTE on SECURITY DEFINER helpers ============
-- Trigger-only functions: no callers should invoke directly.
REVOKE ALL ON FUNCTION public.handle_new_user()                     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_last_owner_removal()          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_staff_self_escalation()       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_referral_code()              FROM PUBLIC, anon, authenticated;

-- RLS helpers: keep authenticated (used by policies), revoke anon + PUBLIC.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role)                     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_any_role(uuid, public.app_role[])               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid)                                      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_top_role(uuid)                         FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[])            TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid)                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_top_role(uuid)                      TO authenticated;

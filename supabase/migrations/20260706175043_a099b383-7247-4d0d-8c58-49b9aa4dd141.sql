
-- Fix Admin Settings access: the restaurant_settings table exists with RLS
-- enabled and a single row, but no GRANTs were ever issued to the API roles.
-- PostgREST therefore rejects every request with "permission denied", which
-- surfaced as a "table does not exist" symptom in the app.
--
-- Also tightens the previously wide-open write policies so only owners/admins
-- can modify settings through the Data API. Server code goes through
-- supabaseAdmin (service_role, bypasses RLS) so admin flows are unaffected.

BEGIN;

-- 1. Grants (this is the actual fix for the broken page)
GRANT SELECT                         ON public.restaurant_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_settings TO authenticated;
GRANT ALL                            ON public.restaurant_settings TO service_role;

-- 2. Enforce singleton at the DB level (one row only)
CREATE UNIQUE INDEX IF NOT EXISTS restaurant_settings_singleton_uidx
  ON public.restaurant_settings ((singleton))
  WHERE singleton = true;

-- 3. Replace overly permissive write policies with role-gated ones.
--    Public SELECT policy is kept as-is: the settings the frontend reads
--    (delivery pricing, hours, brand assets) are public by design.
DROP POLICY IF EXISTS "Authenticated can insert settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Authenticated can update settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Authenticated can delete settings" ON public.restaurant_settings;

CREATE POLICY "Owners and admins can insert settings"
  ON public.restaurant_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));

CREATE POLICY "Owners and admins can update settings"
  ON public.restaurant_settings
  FOR UPDATE TO authenticated
  USING      (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));

CREATE POLICY "Owners and admins can delete settings"
  ON public.restaurant_settings
  FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['owner','admin']::public.app_role[]));

-- 4. Ensure exactly one seed row exists (safety net; a row is already present).
INSERT INTO public.restaurant_settings (singleton)
VALUES (true)
ON CONFLICT DO NOTHING;

COMMIT;

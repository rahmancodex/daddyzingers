
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  restaurant_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivery_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  tax_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  social_media jsonb NOT NULL DEFAULT '{}'::jsonb,
  contact_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  brand_assets jsonb NOT NULL DEFAULT '{}'::jsonb,
  maintenance_mode jsonb NOT NULL DEFAULT '{"enabled": false, "message": "", "whitelist_admins": true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.restaurant_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.restaurant_settings TO authenticated;
GRANT ALL ON public.restaurant_settings TO service_role;

ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON public.restaurant_settings FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert settings"
  ON public.restaurant_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update settings"
  ON public.restaurant_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete settings"
  ON public.restaurant_settings FOR DELETE TO authenticated USING (true);

CREATE TRIGGER restaurant_settings_updated_at
  BEFORE UPDATE ON public.restaurant_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.restaurant_settings (singleton, restaurant_info)
VALUES (true, '{"name": "Daddy Zingers", "currency": "PKR", "timezone": "Asia/Karachi", "language": "en"}'::jsonb)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  google_maps_link text,
  phone text,
  email text,
  manager_name text,
  is_active boolean NOT NULL DEFAULT true,
  opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivery_radius_km numeric(6, 2) DEFAULT 5,
  estimated_delivery_minutes integer DEFAULT 45,
  minimum_order numeric(10, 2) DEFAULT 0,
  delivery_charges numeric(10, 2) DEFAULT 0,
  pickup_available boolean NOT NULL DEFAULT true,
  delivery_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.branches TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active branches"
  ON public.branches FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated can view all branches"
  ON public.branches FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert branches"
  ON public.branches FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update branches"
  ON public.branches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete branches"
  ON public.branches FOR DELETE TO authenticated USING (true);

CREATE TRIGGER branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS branches_active_idx ON public.branches (is_active, sort_order);

ALTER TABLE public.restaurant_settings REPLICA IDENTITY FULL;
ALTER TABLE public.branches REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_settings;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.branches;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

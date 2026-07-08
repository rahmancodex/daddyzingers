
-- =========================================================================
-- CMS FOUNDATION — status enum, module enum, hub table, typed children,
-- audit trigger, effective-status helper, scheduler.
-- =========================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_status') THEN
    CREATE TYPE public.cms_status AS ENUM (
      'draft','scheduled','published','inactive','archived'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_module') THEN
    CREATE TYPE public.cms_module AS ENUM (
      'homepage',
      'hero_slide',
      'homepage_section',
      'customer_review',
      'video_testimonial',
      'layout_desktop',
      'layout_mobile',
      'media_asset'
    );
  END IF;
END $$;

-- 1. Shared hub table -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module         public.cms_module NOT NULL,
  title          text NOT NULL DEFAULT '',
  slug           text,
  status         public.cms_status NOT NULL DEFAULT 'draft',
  is_active      boolean NOT NULL DEFAULT true,
  sort_order     integer NOT NULL DEFAULT 0,
  publish_at     timestamptz,
  unpublish_at   timestamptz,
  published_at   timestamptz,
  locale         text NOT NULL DEFAULT 'en',
  tags           text[] NOT NULL DEFAULT '{}',
  meta           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module, slug)
);

GRANT SELECT ON public.cms_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_entries TO authenticated;
GRANT ALL ON public.cms_entries TO service_role;

ALTER TABLE public.cms_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads published cms entries" ON public.cms_entries;
CREATE POLICY "Public reads published cms entries"
  ON public.cms_entries
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active
    AND status = 'published'
    AND (publish_at   IS NULL OR publish_at   <= now())
    AND (unpublish_at IS NULL OR unpublish_at >  now())
  );

DROP POLICY IF EXISTS "CMS staff read all entries" ON public.cms_entries;
CREATE POLICY "CMS staff read all entries"
  ON public.cms_entries
  FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['owner','admin','cms_editor']::public.app_role[])
  );

DROP POLICY IF EXISTS "CMS staff write entries" ON public.cms_entries;
CREATE POLICY "CMS staff write entries"
  ON public.cms_entries
  FOR ALL
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['owner','admin','cms_editor']::public.app_role[])
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['owner','admin','cms_editor']::public.app_role[])
  );

CREATE INDEX IF NOT EXISTS cms_entries_module_status_idx
  ON public.cms_entries (module, status, sort_order);
CREATE INDEX IF NOT EXISTS cms_entries_publish_at_idx
  ON public.cms_entries (status, publish_at)
  WHERE status = 'scheduled';

-- 2. Audit + timestamp trigger -------------------------------------------
CREATE OR REPLACE FUNCTION public.cms_touch_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
    IF NEW.updated_by IS NULL THEN NEW.updated_by := auth.uid(); END IF;
  ELSE
    NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  END IF;
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at := COALESCE(NEW.published_at, now());
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.cms_touch_audit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS cms_entries_touch ON public.cms_entries;
CREATE TRIGGER cms_entries_touch
  BEFORE INSERT OR UPDATE ON public.cms_entries
  FOR EACH ROW EXECUTE FUNCTION public.cms_touch_audit();

-- 3. Effective-status helper ---------------------------------------------
CREATE OR REPLACE FUNCTION public.cms_effective_status(
  _status public.cms_status,
  _is_active boolean,
  _publish_at timestamptz,
  _unpublish_at timestamptz
) RETURNS public.cms_status
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN _status = 'archived' THEN 'archived'::public.cms_status
    WHEN NOT _is_active THEN 'inactive'::public.cms_status
    WHEN _status = 'scheduled'
         AND _publish_at IS NOT NULL
         AND _publish_at <= now()
      THEN 'published'::public.cms_status
    WHEN _status = 'published'
         AND _unpublish_at IS NOT NULL
         AND _unpublish_at <= now()
      THEN 'inactive'::public.cms_status
    ELSE _status
  END
$$;

-- 4. Scheduled → published promoter --------------------------------------
CREATE OR REPLACE FUNCTION public.cms_promote_scheduled()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE promoted integer;
BEGIN
  WITH updated AS (
    UPDATE public.cms_entries
       SET status = 'published',
           published_at = COALESCE(published_at, now()),
           updated_at = now()
     WHERE status = 'scheduled'
       AND publish_at IS NOT NULL
       AND publish_at <= now()
    RETURNING 1
  )
  SELECT count(*)::int INTO promoted FROM updated;
  RETURN COALESCE(promoted, 0);
END $$;

REVOKE ALL ON FUNCTION public.cms_promote_scheduled() FROM PUBLIC, anon, authenticated;

-- 5. Typed child tables --------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cms_hero_slides (
  entry_id       uuid PRIMARY KEY REFERENCES public.cms_entries(id) ON DELETE CASCADE,
  headline       text NOT NULL DEFAULT '',
  subheadline    text,
  eyebrow        text,
  image_url      text,
  mobile_image_url text,
  video_url      text,
  cta_label      text,
  cta_href       text,
  secondary_cta_label text,
  secondary_cta_href text,
  overlay_opacity numeric(3,2) NOT NULL DEFAULT 0.4,
  text_align     text NOT NULL DEFAULT 'left',
  theme          text NOT NULL DEFAULT 'dark'
);

CREATE TABLE IF NOT EXISTS public.cms_homepage_sections (
  entry_id       uuid PRIMARY KEY REFERENCES public.cms_entries(id) ON DELETE CASCADE,
  section_key    text NOT NULL UNIQUE,
  heading        text,
  subheading     text,
  layout_variant text NOT NULL DEFAULT 'default',
  props          jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.cms_customer_reviews (
  entry_id       uuid PRIMARY KEY REFERENCES public.cms_entries(id) ON DELETE CASCADE,
  reviewer_name  text NOT NULL,
  reviewer_role  text,
  avatar_url     text,
  rating         integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  quote          text NOT NULL,
  source         text,
  verified       boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.cms_video_testimonials (
  entry_id       uuid PRIMARY KEY REFERENCES public.cms_entries(id) ON DELETE CASCADE,
  person_name    text NOT NULL,
  headline       text,
  poster_url     text,
  video_url      text NOT NULL,
  provider       text NOT NULL DEFAULT 'file',
  duration_seconds integer
);

CREATE TABLE IF NOT EXISTS public.cms_layout_configs (
  entry_id       uuid PRIMARY KEY REFERENCES public.cms_entries(id) ON DELETE CASCADE,
  target         text NOT NULL UNIQUE CHECK (target IN ('desktop','mobile','universal')),
  blocks         jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme_tokens   jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.cms_media_assets (
  entry_id       uuid PRIMARY KEY REFERENCES public.cms_entries(id) ON DELETE CASCADE,
  bucket         text NOT NULL,
  path           text NOT NULL,
  mime_type      text,
  size_bytes     bigint,
  width          integer,
  height         integer,
  alt_text       text,
  origin_module  public.cms_module,
  UNIQUE (bucket, path)
);

-- Grants + RLS for every child table (identical policy set).
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'cms_hero_slides',
    'cms_homepage_sections',
    'cms_customer_reviews',
    'cms_video_testimonials',
    'cms_layout_configs',
    'cms_media_assets'
  ] LOOP
    EXECUTE format('GRANT SELECT ON public.%1$I TO anon;', tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%1$I TO authenticated;', tbl);
    EXECUTE format('GRANT ALL ON public.%1$I TO service_role;', tbl);
    EXECUTE format('ALTER TABLE public.%1$I ENABLE ROW LEVEL SECURITY;', tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Public reads published %1$s" ON public.%1$I;', tbl);
    EXECUTE format($p$
      CREATE POLICY "Public reads published %1$s"
        ON public.%1$I
        FOR SELECT
        TO anon, authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.cms_entries e
             WHERE e.id = %1$I.entry_id
               AND e.is_active
               AND e.status = 'published'
               AND (e.publish_at   IS NULL OR e.publish_at   <= now())
               AND (e.unpublish_at IS NULL OR e.unpublish_at >  now())
          )
        );
    $p$, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "CMS staff read %1$s" ON public.%1$I;', tbl);
    EXECUTE format($p$
      CREATE POLICY "CMS staff read %1$s"
        ON public.%1$I
        FOR SELECT
        TO authenticated
        USING (
          public.has_any_role(auth.uid(), ARRAY['owner','admin','cms_editor']::public.app_role[])
        );
    $p$, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "CMS staff write %1$s" ON public.%1$I;', tbl);
    EXECUTE format($p$
      CREATE POLICY "CMS staff write %1$s"
        ON public.%1$I
        FOR ALL
        TO authenticated
        USING (
          public.has_any_role(auth.uid(), ARRAY['owner','admin','cms_editor']::public.app_role[])
        )
        WITH CHECK (
          public.has_any_role(auth.uid(), ARRAY['owner','admin','cms_editor']::public.app_role[])
        );
    $p$, tbl);
  END LOOP;
END $$;

-- 6. Convenience view for admin lists ------------------------------------
CREATE OR REPLACE VIEW public.cms_entries_with_status
WITH (security_invoker = true) AS
  SELECT e.*,
         public.cms_effective_status(e.status, e.is_active, e.publish_at, e.unpublish_at)
           AS effective_status
    FROM public.cms_entries e;

GRANT SELECT ON public.cms_entries_with_status TO anon, authenticated, service_role;

-- 7. Cron: flip Scheduled → Published every minute -----------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cms-promote-scheduled') THEN
    PERFORM cron.unschedule('cms-promote-scheduled');
  END IF;
  PERFORM cron.schedule(
    'cms-promote-scheduled',
    '* * * * *',
    'SELECT public.cms_promote_scheduled();'
  );
END $$;

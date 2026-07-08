-- Idempotent audit-fix migration for CMS
-- All base tables (cms_entries, cms_hero_slides, cms_homepage_sections,
-- cms_customer_reviews, cms_video_testimonials, cms_layout_configs,
-- cms_media_assets), the view cms_entries_with_status, and functions
-- cms_effective_status / cms_promote_scheduled / cms_touch_audit already exist.
-- Only missing piece: privileges on the view. Grant them and reload PostgREST.

GRANT SELECT ON public.cms_entries_with_status TO anon, authenticated;
GRANT ALL   ON public.cms_entries_with_status TO service_role;

-- Ensure execute privileges on helper functions (idempotent)
GRANT EXECUTE ON FUNCTION public.cms_effective_status(public.cms_status, boolean, timestamptz, timestamptz) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cms_promote_scheduled() TO service_role;

-- Ask PostgREST to reload its schema cache so the view is visible immediately
NOTIFY pgrst, 'reload schema';

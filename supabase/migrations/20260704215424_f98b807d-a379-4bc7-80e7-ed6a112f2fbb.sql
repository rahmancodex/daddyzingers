
-- Realtime for menu tables so admin CMS updates propagate live to the customer site
ALTER TABLE public.menu_categories REPLICA IDENTITY FULL;
ALTER TABLE public.menu_items REPLICA IDENTITY FULL;
ALTER TABLE public.menu_item_sizes REPLICA IDENTITY FULL;
ALTER TABLE public.option_groups REPLICA IDENTITY FULL;
ALTER TABLE public.option_choices REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_categories; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_item_sizes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.option_groups; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.option_choices; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Public read access for the menu-images bucket so uploaded images render on the customer site.
-- Writes go through server functions using the service role, so no INSERT/UPDATE/DELETE policies are added.
DROP POLICY IF EXISTS "Menu images public read" ON storage.objects;
CREATE POLICY "Menu images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

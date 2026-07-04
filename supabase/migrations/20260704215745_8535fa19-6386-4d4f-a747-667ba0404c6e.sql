
DROP POLICY IF EXISTS "Menu images auth insert" ON storage.objects;
CREATE POLICY "Menu images auth insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "Menu images auth update" ON storage.objects;
CREATE POLICY "Menu images auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'menu-images') WITH CHECK (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "Menu images auth delete" ON storage.objects;
CREATE POLICY "Menu images auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'menu-images');

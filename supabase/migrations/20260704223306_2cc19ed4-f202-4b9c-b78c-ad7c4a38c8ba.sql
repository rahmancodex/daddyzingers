
CREATE POLICY "Authenticated can upload brand-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-assets');

CREATE POLICY "Authenticated can update brand-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-assets')
  WITH CHECK (bucket_id = 'brand-assets');

CREATE POLICY "Authenticated can delete brand-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-assets');

CREATE POLICY "Authenticated can read brand-assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'brand-assets');

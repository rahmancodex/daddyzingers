
-- Storage policies for the private cms-media bucket.
DROP POLICY IF EXISTS "cms-media staff read"   ON storage.objects;
DROP POLICY IF EXISTS "cms-media staff write"  ON storage.objects;
DROP POLICY IF EXISTS "cms-media staff update" ON storage.objects;
DROP POLICY IF EXISTS "cms-media staff delete" ON storage.objects;

CREATE POLICY "cms-media staff read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cms-media'
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','cms_editor']::public.app_role[])
  );

CREATE POLICY "cms-media staff write"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cms-media'
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','cms_editor']::public.app_role[])
  );

CREATE POLICY "cms-media staff update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cms-media'
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','cms_editor']::public.app_role[])
  )
  WITH CHECK (
    bucket_id = 'cms-media'
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','cms_editor']::public.app_role[])
  );

CREATE POLICY "cms-media staff delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cms-media'
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','cms_editor']::public.app_role[])
  );

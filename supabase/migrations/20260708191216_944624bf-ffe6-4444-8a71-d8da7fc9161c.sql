
-- CMS staff manage cms-media storage bucket
DROP POLICY IF EXISTS "cms_media_staff_read" ON storage.objects;
CREATE POLICY "cms_media_staff_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cms-media'
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','cms_editor']::public.app_role[])
  );

DROP POLICY IF EXISTS "cms_media_staff_insert" ON storage.objects;
CREATE POLICY "cms_media_staff_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cms-media'
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','cms_editor']::public.app_role[])
  );

DROP POLICY IF EXISTS "cms_media_staff_update" ON storage.objects;
CREATE POLICY "cms_media_staff_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cms-media'
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','cms_editor']::public.app_role[])
  );

DROP POLICY IF EXISTS "cms_media_staff_delete" ON storage.objects;
CREATE POLICY "cms_media_staff_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cms-media'
    AND public.has_any_role(auth.uid(), ARRAY['owner','admin','cms_editor']::public.app_role[])
  );

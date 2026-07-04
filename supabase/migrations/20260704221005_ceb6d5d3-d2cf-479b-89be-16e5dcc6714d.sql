
-- Promo banners bucket RLS: public read, authenticated write
DROP POLICY IF EXISTS "Promo banners public read" ON storage.objects;
CREATE POLICY "Promo banners public read" ON storage.objects FOR SELECT USING (bucket_id = 'promo-banners');

DROP POLICY IF EXISTS "Promo banners auth insert" ON storage.objects;
CREATE POLICY "Promo banners auth insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'promo-banners');

DROP POLICY IF EXISTS "Promo banners auth update" ON storage.objects;
CREATE POLICY "Promo banners auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'promo-banners') WITH CHECK (bucket_id = 'promo-banners');

DROP POLICY IF EXISTS "Promo banners auth delete" ON storage.objects;
CREATE POLICY "Promo banners auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'promo-banners');

-- Realtime for coupons + banners so admin & homepage reflect updates instantly
ALTER TABLE public.coupons REPLICA IDENTITY FULL;
ALTER TABLE public.promo_banners REPLICA IDENTITY FULL;
ALTER TABLE public.coupon_redemptions REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.promo_banners;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coupon_redemptions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

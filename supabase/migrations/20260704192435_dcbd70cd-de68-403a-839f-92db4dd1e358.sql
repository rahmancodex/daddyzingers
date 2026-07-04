CREATE POLICY "Coupons are server only"
  ON public.coupons
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
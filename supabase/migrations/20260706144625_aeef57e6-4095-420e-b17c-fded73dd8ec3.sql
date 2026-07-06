
ALTER TABLE public.orders
  ADD CONSTRAINT orders_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.promo_banners
  ADD CONSTRAINT promo_banners_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_branch_id_idx ON public.orders(branch_id);
CREATE INDEX IF NOT EXISTS coupons_branch_id_idx ON public.coupons(branch_id);
CREATE INDEX IF NOT EXISTS promo_banners_branch_id_idx ON public.promo_banners(branch_id);

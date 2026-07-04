GRANT SELECT ON public.menu_categories TO anon, authenticated;
GRANT ALL ON public.menu_categories TO service_role;

GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT ALL ON public.menu_items TO service_role;

GRANT SELECT ON public.menu_item_sizes TO anon, authenticated;
GRANT ALL ON public.menu_item_sizes TO service_role;

GRANT SELECT ON public.option_groups TO anon, authenticated;
GRANT ALL ON public.option_groups TO service_role;

GRANT SELECT ON public.option_choices TO anon, authenticated;
GRANT ALL ON public.option_choices TO service_role;

GRANT SELECT ON public.promo_banners TO anon, authenticated;
GRANT ALL ON public.promo_banners TO service_role;

NOTIFY pgrst, 'reload schema';
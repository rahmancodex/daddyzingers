
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_notes text;

ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.user_addresses REPLICA IDENTITY FULL;
ALTER TABLE public.user_favorites REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_addresses;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_favorites;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

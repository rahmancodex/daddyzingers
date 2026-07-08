
-- Add the new role first, in its own transaction, so subsequent
-- migrations and RLS policies may reference it immediately.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'cms_editor'
      AND enumtypid = 'public.app_role'::regtype
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'cms_editor';
  END IF;
END $$;

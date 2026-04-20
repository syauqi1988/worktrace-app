
-- 1. Explicit deny policies on admin_users for INSERT/UPDATE/DELETE
-- (RLS already denies by default, but explicit policies document intent and block any future role grants)
DROP POLICY IF EXISTS "Block insert admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Block update admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Block delete admin_users" ON public.admin_users;

CREATE POLICY "Block insert admin_users" ON public.admin_users
FOR INSERT TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Block update admin_users" ON public.admin_users
FOR UPDATE TO authenticated, anon
USING (false) WITH CHECK (false);

CREATE POLICY "Block delete admin_users" ON public.admin_users
FOR DELETE TO authenticated, anon
USING (false);

-- 2. Restrict listing on public buckets (logos, payment-qr).
-- Replace broad public_select with: anyone can read individual objects (needed for <img src>),
-- but only owners can list their folder.
DO $$
DECLARE
  b text;
  buckets text[] := ARRAY['logos','payment-qr'];
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    EXECUTE format($f$DROP POLICY IF EXISTS "public_select_%1$s" ON storage.objects$f$, b);
    EXECUTE format($f$DROP POLICY IF EXISTS "owner_list_%1$s" ON storage.objects$f$, b);
    EXECUTE format($f$DROP POLICY IF EXISTS "anon_read_%1$s" ON storage.objects$f$, b);

    -- Owners can list their own folder
    EXECUTE format($f$
      CREATE POLICY "owner_list_%1$s" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = %2$L AND auth.uid()::text = (storage.foldername(name))[1])
    $f$, b, b);
  END LOOP;
END $$;

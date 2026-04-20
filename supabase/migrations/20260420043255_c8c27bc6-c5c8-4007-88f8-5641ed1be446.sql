
-- Re-make payment-qr public (QR codes are not sensitive)
UPDATE storage.buckets SET public = true WHERE id = 'payment-qr';

-- Create dedicated public logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Owner-scoped write policies for logos and payment-qr (read is public)
DO $$
DECLARE
  b text;
  buckets text[] := ARRAY['logos','payment-qr'];
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    EXECUTE format($f$DROP POLICY IF EXISTS "owner_select_%1$s" ON storage.objects$f$, b);
    EXECUTE format($f$DROP POLICY IF EXISTS "public_select_%1$s" ON storage.objects$f$, b);
    EXECUTE format($f$DROP POLICY IF EXISTS "owner_insert_%1$s" ON storage.objects$f$, b);
    EXECUTE format($f$DROP POLICY IF EXISTS "owner_update_%1$s" ON storage.objects$f$, b);
    EXECUTE format($f$DROP POLICY IF EXISTS "owner_delete_%1$s" ON storage.objects$f$, b);

    EXECUTE format($f$
      CREATE POLICY "public_select_%1$s" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = %2$L)
    $f$, b, b);

    EXECUTE format($f$
      CREATE POLICY "owner_insert_%1$s" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = %2$L AND auth.uid()::text = (storage.foldername(name))[1])
    $f$, b, b);

    EXECUTE format($f$
      CREATE POLICY "owner_update_%1$s" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = %2$L AND auth.uid()::text = (storage.foldername(name))[1])
      WITH CHECK (bucket_id = %2$L AND auth.uid()::text = (storage.foldername(name))[1])
    $f$, b, b);

    EXECUTE format($f$
      CREATE POLICY "owner_delete_%1$s" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = %2$L AND auth.uid()::text = (storage.foldername(name))[1])
    $f$, b, b);
  END LOOP;
END $$;

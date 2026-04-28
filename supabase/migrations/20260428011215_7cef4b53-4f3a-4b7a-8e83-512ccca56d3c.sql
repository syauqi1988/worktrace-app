DROP POLICY IF EXISTS "Public read logos" ON storage.objects;
CREATE POLICY "Public read logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'logos');
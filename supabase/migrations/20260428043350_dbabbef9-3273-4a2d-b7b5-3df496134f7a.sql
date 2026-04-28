
-- Allow anyone (including anonymous public-link visitors) to upload, read,
-- and update their proof files in the payment-receipts bucket.
DROP POLICY IF EXISTS "Public can upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public can read payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public can update payment receipts" ON storage.objects;

CREATE POLICY "Public can upload payment receipts"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'payment-receipts');

CREATE POLICY "Public can read payment receipts"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'payment-receipts');

CREATE POLICY "Public can update payment receipts"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'payment-receipts')
WITH CHECK (bucket_id = 'payment-receipts');

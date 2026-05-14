
-- Allow anonymous customer to upload payment receipt by validating the token-paired path
-- via a SECURITY DEFINER helper, since the public can no longer SELECT payment_proofs directly.

CREATE OR REPLACE FUNCTION public.payment_receipt_path_is_valid(p_user_id text, p_invoice_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.payment_proofs pp
    WHERE pp.user_id::text = p_user_id
      AND pp.invoice_id::text = p_invoice_id
      AND pp.status <> 'verified'
  );
$$;

GRANT EXECUTE ON FUNCTION public.payment_receipt_path_is_valid(text, text) TO anon, authenticated;

DROP POLICY IF EXISTS "Anon upload payment receipt for valid proof" ON storage.objects;

CREATE POLICY "Anon upload payment receipt for valid proof"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND public.payment_receipt_path_is_valid(
    (storage.foldername(name))[1],
    (storage.foldername(name))[2]
  )
);

-- Also allow anon to UPDATE/upsert the same object (the client uses upsert: true)
DROP POLICY IF EXISTS "Anon update payment receipt for valid proof" ON storage.objects;
CREATE POLICY "Anon update payment receipt for valid proof"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'payment-receipts'
  AND public.payment_receipt_path_is_valid(
    (storage.foldername(name))[1],
    (storage.foldername(name))[2]
  )
)
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND public.payment_receipt_path_is_valid(
    (storage.foldername(name))[1],
    (storage.foldername(name))[2]
  )
);

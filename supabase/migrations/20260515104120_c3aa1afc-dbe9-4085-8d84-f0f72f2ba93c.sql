-- Helper that bypasses RLS to verify a proof token exists and is not yet verified.
CREATE OR REPLACE FUNCTION public.payment_proof_token_is_uploadable(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.payment_proofs pp
    WHERE pp.token = p_token
      AND pp.status <> 'verified'
  );
$$;
GRANT EXECUTE ON FUNCTION public.payment_proof_token_is_uploadable(text) TO anon, authenticated;

-- Drop old over-permissive anon policies on payment-receipts.
DROP POLICY IF EXISTS "anon upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "anon can upload payment proof" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public can read payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public can update payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload payment receipt for valid proof" ON storage.objects;
DROP POLICY IF EXISTS "Anon update payment receipt for valid proof" ON storage.objects;

-- Recreate token-scoped policies using the security-definer helper.
DROP POLICY IF EXISTS "Anon upload payment receipt by token folder" ON storage.objects;
CREATE POLICY "Anon upload payment receipt by token folder"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] = 'proof'
  AND public.payment_proof_token_is_uploadable((storage.foldername(name))[2])
);

DROP POLICY IF EXISTS "Anon update payment receipt by token folder" ON storage.objects;
CREATE POLICY "Anon update payment receipt by token folder"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] = 'proof'
  AND public.payment_proof_token_is_uploadable((storage.foldername(name))[2])
)
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] = 'proof'
  AND public.payment_proof_token_is_uploadable((storage.foldername(name))[2])
);
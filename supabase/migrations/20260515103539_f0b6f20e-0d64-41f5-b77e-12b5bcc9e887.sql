-- Add a token-scoped upload path for public payment proof receipts.
-- This avoids relying on user/invoice folder validation during anonymous storage insert.

DROP POLICY IF EXISTS "Anon upload payment receipt by token folder" ON storage.objects;
CREATE POLICY "Anon upload payment receipt by token folder"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] = 'proof'
  AND EXISTS (
    SELECT 1
    FROM public.payment_proofs pp
    WHERE pp.token = (storage.foldername(name))[2]
      AND pp.status <> 'verified'
  )
);

DROP POLICY IF EXISTS "Anon update payment receipt by token folder" ON storage.objects;
CREATE POLICY "Anon update payment receipt by token folder"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] = 'proof'
  AND EXISTS (
    SELECT 1
    FROM public.payment_proofs pp
    WHERE pp.token = (storage.foldername(name))[2]
      AND pp.status <> 'verified'
  )
)
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] = 'proof'
  AND EXISTS (
    SELECT 1
    FROM public.payment_proofs pp
    WHERE pp.token = (storage.foldername(name))[2]
      AND pp.status <> 'verified'
  )
);

DROP POLICY IF EXISTS "Owner read token payment receipts" ON storage.objects;
CREATE POLICY "Owner read token payment receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] = 'proof'
  AND EXISTS (
    SELECT 1
    FROM public.payment_proofs pp
    WHERE pp.token = (storage.foldername(name))[2]
      AND (pp.user_id = auth.uid() OR public.is_admin())
  )
);

CREATE OR REPLACE FUNCTION public.submit_payment_proof(
  p_token text,
  p_payer_name text,
  p_amount numeric,
  p_method text,
  p_payment_date date,
  p_bank_name text,
  p_reference text,
  p_receipt_url text,
  p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.payment_proofs%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.payment_proofs WHERE token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_row.submitted_at IS NOT NULL AND v_row.status <> 'rejected' THEN
    RAISE EXCEPTION 'Already submitted';
  END IF;

  IF p_receipt_url IS NULL
     OR (
       p_receipt_url NOT LIKE ('proof/' || p_token || '/%')
       AND p_receipt_url NOT LIKE (v_row.user_id::text || '/' || v_row.invoice_id::text || '/%')
     ) THEN
    RAISE EXCEPTION 'Invalid receipt path';
  END IF;

  UPDATE public.payment_proofs
  SET payer_name = p_payer_name,
      amount_paid = p_amount,
      payment_method = p_method,
      payment_date = p_payment_date,
      bank_name = p_bank_name,
      reference_number = p_reference,
      receipt_url = p_receipt_url,
      notes = p_notes,
      submitted_at = now(),
      status = 'pending',
      rejection_reason = NULL
  WHERE token = p_token;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_payment_proof(text, text, numeric, text, date, text, text, text, text) TO anon, authenticated;
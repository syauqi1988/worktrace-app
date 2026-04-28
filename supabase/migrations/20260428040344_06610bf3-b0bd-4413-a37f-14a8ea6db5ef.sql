-- Allow public resubmission of payment proofs after rejection
DROP POLICY IF EXISTS "Public submit proof" ON public.payment_proofs;

CREATE POLICY "Public submit proof"
ON public.payment_proofs
FOR UPDATE
TO public
USING (submitted_at IS NULL OR status = 'rejected')
WITH CHECK (submitted_at IS NOT NULL);
-- Fix payment_proofs RLS so invoice owners can create/read their own proof-token rows.
-- Anonymous customers continue using SECURITY DEFINER RPCs by token; they should not directly insert/select rows.

DROP POLICY IF EXISTS "Anon insert payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Users can create own payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Users can read own payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Users can update own payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Owner verify proof" ON public.payment_proofs;

CREATE POLICY "Users can create own payment proofs"
ON public.payment_proofs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own payment proofs"
ON public.payment_proofs
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update own payment proofs"
ON public.payment_proofs
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Ensure public token RPCs remain callable by anonymous customers.
GRANT EXECUTE ON FUNCTION public.get_payment_proof_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(text, text, numeric, text, date, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_receipt_path_is_valid(text, text) TO anon, authenticated;
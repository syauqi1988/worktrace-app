GRANT EXECUTE ON FUNCTION public.submit_payment_proof(text, text, numeric, text, date, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_proof_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_receipt_path_is_valid(text, text) TO anon, authenticated;

-- 1) Fix is_admin* functions: remove RLS bypass via set_config
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid() AND au.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid() AND au.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.role = 'super_admin'
      AND au.is_active = true
  );
$$;

-- 2) profiles: remove public read
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 3) customer_approvals: remove blanket public SELECT/UPDATE policies; provide RPCs
DROP POLICY IF EXISTS "Public read by token" ON public.customer_approvals;
DROP POLICY IF EXISTS "Public update action" ON public.customer_approvals;

CREATE OR REPLACE FUNCTION public.get_approval_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  document_type text,
  token text,
  pdf_url text,
  customer_name text,
  action text,
  reason text,
  expires_at timestamptz,
  responded_at timestamptz,
  user_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, document_id, document_type, token, pdf_url, customer_name,
         action, reason, expires_at, responded_at, user_id
  FROM public.customer_approvals
  WHERE token = p_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.mark_approval_viewed(p_token text)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.customer_approvals
  SET viewed_at = now()
  WHERE token = p_token AND action IS NULL AND viewed_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_approval(p_token text, p_action text, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.customer_approvals%ROWTYPE;
  v_table text;
  v_status text;
  v_doc_type text;
BEGIN
  IF p_action NOT IN ('accepted','rejected') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  SELECT * INTO v_row FROM public.customer_approvals WHERE token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_row.action IS NOT NULL THEN RAISE EXCEPTION 'Already responded'; END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RAISE EXCEPTION 'Expired';
  END IF;

  UPDATE public.customer_approvals
  SET action = p_action,
      reason = CASE WHEN p_action = 'rejected' THEN p_reason ELSE NULL END,
      responded_at = now()
  WHERE token = p_token;

  v_doc_type := v_row.document_type;
  IF v_doc_type = 'quotation' THEN
    UPDATE public.quotations
      SET status = CASE WHEN p_action = 'accepted' THEN 'Accepted' ELSE 'Rejected' END
      WHERE id = v_row.document_id;
  ELSIF v_doc_type = 'work_order' THEN
    UPDATE public.work_orders
      SET status = CASE WHEN p_action = 'accepted' THEN 'Accepted' ELSE 'Rejected' END,
          accepted_at = CASE WHEN p_action = 'accepted' THEN now() ELSE accepted_at END,
          rejected_at = CASE WHEN p_action = 'rejected' THEN now() ELSE rejected_at END,
          rejection_reason = CASE WHEN p_action = 'rejected' THEN p_reason ELSE rejection_reason END
      WHERE id = v_row.document_id;
  ELSIF v_doc_type = 'completion_report' THEN
    UPDATE public.completion_reports
      SET status = CASE WHEN p_action = 'accepted' THEN 'accepted' ELSE 'rejected' END,
          accepted_at = CASE WHEN p_action = 'accepted' THEN now() ELSE accepted_at END,
          rejected_at = CASE WHEN p_action = 'rejected' THEN now() ELSE rejected_at END,
          rejection_reason = CASE WHEN p_action = 'rejected' THEN p_reason ELSE rejection_reason END
      WHERE id = v_row.document_id;
  END IF;
END;
$$;

-- Public-doc summary fetcher (avoids broad table reads for anon)
CREATE OR REPLACE FUNCTION public.get_public_document_summary(p_token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.customer_approvals%ROWTYPE;
  v_result jsonb;
  v_company jsonb;
BEGIN
  SELECT * INTO v_row FROM public.customer_approvals WHERE token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT to_jsonb(p) - 'id' INTO v_company
  FROM (SELECT company_name, logo_url FROM public.profiles WHERE id = v_row.user_id) p;

  IF v_row.document_type = 'completion_report' THEN
    SELECT jsonb_build_object(
      'doc', to_jsonb(cr.*),
      'job', to_jsonb(j.*),
      'customer', to_jsonb(c.*)
    ) INTO v_result
    FROM public.completion_reports cr
    LEFT JOIN public.jobs j ON j.id = cr.job_id
    LEFT JOIN public.customers c ON c.id = j.customer_id
    WHERE cr.id = v_row.document_id;
  ELSIF v_row.document_type = 'quotation' THEN
    SELECT jsonb_build_object('doc', jsonb_build_object(
      'id', q.id, 'quote_number', q.quote_number, 'total', q.total,
      'created_at', q.created_at, 'status', q.status
    )) INTO v_result
    FROM public.quotations q WHERE q.id = v_row.document_id;
  ELSIF v_row.document_type = 'work_order' THEN
    SELECT jsonb_build_object('doc', jsonb_build_object(
      'id', w.id, 'wo_number', w.wo_number, 'total', w.total,
      'created_at', w.created_at, 'status', w.status
    )) INTO v_result
    FROM public.work_orders w WHERE w.id = v_row.document_id;
  END IF;

  RETURN jsonb_build_object('company', v_company, 'data', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_approval_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_approval_viewed(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_approval(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_document_summary(text) TO anon, authenticated;

-- 4) payment_proofs: remove blanket public SELECT/UPDATE; provide RPCs
DROP POLICY IF EXISTS "Public read proof by token" ON public.payment_proofs;
DROP POLICY IF EXISTS "Public submit proof" ON public.payment_proofs;

CREATE OR REPLACE FUNCTION public.get_payment_proof_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.payment_proofs%ROWTYPE;
  v_invoice jsonb;
  v_company jsonb;
BEGIN
  SELECT * INTO v_row FROM public.payment_proofs WHERE token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'invoice_number', i.invoice_number,
    'total', i.total,
    'customer_name', c.name
  ) INTO v_invoice
  FROM public.invoices i
  LEFT JOIN public.jobs j ON j.id = i.job_id
  LEFT JOIN public.customers c ON c.id = j.customer_id
  WHERE i.id = v_row.invoice_id;

  SELECT jsonb_build_object(
    'company_name', p.company_name,
    'logo_url', p.logo_url,
    'payment_methods', p.payment_methods
  ) INTO v_company
  FROM public.profiles p WHERE p.id = v_row.user_id;

  RETURN jsonb_build_object(
    'proof', to_jsonb(v_row),
    'invoice', v_invoice,
    'company', v_company
  );
END;
$$;

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
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.payment_proofs%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.payment_proofs WHERE token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_row.submitted_at IS NOT NULL AND v_row.status <> 'rejected' THEN
    RAISE EXCEPTION 'Already submitted';
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
$$;

CREATE OR REPLACE FUNCTION public.upload_payment_receipt_signed_url(p_token text, p_path text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- placeholder; actual signed url created via storage policy.
  RAISE NOTICE 'use storage policy';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_payment_proof_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(text, text, numeric, text, date, text, text, text, text) TO anon, authenticated;

-- 5) Storage: payment-receipts policies — restrict to valid token-paired path
DROP POLICY IF EXISTS "Public can read payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public can update payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public upload receipt" ON storage.objects;

-- Allow upload only if a payment_proof exists for the (user_id, invoice_id) folder
-- and is not yet verified
CREATE POLICY "Anon upload payment receipt for valid proof"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND EXISTS (
    SELECT 1 FROM public.payment_proofs pp
    WHERE pp.user_id::text = (storage.foldername(name))[1]
      AND pp.invoice_id::text = (storage.foldername(name))[2]
      AND pp.status <> 'verified'
  )
);

-- Allow owner (auth user) to read their own receipts; anon access via signed URLs only
CREATE POLICY "Owner read payment receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

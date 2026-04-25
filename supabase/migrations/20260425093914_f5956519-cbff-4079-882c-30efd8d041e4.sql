-- Issue 4: Before/after photos on completion reports
ALTER TABLE public.completion_reports
  ADD COLUMN IF NOT EXISTS before_photos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.completion_reports
  ADD COLUMN IF NOT EXISTS after_photos jsonb DEFAULT '[]'::jsonb;

UPDATE public.completion_reports
SET after_photos = photos
WHERE (after_photos IS NULL OR after_photos = '[]'::jsonb)
  AND photos IS NOT NULL
  AND photos <> '[]'::jsonb;

-- Issue 6: Work Order terms
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wo_terms text;

-- Issue 8: Tag colors
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS tags_v2 jsonb DEFAULT '[]'::jsonb;

-- Issue 7a: Customer approvals
CREATE TABLE IF NOT EXISTS public.customer_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  document_type text NOT NULL CHECK (document_type IN ('quotation','work_order','completion_report')),
  document_id uuid NOT NULL,
  user_id uuid NOT NULL,
  customer_name text,
  customer_email text,
  action text CHECK (action IS NULL OR action IN ('accepted','rejected')),
  reason text,
  pdf_url text,
  viewed_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read by token" ON public.customer_approvals;
CREATE POLICY "Public read by token"
  ON public.customer_approvals FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Owner insert" ON public.customer_approvals;
CREATE POLICY "Owner insert"
  ON public.customer_approvals FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Public update action" ON public.customer_approvals;
CREATE POLICY "Public update action"
  ON public.customer_approvals FOR UPDATE
  USING (action IS NULL);

DROP POLICY IF EXISTS "Owner read approvals" ON public.customer_approvals;
CREATE POLICY "Owner read approvals"
  ON public.customer_approvals FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE INDEX IF NOT EXISTS idx_customer_approvals_doc
  ON public.customer_approvals (document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_customer_approvals_user
  ON public.customer_approvals (user_id);

-- Token generator
CREATE OR REPLACE FUNCTION public.generate_approval_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_approval_token() TO authenticated, anon;

-- Issue 7b: Payment proofs
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  invoice_id uuid NOT NULL,
  user_id uuid NOT NULL,
  payer_name text,
  amount_paid numeric,
  payment_method text,
  payment_date date,
  bank_name text,
  reference_number text,
  receipt_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read proof by token" ON public.payment_proofs;
CREATE POLICY "Public read proof by token"
  ON public.payment_proofs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Owner insert proof" ON public.payment_proofs;
CREATE POLICY "Owner insert proof"
  ON public.payment_proofs FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Public submit proof" ON public.payment_proofs;
CREATE POLICY "Public submit proof"
  ON public.payment_proofs FOR UPDATE
  USING (submitted_at IS NULL)
  WITH CHECK (submitted_at IS NOT NULL);

DROP POLICY IF EXISTS "Owner verify proof" ON public.payment_proofs;
CREATE POLICY "Owner verify proof"
  ON public.payment_proofs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_payment_proofs_invoice
  ON public.payment_proofs (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_user_status
  ON public.payment_proofs (user_id, status);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_proof_token text;

-- Storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment-receipts
DROP POLICY IF EXISTS "Public upload receipt" ON storage.objects;
CREATE POLICY "Public upload receipt"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-receipts');

DROP POLICY IF EXISTS "Public read receipt" ON storage.objects;
CREATE POLICY "Public read receipt"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-receipts');

-- Issue 9: avatars (logos) public
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
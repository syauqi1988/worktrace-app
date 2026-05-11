CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  account_name text,
  billplz_bill_id text,
  payment_date date,
  amount_myr numeric,
  plan text,
  billing_period text,
  eligibility text NOT NULL CHECK (eligibility IN ('full','prorated','special','none')),
  reason_category text NOT NULL,
  notes text,
  transaction_ref text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','processed')),
  admin_notes text,
  processed_at timestamptz,
  processed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own refund request"
  ON public.refund_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view own refund request"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admin update refund request"
  ON public.refund_requests FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER set_refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

CREATE INDEX idx_refund_requests_user ON public.refund_requests(user_id);
CREATE INDEX idx_refund_requests_status ON public.refund_requests(status);
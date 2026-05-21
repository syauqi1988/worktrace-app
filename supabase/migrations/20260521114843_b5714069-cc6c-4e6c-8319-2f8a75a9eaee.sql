
CREATE TABLE IF NOT EXISTS public.subscription_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  user_name text,
  billplz_bill_id text,
  receipt_number text NOT NULL UNIQUE,
  plan text NOT NULL,
  billing_period text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MYR',
  payment_date timestamptz NOT NULL DEFAULT now(),
  pdf_path text,
  pdf_url text,
  emailed_at timestamptz,
  status text NOT NULL DEFAULT 'issued',
  admin_notes text,
  company_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscription_receipts_bill_idx
  ON public.subscription_receipts(billplz_bill_id)
  WHERE billplz_bill_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscription_receipts_user_idx
  ON public.subscription_receipts(user_id, created_at DESC);

ALTER TABLE public.subscription_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription receipts"
  ON public.subscription_receipts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Admins update subscription receipts"
  ON public.subscription_receipts FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins insert subscription receipts (manual)"
  ON public.subscription_receipts FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE TRIGGER set_subscription_receipts_updated_at
BEFORE UPDATE ON public.subscription_receipts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.next_subscription_receipt_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yyyymm text := to_char(now(), 'YYYYMM');
  ckey text := 'subscription_receipt_' || yyyymm;
  next_val int;
BEGIN
  INSERT INTO public.app_counters(key, value) VALUES (ckey, 1)
  ON CONFLICT (key) DO UPDATE SET value = public.app_counters.value + 1
  RETURNING value INTO next_val;
  RETURN 'HSPR-' || yyyymm || '-' || lpad(next_val::text, 5, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_subscription_receipt_number() TO authenticated, service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('subscription-receipts', 'subscription-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own subscription receipt files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'subscription-receipts'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
  );

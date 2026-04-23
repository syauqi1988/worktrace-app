
-- ============================================
-- PART 1: WORK ORDERS TABLE + STORAGE
-- ============================================
CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  job_id uuid NOT NULL,
  quotation_id uuid,
  wo_number text NOT NULL,
  title text NOT NULL,
  scope_of_work text NOT NULL,
  scheduled_start_date date,
  scheduled_end_date date,
  estimated_duration text,
  location text,
  technician_name text,
  special_instructions text,
  terms text,
  status text NOT NULL DEFAULT 'Draft',
  customer_signature text,
  accepted_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  items jsonb DEFAULT '[]'::jsonb,
  total numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own work orders"
  ON public.work_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own work orders"
  ON public.work_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own work orders"
  ON public.work_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own work orders"
  ON public.work_orders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all work orders"
  ON public.work_orders FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_work_orders_job_id ON public.work_orders(job_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_user_id ON public.work_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);

CREATE TRIGGER trg_work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('work-order-pdfs', 'work-order-pdfs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own work order pdfs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'work-order-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own work order pdfs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'work-order-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read work order pdfs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'work-order-pdfs');

CREATE POLICY "Public read work order pdfs"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'work-order-pdfs');

CREATE POLICY "Users delete own work order pdfs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'work-order-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- PART 2: CUSTOM DOC NUMBER SETTINGS
-- ============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS doc_number_settings jsonb DEFAULT '{
  "quotation": {"prefix": "QUO", "padding": 4, "next_number": 1, "separator": "-", "suffix": ""},
  "work_order": {"prefix": "WO", "padding": 4, "next_number": 1, "separator": "-", "suffix": ""},
  "invoice": {"prefix": "INV", "padding": 4, "next_number": 1, "separator": "-", "suffix": ""},
  "completion_report": {"prefix": "RPT", "padding": 4, "next_number": 1, "separator": "-", "suffix": ""},
  "receipt": {"prefix": "RCP", "padding": 4, "next_number": 1, "separator": "-", "suffix": ""}
}'::jsonb;

-- ============================================
-- PART 3: ACCOUNT DELETION COLUMNS + TABLE
-- ============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz,
ADD COLUMN IF NOT EXISTS deletion_reason text,
ADD COLUMN IF NOT EXISTS deletion_cancelled_at timestamptz;

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  user_name text,
  user_plan text,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_at timestamptz NOT NULL,
  cancelled_at timestamptz,
  cancelled_by text,
  completed_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own deletion request"
  ON public.account_deletion_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users insert own deletion request"
  ON public.account_deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own deletion request"
  ON public.account_deletion_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON public.account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON public.account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled_at ON public.account_deletion_requests(scheduled_at);

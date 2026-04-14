
-- 1. Add tutorial_state JSONB to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tutorial_state jsonb DEFAULT '{"dashboard":{"completed":false,"seen_count":0},"jobs":{"completed":false,"seen_count":0},"customers":{"completed":false,"seen_count":0},"quotations":{"completed":false,"seen_count":0},"invoices":{"completed":false,"seen_count":0},"settings":{"completed":false,"seen_count":0}}';

-- 2. Add report_count and receipt_count to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS report_count integer DEFAULT 0;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS receipt_count integer DEFAULT 0;

-- 3. Add receipt_number to invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS receipt_number text;

-- 4. Create completion_reports table
CREATE TABLE IF NOT EXISTS public.completion_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  job_id uuid NOT NULL UNIQUE,
  report_number text NOT NULL,
  work_description text,
  materials_used text,
  completion_date date DEFAULT CURRENT_DATE,
  technician_name text,
  customer_signature text,
  photos jsonb DEFAULT '[]',
  notes text,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  submitted_at timestamptz
);

ALTER TABLE public.completion_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own reports"
ON public.completion_reports
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
ON public.completion_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports"
ON public.completion_reports
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
ON public.completion_reports
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('completion-photos', 'completion-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('completion-report-pdfs', 'completion-report-pdfs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies for completion-photos
CREATE POLICY "Anyone can view completion photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'completion-photos');

CREATE POLICY "Auth users can upload completion photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'completion-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Auth users can update own completion photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'completion-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Auth users can delete own completion photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'completion-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 7. Storage policies for completion-report-pdfs
CREATE POLICY "Anyone can view completion report pdfs"
ON storage.objects FOR SELECT
USING (bucket_id = 'completion-report-pdfs');

CREATE POLICY "Auth users can upload completion report pdfs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'completion-report-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 8. Storage policies for receipts
CREATE POLICY "Anyone can view receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

CREATE POLICY "Auth users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

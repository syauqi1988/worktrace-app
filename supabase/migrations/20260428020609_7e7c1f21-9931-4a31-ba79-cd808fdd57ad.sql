-- Add approval tracking columns to completion_reports
ALTER TABLE public.completion_reports
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create private bucket for completion report PDFs (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('completion-report-pdfs', 'completion-report-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: owner manages files under their own user_id folder
DROP POLICY IF EXISTS "Owner read completion report pdfs" ON storage.objects;
CREATE POLICY "Owner read completion report pdfs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'completion-report-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Owner upload completion report pdfs" ON storage.objects;
CREATE POLICY "Owner upload completion report pdfs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'completion-report-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Owner update completion report pdfs" ON storage.objects;
CREATE POLICY "Owner update completion report pdfs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'completion-report-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Owner delete completion report pdfs" ON storage.objects;
CREATE POLICY "Owner delete completion report pdfs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'completion-report-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
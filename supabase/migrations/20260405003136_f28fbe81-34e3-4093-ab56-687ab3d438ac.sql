
-- Add lhdn_submitted column to invoices
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS lhdn_submitted boolean NOT NULL DEFAULT false;

-- Create invoice-pdfs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-pdfs', 'invoice-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for invoice-pdfs bucket
CREATE POLICY "Anyone can read invoice PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoice-pdfs');

CREATE POLICY "Authenticated users can upload own invoice PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoice-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can update own invoice PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'invoice-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can delete own invoice PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'invoice-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

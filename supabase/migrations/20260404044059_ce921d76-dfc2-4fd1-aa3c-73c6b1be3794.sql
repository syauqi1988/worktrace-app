
-- Create storage bucket for quotation PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('quotation-pdfs', 'quotation-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Anyone can view quotation PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'quotation-pdfs');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload their own quotation PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quotation-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Authenticated users can update their own files
CREATE POLICY "Users can update their own quotation PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'quotation-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Authenticated users can delete their own files
CREATE POLICY "Users can delete their own quotation PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'quotation-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

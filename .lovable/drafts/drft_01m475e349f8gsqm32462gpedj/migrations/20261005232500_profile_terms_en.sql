-- English versions of user terms & conditions (Malay stays in the existing columns)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS quotation_terms_en text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invoice_terms_en text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wo_terms_en text;

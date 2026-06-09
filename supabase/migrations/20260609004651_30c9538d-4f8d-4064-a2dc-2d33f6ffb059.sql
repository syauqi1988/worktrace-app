
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_details jsonb;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS payment_details jsonb;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS deductions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS deductions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.variation_orders ADD COLUMN IF NOT EXISTS deductions jsonb NOT NULL DEFAULT '[]'::jsonb;

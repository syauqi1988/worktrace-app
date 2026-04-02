
-- Create quotations table
CREATE TABLE public.quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  quote_number TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft',
  notes TEXT,
  valid_until DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read own quotations" ON public.quotations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quotations" ON public.quotations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quotations" ON public.quotations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own quotations" ON public.quotations FOR DELETE USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add columns to invoices for convert-from-quotation
ALTER TABLE public.invoices ADD COLUMN quote_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.invoices ADD COLUMN subtotal NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN discount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN tax_rate NUMERIC NOT NULL DEFAULT 0;

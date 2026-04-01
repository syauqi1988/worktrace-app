ALTER TABLE public.customers ADD COLUMN tags text[] DEFAULT '{}';
ALTER TABLE public.customers ADD COLUMN tin_number text;
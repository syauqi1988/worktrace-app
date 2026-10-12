-- Richer contacts: multiple contact persons, addresses, phones, emails + registration info
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','suppliers','employees'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS entity_type text', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS other_name text', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS contact_code text', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS reg_type text', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS reg_no text', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS old_reg_no text', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tin_number text', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS sst_no text', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS payment_term text', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS phones jsonb NOT NULL DEFAULT ''[]''::jsonb', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS emails jsonb NOT NULL DEFAULT ''[]''::jsonb', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS contact_persons jsonb NOT NULL DEFAULT ''[]''::jsonb', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS addresses jsonb NOT NULL DEFAULT ''[]''::jsonb', t);
  END LOOP;
END $$;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes text;
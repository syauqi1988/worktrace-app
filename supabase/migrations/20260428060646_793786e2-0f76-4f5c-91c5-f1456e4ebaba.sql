ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_templates jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS products jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.job_presets ADD COLUMN IF NOT EXISTS products jsonb NOT NULL DEFAULT '[]'::jsonb;
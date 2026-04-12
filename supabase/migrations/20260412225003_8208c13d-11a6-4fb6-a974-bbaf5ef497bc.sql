ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tutorial_completed boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tutorial_seen_count integer DEFAULT 0;
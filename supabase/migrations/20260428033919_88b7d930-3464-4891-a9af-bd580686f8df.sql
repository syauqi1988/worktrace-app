ALTER TABLE public.completion_reports
  ADD COLUMN IF NOT EXISTS location_label text,
  ADD COLUMN IF NOT EXISTS project_ref text,
  ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS photo_captions jsonb DEFAULT '{"before":[],"after":[]}'::jsonb;
-- Issue 4: Before/after photos for completion reports
ALTER TABLE public.completion_reports
ADD COLUMN IF NOT EXISTS before_photos jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.completion_reports
ADD COLUMN IF NOT EXISTS after_photos jsonb DEFAULT '[]'::jsonb;

-- Migrate existing single photos column into after_photos when after is empty
UPDATE public.completion_reports
SET after_photos = photos
WHERE (after_photos IS NULL OR after_photos = '[]'::jsonb)
  AND photos IS NOT NULL
  AND photos <> '[]'::jsonb;

-- Issue 8: Customer tag colors (jsonb array of {label, color})
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS tags_v2 jsonb DEFAULT '[]'::jsonb;
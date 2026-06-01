-- Job type + workflow + milestone foundations

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS job_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS skip_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS milestone_config jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_job_type text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS default_milestone_template text DEFAULT '30/40/30',
  ADD COLUMN IF NOT EXISTS default_deposit_percentage numeric DEFAULT 30;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS milestone_stages jsonb,
  ADD COLUMN IF NOT EXISTS milestone_stage_number integer,
  ADD COLUMN IF NOT EXISTS milestone_total_stages integer;

ALTER TABLE public.payment_proofs
  ADD COLUMN IF NOT EXISTS milestone_stage integer,
  ADD COLUMN IF NOT EXISTS milestone_label text;

-- Optional sanity: constrain job_type
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_job_type_check'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_job_type_check
      CHECK (job_type IN ('standard','deposit','milestone','contract','express'));
  END IF;
END $$;
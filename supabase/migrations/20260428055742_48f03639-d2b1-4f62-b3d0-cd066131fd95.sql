-- Clean orphan completion reports referencing deleted jobs
DELETE FROM public.completion_reports cr
WHERE NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = cr.job_id);

-- Add missing foreign keys so PostgREST embedded selects work
ALTER TABLE public.completion_reports
  ADD CONSTRAINT completion_reports_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_quotation_id_fkey
  FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_completion_reports_job_id ON public.completion_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_job_id ON public.work_orders(job_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_quotation_id ON public.work_orders(quotation_id);
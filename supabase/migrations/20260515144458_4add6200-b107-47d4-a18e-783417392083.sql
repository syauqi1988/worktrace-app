CREATE TABLE public.job_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  description text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own job presets" ON public.job_presets
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Users insert own job presets" ON public.job_presets
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own job presets" ON public.job_presets
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own job presets" ON public.job_presets
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER job_presets_set_updated_at
  BEFORE UPDATE ON public.job_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

CREATE INDEX idx_job_presets_user ON public.job_presets(user_id);
-- Variation Orders table
CREATE TABLE IF NOT EXISTS public.variation_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  job_id uuid NOT NULL,
  vo_number text NOT NULL,
  type text NOT NULL DEFAULT 'addition',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric DEFAULT 0,
  discount_type text DEFAULT 'percent',
  sst numeric DEFAULT 0,
  sst_rate numeric DEFAULT 6,
  total numeric NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'Draft',
  customer_approval_token text,
  pdf_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.variation_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own VOs" ON public.variation_orders
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users insert own VOs" ON public.variation_orders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own VOs" ON public.variation_orders
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own VOs" ON public.variation_orders
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_variation_orders_job_id ON public.variation_orders(job_id);
CREATE INDEX IF NOT EXISTS idx_variation_orders_user_id ON public.variation_orders(user_id);

CREATE TRIGGER variation_orders_updated_at
  BEFORE UPDATE ON public.variation_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for VO PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('vo-pdfs', 'vo-pdfs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own VO PDFs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'vo-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own VO PDFs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vo-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own VO PDFs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'vo-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own VO PDFs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'vo-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Extend respond_to_approval to handle variation_order
CREATE OR REPLACE FUNCTION public.respond_to_approval(p_token text, p_action text, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.customer_approvals%ROWTYPE;
  v_doc_type text;
BEGIN
  IF p_action NOT IN ('accepted','rejected') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  SELECT * INTO v_row FROM public.customer_approvals WHERE token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_row.action IS NOT NULL THEN RAISE EXCEPTION 'Already responded'; END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RAISE EXCEPTION 'Expired';
  END IF;

  UPDATE public.customer_approvals
  SET action = p_action,
      reason = CASE WHEN p_action = 'rejected' THEN p_reason ELSE NULL END,
      responded_at = now()
  WHERE token = p_token;

  v_doc_type := v_row.document_type;
  IF v_doc_type = 'quotation' THEN
    UPDATE public.quotations
      SET status = CASE WHEN p_action = 'accepted' THEN 'Accepted' ELSE 'Rejected' END
      WHERE id = v_row.document_id;
  ELSIF v_doc_type = 'work_order' THEN
    UPDATE public.work_orders
      SET status = CASE WHEN p_action = 'accepted' THEN 'Accepted' ELSE 'Rejected' END,
          accepted_at = CASE WHEN p_action = 'accepted' THEN now() ELSE accepted_at END,
          rejected_at = CASE WHEN p_action = 'rejected' THEN now() ELSE rejected_at END,
          rejection_reason = CASE WHEN p_action = 'rejected' THEN p_reason ELSE rejection_reason END
      WHERE id = v_row.document_id;
  ELSIF v_doc_type = 'completion_report' THEN
    UPDATE public.completion_reports
      SET status = CASE WHEN p_action = 'accepted' THEN 'accepted' ELSE 'rejected' END,
          accepted_at = CASE WHEN p_action = 'accepted' THEN now() ELSE accepted_at END,
          rejected_at = CASE WHEN p_action = 'rejected' THEN now() ELSE rejected_at END,
          rejection_reason = CASE WHEN p_action = 'rejected' THEN p_reason ELSE rejection_reason END
      WHERE id = v_row.document_id;
  ELSIF v_doc_type = 'variation_order' THEN
    UPDATE public.variation_orders
      SET status = CASE WHEN p_action = 'accepted' THEN 'Accepted' ELSE 'Rejected' END
      WHERE id = v_row.document_id;
  END IF;
END;
$function$;
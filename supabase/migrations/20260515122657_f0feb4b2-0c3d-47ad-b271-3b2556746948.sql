CREATE OR REPLACE FUNCTION public.notify_customer_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc_label TEXT;
  v_link TEXT;
  v_title TEXT;
  v_body TEXT;
  v_type TEXT;
  v_job_id UUID;
BEGIN
  IF NEW.action IS NOT NULL AND (OLD.action IS NULL OR OLD.action <> NEW.action) THEN
    v_doc_label := CASE NEW.document_type
      WHEN 'quotation' THEN 'Sebut Harga'
      WHEN 'invoice' THEN 'Invois'
      WHEN 'work_order' THEN 'Work Order'
      WHEN 'completion_report' THEN 'Laporan Kerja'
      ELSE 'Dokumen'
    END;

    IF NEW.document_type = 'completion_report' THEN
      SELECT job_id INTO v_job_id FROM public.completion_reports WHERE id = NEW.document_id;
      v_link := COALESCE('/jobs/' || v_job_id::text || '/completion-report', '/dashboard');
    ELSIF NEW.document_type = 'work_order' THEN
      SELECT job_id INTO v_job_id FROM public.work_orders WHERE id = NEW.document_id;
      v_link := COALESCE('/jobs/' || v_job_id::text || '/work-order', '/dashboard');
    ELSIF NEW.document_type = 'quotation' THEN
      v_link := '/quotations/' || NEW.document_id;
    ELSIF NEW.document_type = 'invoice' THEN
      v_link := '/invoices/' || NEW.document_id;
    ELSE
      v_link := '/dashboard';
    END IF;

    IF NEW.action = 'accepted' THEN
      v_type := 'approval_accepted';
      v_title := v_doc_label || ' diterima';
      v_body := COALESCE(NEW.customer_name, 'Pelanggan') || ' telah mengesahkan ' || v_doc_label || '.';
    ELSE
      v_type := 'approval_rejected';
      v_title := v_doc_label || ' ditolak';
      v_body := COALESCE(NEW.customer_name, 'Pelanggan') || ' menolak ' || v_doc_label
                || COALESCE(': ' || NULLIF(NEW.reason, ''), '.');
    END IF;

    PERFORM public.create_notification(NEW.user_id, v_type, v_title, v_body, v_link, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.quotations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.completion_reports;
ALTER TABLE public.quotations REPLICA IDENTITY FULL;
ALTER TABLE public.invoices REPLICA IDENTITY FULL;
ALTER TABLE public.work_orders REPLICA IDENTITY FULL;
ALTER TABLE public.completion_reports REPLICA IDENTITY FULL;
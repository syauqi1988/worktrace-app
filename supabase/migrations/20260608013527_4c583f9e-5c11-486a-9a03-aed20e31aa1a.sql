
-- 1. Add idempotency columns for stamp-approval-pdf
ALTER TABLE public.customer_approvals
  ADD COLUMN IF NOT EXISTS stamped_at timestamptz,
  ADD COLUMN IF NOT EXISTS stamped_pdf_url text;

-- 2. Tighten PII in public document summary RPC (return only customer.name)
CREATE OR REPLACE FUNCTION public.get_public_document_summary(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.customer_approvals%ROWTYPE;
  v_result jsonb;
  v_company jsonb;
BEGIN
  SELECT * INTO v_row FROM public.customer_approvals WHERE token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT to_jsonb(p) INTO v_company
  FROM (SELECT company_name, logo_url FROM public.profiles WHERE id = v_row.user_id) p;

  IF v_row.document_type = 'completion_report' THEN
    SELECT jsonb_build_object(
      'doc', to_jsonb(cr.*),
      'job', jsonb_build_object('id', j.id, 'job_number', j.job_number, 'title', j.title),
      'customer', jsonb_build_object('name', c.name)
    ) INTO v_result
    FROM public.completion_reports cr
    LEFT JOIN public.jobs j ON j.id = cr.job_id
    LEFT JOIN public.customers c ON c.id = j.customer_id
    WHERE cr.id = v_row.document_id;
  ELSIF v_row.document_type = 'quotation' THEN
    SELECT jsonb_build_object('doc', jsonb_build_object(
      'id', q.id, 'quote_number', q.quote_number, 'total', q.total,
      'created_at', q.created_at, 'status', q.status
    )) INTO v_result
    FROM public.quotations q WHERE q.id = v_row.document_id;
  ELSIF v_row.document_type = 'work_order' THEN
    SELECT jsonb_build_object('doc', jsonb_build_object(
      'id', w.id, 'wo_number', w.wo_number, 'total', w.total,
      'created_at', w.created_at, 'status', w.status
    )) INTO v_result
    FROM public.work_orders w WHERE w.id = v_row.document_id;
  END IF;

  RETURN jsonb_build_object('company', v_company, 'data', v_result);
END;
$function$;

-- 3. Reschedule deletion cron with service-role auth (matches new edge-function guard)
DO $$
DECLARE
  v_service_role text;
BEGIN
  SELECT decrypted_secret INTO v_service_role
  FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF v_service_role IS NULL THEN
    -- Fallback: try standard env-based secret name
    SELECT decrypted_secret INTO v_service_role
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-account-deletions-daily') THEN
    PERFORM cron.unschedule('process-account-deletions-daily');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-account-deletions-hourly') THEN
    PERFORM cron.unschedule('process-account-deletions-hourly');
  END IF;

  IF v_service_role IS NOT NULL THEN
    PERFORM cron.schedule(
      'process-account-deletions-hourly',
      '0 * * * *',
      format($cron$
        SELECT net.http_post(
          url := 'https://fjzbgxooszxhqwyfgjsr.supabase.co/functions/v1/process-deletions',
          headers := jsonb_build_object(
            'Content-Type','application/json',
            'Authorization','Bearer %s'
          ),
          body := jsonb_build_object('triggered_at', now())
        );
      $cron$, v_service_role)
    );
  END IF;
END $$;

-- 4. Update create_notification to authenticate to send-push with service-role key
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_body text, p_link text, p_ref_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
  v_url TEXT;
  v_service TEXT;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link, ref_id)
  VALUES (p_user_id, p_type, p_title, p_body, p_link, p_ref_id)
  RETURNING id INTO v_id;

  BEGIN
    v_url := 'https://fjzbgxooszxhqwyfgjsr.supabase.co/functions/v1/send-push';

    SELECT decrypted_secret INTO v_service
    FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
    IF v_service IS NULL THEN
      SELECT decrypted_secret INTO v_service
      FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;
    END IF;

    IF v_service IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'Authorization','Bearer ' || v_service
        ),
        body := jsonb_build_object(
          'notification_id', v_id,
          'user_id', p_user_id,
          'title', p_title,
          'body', p_body,
          'link', p_link
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_id;
END;
$function$;

-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- Table: notifications
-- ============================================================
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  ref_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Inserts only via service role / SECURITY DEFINER triggers (no INSERT policy)

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- Table: push_subscriptions
-- ============================================================
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own push subs"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own push subs"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own push subs"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- Helper: insert notification + fire push
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_link TEXT,
  p_ref_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_url TEXT;
  v_anon TEXT;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link, ref_id)
  VALUES (p_user_id, p_type, p_title, p_body, p_link, p_ref_id)
  RETURNING id INTO v_id;

  -- Fire push via edge function (best-effort, non-blocking)
  BEGIN
    v_url := 'https://fjzbgxooszxhqwyfgjsr.supabase.co/functions/v1/send-push';
    v_anon := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqemJneG9vc3p4aHF3eWZnanNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTExNDEsImV4cCI6MjA5MDMyNzE0MX0.3O5QhxVH5I4QUI6jlPlXPSaAX9pm3Ohk9hboFM1_qnk';
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || v_anon
      ),
      body := jsonb_build_object(
        'notification_id', v_id,
        'user_id', p_user_id,
        'title', p_title,
        'body', p_body,
        'link', p_link
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- swallow; notification row is already saved
    NULL;
  END;

  RETURN v_id;
END;
$$;

-- ============================================================
-- Trigger: customer_approvals -> notify owner on accept/reject
-- ============================================================
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
BEGIN
  IF NEW.action IS NOT NULL AND (OLD.action IS NULL OR OLD.action <> NEW.action) THEN
    v_doc_label := CASE NEW.document_type
      WHEN 'quotation' THEN 'Sebut Harga'
      WHEN 'invoice' THEN 'Invois'
      WHEN 'work_order' THEN 'Work Order'
      WHEN 'completion_report' THEN 'Laporan Kerja'
      ELSE 'Dokumen'
    END;

    v_link := CASE NEW.document_type
      WHEN 'quotation' THEN '/quotations/' || NEW.document_id
      WHEN 'invoice' THEN '/invoices/' || NEW.document_id
      WHEN 'work_order' THEN '/work-orders/' || NEW.document_id
      WHEN 'completion_report' THEN '/completion-reports/' || NEW.document_id
      ELSE '/dashboard'
    END;

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

CREATE TRIGGER trg_notify_customer_approval
AFTER UPDATE ON public.customer_approvals
FOR EACH ROW EXECUTE FUNCTION public.notify_customer_approval();

-- ============================================================
-- Trigger: payment_proofs -> notify owner on submit
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_payment_proof()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.submitted_at IS NOT NULL AND (OLD.submitted_at IS NULL OR OLD.submitted_at <> NEW.submitted_at) THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'payment_proof',
      'Bukti pembayaran diterima',
      COALESCE(NEW.payer_name, 'Pelanggan') || ' menghantar bukti pembayaran' ||
        COALESCE(' RM' || NEW.amount_paid::text, '') || '.',
      '/invoices/' || NEW.invoice_id,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_payment_proof
AFTER UPDATE ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.notify_payment_proof();

-- ============================================================
-- Trigger: ticket_replies -> notify ticket owner on admin reply
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_ticket_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_ticket_no TEXT;
BEGIN
  IF NEW.sender_type = 'admin' THEN
    SELECT user_id, ticket_number INTO v_owner, v_ticket_no
    FROM public.support_tickets WHERE id = NEW.ticket_id;

    IF v_owner IS NOT NULL THEN
      PERFORM public.create_notification(
        v_owner,
        'ticket_reply',
        'Balasan sokongan baharu',
        'Tiket ' || COALESCE(v_ticket_no, '') || ' mempunyai balasan baharu daripada pasukan sokongan.',
        '/support/' || NEW.ticket_id,
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_ticket_reply
AFTER INSERT ON public.ticket_replies
FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_reply();
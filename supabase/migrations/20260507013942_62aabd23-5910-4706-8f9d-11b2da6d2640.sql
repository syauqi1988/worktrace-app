
-- 1. announcements table
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ms text NOT NULL,
  title_en text NOT NULL,
  body_ms text,
  body_en text,
  link text,
  severity text NOT NULL DEFAULT 'info',
  is_active boolean NOT NULL DEFAULT true,
  show_popup boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed read active announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING ((is_active = true AND (expires_at IS NULL OR expires_at > now())) OR public.is_admin());

CREATE POLICY "Admin manage announcements"
  ON public.announcements FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER announcements_set_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

-- 2. announcement_reads
CREATE TABLE public.announcement_reads (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own reads"
  ON public.announcement_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own reads"
  ON public.announcement_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. notifications.i18n column (jsonb { title:{ms,en}, body:{ms,en} })
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS i18n jsonb;

-- 4. publish_announcement RPC: fan-out to all users' notifications
CREATE OR REPLACE FUNCTION public.publish_announcement(p_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.announcements%ROWTYPE;
  v_count integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO v_row FROM public.announcements WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Announcement not found'; END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link, ref_id, i18n)
  SELECT p.id,
         'announcement',
         v_row.title_ms,
         v_row.body_ms,
         v_row.link,
         v_row.id,
         jsonb_build_object(
           'title', jsonb_build_object('ms', v_row.title_ms, 'en', v_row.title_en),
           'body',  jsonb_build_object('ms', COALESCE(v_row.body_ms,''), 'en', COALESCE(v_row.body_en,'')),
           'severity', v_row.severity
         )
  FROM public.profiles p
  WHERE COALESCE(p.account_status, 'active') = 'active';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

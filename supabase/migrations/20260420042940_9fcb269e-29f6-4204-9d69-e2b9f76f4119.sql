
-- 1) Make sensitive buckets private
UPDATE storage.buckets
SET public = false
WHERE id IN ('quotation-pdfs','invoice-pdfs','completion-report-pdfs','completion-photos','receipts','payment-qr');

-- 2) Owner-scoped storage policies (folder name must equal auth.uid())
DO $$
DECLARE
  b text;
  buckets text[] := ARRAY['quotation-pdfs','invoice-pdfs','completion-report-pdfs','completion-photos','receipts','payment-qr'];
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    EXECUTE format($f$DROP POLICY IF EXISTS "owner_select_%1$s" ON storage.objects$f$, b);
    EXECUTE format($f$DROP POLICY IF EXISTS "owner_insert_%1$s" ON storage.objects$f$, b);
    EXECUTE format($f$DROP POLICY IF EXISTS "owner_update_%1$s" ON storage.objects$f$, b);
    EXECUTE format($f$DROP POLICY IF EXISTS "owner_delete_%1$s" ON storage.objects$f$, b);

    EXECUTE format($f$
      CREATE POLICY "owner_select_%1$s" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = %2$L AND auth.uid()::text = (storage.foldername(name))[1])
    $f$, b, b);

    EXECUTE format($f$
      CREATE POLICY "owner_insert_%1$s" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = %2$L AND auth.uid()::text = (storage.foldername(name))[1])
    $f$, b, b);

    EXECUTE format($f$
      CREATE POLICY "owner_update_%1$s" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = %2$L AND auth.uid()::text = (storage.foldername(name))[1])
      WITH CHECK (bucket_id = %2$L AND auth.uid()::text = (storage.foldername(name))[1])
    $f$, b, b);

    EXECUTE format($f$
      CREATE POLICY "owner_delete_%1$s" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = %2$L AND auth.uid()::text = (storage.foldername(name))[1])
    $f$, b, b);
  END LOOP;
END $$;

-- 3) subscription_events: revoke client INSERTs
DROP POLICY IF EXISTS "Users insert own events" ON public.subscription_events;
DROP POLICY IF EXISTS "Users can insert own events" ON public.subscription_events;
DROP POLICY IF EXISTS "Users can insert subscription events" ON public.subscription_events;

-- 4) Remove support_tickets from realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_tickets'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.support_tickets';
  END IF;
END $$;

-- 5) Server-side subscription expiry (pg_cron + SECURITY DEFINER function)
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id, plan FROM public.profiles
    WHERE subscription_end_date IS NOT NULL
      AND subscription_end_date < now()
      AND plan <> 'free'
  LOOP
    UPDATE public.profiles
    SET plan = 'free',
        subscription_status = 'expired',
        subscription_cancelled = false
    WHERE id = r.id;

    INSERT INTO public.subscription_events (user_id, event_type, plan)
    VALUES (r.id, 'expired', r.plan);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_subscriptions() FROM PUBLIC, anon, authenticated;

-- Schedule daily at 00:15 UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-subscriptions-daily') THEN
    PERFORM cron.unschedule('expire-subscriptions-daily');
  END IF;
  PERFORM cron.schedule(
    'expire-subscriptions-daily',
    '15 0 * * *',
    $cmd$ SELECT public.expire_subscriptions(); $cmd$
  );
END $$;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'process-account-deletions-daily';

SELECT cron.schedule(
  'process-account-deletions-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fjzbgxooszxhqwyfgjsr.supabase.co/functions/v1/process-deletions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqemJneG9vc3p4aHF3eWZnanNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTExNDEsImV4cCI6MjA5MDMyNzE0MX0.3O5QhxVH5I4QUI6jlPlXPSaAX9pm3Ohk9hboFM1_qnk"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);
ALTER TABLE public.subscription_events
ADD COLUMN IF NOT EXISTS billplz_bill_id text;

CREATE INDEX IF NOT EXISTS idx_subscription_events_bill_id
ON public.subscription_events(billplz_bill_id)
WHERE billplz_bill_id IS NOT NULL;
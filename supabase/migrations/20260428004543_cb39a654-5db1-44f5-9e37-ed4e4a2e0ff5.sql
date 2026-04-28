UPDATE public.profiles
SET free_months_earned = 1,
    free_months_used = 1,
    referral_count = 1,
    subscription_end_date = subscription_end_date - interval '2 months'
WHERE id = 'c958b39c-8b4f-4c40-a849-5b5d81df26c2';

INSERT INTO public.subscription_events (user_id, event_type, plan, notes)
VALUES ('c958b39c-8b4f-4c40-a849-5b5d81df26c2', 'adjustment', 'pro', 'Reconciled inflated referral counters (3→1) and rolled back 2 surplus free months from expiry');
UPDATE public.profiles
SET subscription_end_date = subscription_end_date + interval '1 month'
WHERE id = 'c958b39c-8b4f-4c40-a849-5b5d81df26c2';

INSERT INTO public.subscription_events (user_id, event_type, plan, billing_period, amount, notes)
VALUES ('c958b39c-8b4f-4c40-a849-5b5d81df26c2', 'payment_success', 'pro', 'monthly', 2900, 'Manual credit: monthly renewal bill cf196dff573ba0dc was paid but skipped by buggy duplicate guard');
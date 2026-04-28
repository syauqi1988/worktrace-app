UPDATE public.profiles
SET subscription_end_date = subscription_end_date + interval '2 years' + interval '1 month'
WHERE id = 'c958b39c-8b4f-4c40-a849-5b5d81df26c2';

INSERT INTO public.subscription_events (user_id, event_type, plan, billing_period, amount, billplz_bill_id, notes) VALUES
('c958b39c-8b4f-4c40-a849-5b5d81df26c2', 'payment_success', 'pro', 'yearly',  27840, '1f6d500224126e91', 'Manual credit: yearly bill paid but skipped by buggy duplicate guard'),
('c958b39c-8b4f-4c40-a849-5b5d81df26c2', 'payment_success', 'pro', 'yearly',  27840, 'c0a97b4b1e2a139a', 'Manual credit: yearly bill paid but skipped by buggy duplicate guard'),
('c958b39c-8b4f-4c40-a849-5b5d81df26c2', 'payment_success', 'pro', 'monthly', 2900,  '4109e44756a50572', 'Manual credit: monthly bill paid but skipped by buggy duplicate guard');
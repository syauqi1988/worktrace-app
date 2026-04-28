UPDATE public.referrals
SET months_awarded = 1
WHERE status = 'rewarded' AND months_awarded = 0;
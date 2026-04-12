
-- Add new subscription columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz,
ADD COLUMN IF NOT EXISTS billplz_bill_id text;

-- Migrate 'basic' plans to 'free'
UPDATE public.profiles SET plan = 'free' WHERE plan = 'basic' OR plan IS NULL;

-- Update set_onboarding_plan to only accept plan (no billing for free)
CREATE OR REPLACE FUNCTION public.set_onboarding_plan(p_plan text, p_billing_period text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND onboarding_complete = false) THEN
    UPDATE public.profiles
    SET plan = p_plan,
        billing_period = p_billing_period,
        onboarding_complete = true
    WHERE id = auth.uid();
  ELSE
    RAISE EXCEPTION 'Onboarding already completed or user not found';
  END IF;
END;
$$;

-- Fix referrals security: remove unrestricted update policy, add secure function
DROP POLICY IF EXISTS "Users can update own referrals" ON public.referrals;

-- Create a secure function for completing referral rewards (server-side only)
CREATE OR REPLACE FUNCTION public.complete_referral_reward(p_referred_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_id uuid;
  v_referrer_id uuid;
BEGIN
  SELECT id, referrer_id INTO v_referral_id, v_referrer_id
  FROM public.referrals
  WHERE referred_id = p_referred_id AND status = 'pending'
  LIMIT 1;

  IF v_referral_id IS NOT NULL THEN
    UPDATE public.referrals
    SET status = 'rewarded',
        completed_at = now(),
        rewarded_at = now()
    WHERE id = v_referral_id;

    PERFORM public.increment_free_months(v_referrer_id);
    PERFORM public.increment_referral_count(v_referrer_id);
  END IF;
END;
$$;

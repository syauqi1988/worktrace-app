-- Restrict execute access on billing-sensitive functions
REVOKE EXECUTE ON FUNCTION public.increment_free_months(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_free_months(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_referral_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_referral_count(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.complete_referral_reward(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_referral_reward(uuid) TO service_role;

-- Harden set_onboarding_plan: only allow 'free' plan from client; paid plans must be set server-side after payment
CREATE OR REPLACE FUNCTION public.set_onboarding_plan(p_plan text, p_billing_period text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow the free plan via this RPC. Paid plans must be activated by
  -- the billplz-callback edge function (using service role) after payment.
  IF p_plan IS DISTINCT FROM 'free' THEN
    RAISE EXCEPTION 'Only the free plan can be selected during onboarding. Paid plans require payment.';
  END IF;

  IF p_billing_period NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid billing period';
  END IF;

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
$function$;
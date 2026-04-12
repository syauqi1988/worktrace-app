
-- Create a SECURITY DEFINER function for setting plan during onboarding
CREATE OR REPLACE FUNCTION public.set_onboarding_plan(
  p_plan text,
  p_billing_period text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow setting plan if onboarding is not yet complete
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

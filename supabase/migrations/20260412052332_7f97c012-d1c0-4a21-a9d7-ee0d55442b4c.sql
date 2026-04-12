-- Fix referrals RLS policies: change from public to authenticated role

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can update own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users view own referrals" ON public.referrals;

-- Recreate with authenticated role and proper checks
CREATE POLICY "Users can insert referrals"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = referred_id);

CREATE POLICY "Users can update own referrals"
ON public.referrals
FOR UPDATE
TO authenticated
USING (referrer_id = auth.uid());

CREATE POLICY "Users view own referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (referrer_id = auth.uid() OR referred_id = auth.uid());
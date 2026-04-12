
DROP POLICY IF EXISTS "Users can insert referrals" ON public.referrals;
CREATE POLICY "Users can insert referrals" ON public.referrals
FOR INSERT WITH CHECK (auth.uid() = referred_id);

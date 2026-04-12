
-- Fix 1: Replace overly permissive storage policies on payment-qr bucket
-- Drop existing policies that use 'public' role
DROP POLICY IF EXISTS "Users can upload payment QR" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own payment QR" ON storage.objects;

-- Recreate with 'authenticated' role and user-scoped path check
CREATE POLICY "Users can upload payment QR"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-qr'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own payment QR"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-qr'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix 2: Restrict profiles UPDATE to safe fields only
-- Drop the existing overly permissive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a restricted update policy that prevents users from modifying sensitive fields
-- The WITH CHECK ensures plan, referral_count, free_months_earned, free_months_used stay unchanged
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND plan = (SELECT p.plan FROM public.profiles p WHERE p.id = auth.uid())
  AND referral_count = (SELECT p.referral_count FROM public.profiles p WHERE p.id = auth.uid())
  AND free_months_earned = (SELECT p.free_months_earned FROM public.profiles p WHERE p.id = auth.uid())
  AND free_months_used = (SELECT p.free_months_used FROM public.profiles p WHERE p.id = auth.uid())
);

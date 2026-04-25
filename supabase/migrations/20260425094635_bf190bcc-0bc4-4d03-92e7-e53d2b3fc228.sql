-- Fix 1: enable RLS on admin_users (had policies but RLS off)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Fix 2: pin search_path on remaining functions
ALTER FUNCTION public.populate_profile_email() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_pricing_plan_timestamp() SET search_path = public, pg_catalog;

-- Fix 3: tighten customer_approvals public update policy
DROP POLICY IF EXISTS "Public update action" ON public.customer_approvals;
CREATE POLICY "Public update action"
  ON public.customer_approvals FOR UPDATE
  USING (action IS NULL AND (expires_at IS NULL OR expires_at > now()))
  WITH CHECK (action IN ('accepted','rejected'));

-- Fix 4: remove broad public SELECT on payment-receipts; owner uses signed URLs
DROP POLICY IF EXISTS "Public read receipt" ON storage.objects;
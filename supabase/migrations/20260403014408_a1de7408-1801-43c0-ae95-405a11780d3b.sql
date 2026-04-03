-- Fix quotations RLS policies: change from public to authenticated role
DROP POLICY IF EXISTS "Users can delete own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can insert own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can read own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can update own quotations" ON public.quotations;

CREATE POLICY "Users can read own quotations" ON public.quotations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quotations" ON public.quotations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quotations" ON public.quotations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own quotations" ON public.quotations FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TABLE public.short_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'generic',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_short_links_code ON public.short_links(code);
CREATE INDEX idx_short_links_user_target ON public.short_links(user_id, target_url);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read short links"
ON public.short_links FOR SELECT
USING (true);

CREATE POLICY "Users can create their own short links"
ON public.short_links FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own short links"
ON public.short_links FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own short links"
ON public.short_links FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
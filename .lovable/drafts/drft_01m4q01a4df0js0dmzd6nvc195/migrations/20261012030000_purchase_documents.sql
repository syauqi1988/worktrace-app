-- Purchase documents: purchase orders, goods received notes, bills, credit notes, payments, refunds
CREATE TABLE IF NOT EXISTS public.purchase_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  doc_type text NOT NULL,
  doc_number text NOT NULL,
  party text NOT NULL,
  reference text,
  doc_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Draft',
  total numeric NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_documents TO authenticated;
GRANT ALL ON public.purchase_documents TO service_role;

ALTER TABLE public.purchase_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own purchase documents" ON public.purchase_documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own purchase documents" ON public.purchase_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own purchase documents" ON public.purchase_documents
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own purchase documents" ON public.purchase_documents
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS purchase_documents_user_type_idx ON public.purchase_documents (user_id, doc_type, doc_date DESC);

CREATE TRIGGER purchase_documents_set_updated_at
  BEFORE UPDATE ON public.purchase_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

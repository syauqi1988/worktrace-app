CREATE TABLE public.ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (length(trim(code)) > 0),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  type text NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  system_key text,
  is_active boolean NOT NULL DEFAULT true,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, id),
  UNIQUE (user_id, code),
  UNIQUE (user_id, system_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ledger_accounts TO authenticated;
GRANT ALL ON public.ledger_accounts TO service_role;
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY ledger_accounts_own ON public.ledger_accounts FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_number text NOT NULL DEFAULT '',
  entry_date date NOT NULL DEFAULT current_date,
  reference text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  lines jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(lines) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY journal_entries_own ON public.journal_entries FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- Reject unbalanced or malformed journals at the database level.
CREATE OR REPLACE FUNCTION public.validate_journal_entry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE dr numeric := 0; cr numeric := 0; line jsonb; d numeric; c numeric;
BEGIN
  IF jsonb_array_length(NEW.lines) < 2 THEN RAISE EXCEPTION 'journal needs at least two lines'; END IF;
  FOR line IN SELECT * FROM jsonb_array_elements(NEW.lines) LOOP
    d := COALESCE((line->>'debit')::numeric, 0); c := COALESCE((line->>'credit')::numeric, 0);
    IF d < 0 OR c < 0 OR (d > 0 AND c > 0) OR (d = 0 AND c = 0) THEN RAISE EXCEPTION 'invalid journal line'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.ledger_accounts a WHERE a.id = (line->>'account_id')::uuid AND a.user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'unknown account';
    END IF;
    dr := dr + d; cr := cr + c;
  END LOOP;
  IF round(dr, 2) <> round(cr, 2) THEN RAISE EXCEPTION 'journal is not balanced'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER journal_entries_validate BEFORE INSERT OR UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_journal_entry();
REVOKE EXECUTE ON FUNCTION public.validate_journal_entry() FROM PUBLIC, anon, authenticated;

CREATE INDEX ledger_accounts_user_idx ON public.ledger_accounts(user_id);
CREATE INDEX journal_entries_user_date_idx ON public.journal_entries(user_id, entry_date);

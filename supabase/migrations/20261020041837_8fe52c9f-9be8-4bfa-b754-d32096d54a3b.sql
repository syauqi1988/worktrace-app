CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  bank_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_accounts_own ON public.bank_accounts FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('money_in', 'money_out', 'transfer')),
  account_id uuid NOT NULL,
  to_account_id uuid,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  transaction_date date NOT NULL DEFAULT current_date,
  reference text NOT NULL DEFAULT '',
  party text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, account_id) REFERENCES public.bank_accounts(user_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id, to_account_id) REFERENCES public.bank_accounts(user_id, id) ON DELETE RESTRICT,
  CHECK ((kind = 'transfer' AND to_account_id IS NOT NULL AND account_id <> to_account_id)
    OR (kind <> 'transfer' AND to_account_id IS NULL))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_transactions_own ON public.bank_transactions FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE INDEX bank_accounts_user_idx ON public.bank_accounts(user_id);
CREATE INDEX bank_transactions_user_date_idx ON public.bank_transactions(user_id, transaction_date);
CREATE INDEX bank_transactions_account_idx ON public.bank_transactions(user_id, account_id);
CREATE INDEX bank_transactions_destination_idx ON public.bank_transactions(user_id, to_account_id);
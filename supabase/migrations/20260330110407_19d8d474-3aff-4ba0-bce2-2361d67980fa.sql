-- Customers table
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE POLICY "Users can read own customers" ON public.customers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own customers" ON public.customers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own customers" ON public.customers FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Jobs table
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  job_number text NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Other',
  status text NOT NULL DEFAULT 'Lead',
  scheduled_date date,
  completed_date date,
  amount numeric(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE POLICY "Users can read own jobs" ON public.jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON public.jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own jobs" ON public.jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'Draft',
  total numeric(12,2) NOT NULL DEFAULT 0,
  issued_date date DEFAULT CURRENT_DATE,
  due_date date,
  paid_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE POLICY "Users can read own invoices" ON public.invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices" ON public.invoices FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices" ON public.invoices FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
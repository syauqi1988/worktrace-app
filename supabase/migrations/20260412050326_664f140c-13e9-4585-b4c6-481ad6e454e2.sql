
-- Fix 2: T&C columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS quotation_terms text DEFAULT '1. Sebut harga ini sah selama 30 hari dari tarikh di atas.
2. Harga tertakluk kepada perubahan tanpa notis.
3. Pembayaran deposit diperlukan sebelum kerja dimulakan.
4. Kerja akan dimulakan selepas deposit diterima.
5. Sebarang kerja tambahan akan dikenakan caj berasingan.';

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS invoice_terms text DEFAULT '1. Sila jelaskan pembayaran dalam tempoh yang ditetapkan.
2. Resit rasmi akan dikeluarkan selepas pembayaran diterima.
3. Untuk pertanyaan, sila hubungi kami.
4. Bayaran lewat mungkin dikenakan caj tambahan.';

ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS terms text;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS terms text;

-- Fix 5: Payment methods
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS payment_methods jsonb DEFAULT '[]';

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS selected_payment_methods jsonb DEFAULT '[]';

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-qr', 'payment-qr', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload payment QR" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'payment-qr' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Payment QR publicly readable" ON storage.objects
FOR SELECT USING (bucket_id = 'payment-qr');

CREATE POLICY "Users can delete own payment QR" ON storage.objects
FOR DELETE USING (bucket_id = 'payment-qr' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Fix 8: Referral system
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referred_by text;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referral_count integer DEFAULT 0;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS free_months_earned integer DEFAULT 0;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS free_months_used integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  rewarded_at timestamptz
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referrals" ON public.referrals
FOR SELECT USING (referrer_id = auth.uid());

CREATE POLICY "Users can insert referrals" ON public.referrals
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own referrals" ON public.referrals
FOR UPDATE USING (referrer_id = auth.uid());

-- Auto-generate referral code trigger
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := upper(substring(replace(replace(encode(gen_random_bytes(6), 'base64'), '+', ''), '/', ''), 1, 8));
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.referral_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.generate_referral_code();

-- Backfill existing profiles
UPDATE public.profiles
SET referral_code = upper(substring(replace(replace(encode(gen_random_bytes(6), 'base64'), '+', ''), '/', ''), 1, 8))
WHERE referral_code IS NULL;

-- Helper RPCs
CREATE OR REPLACE FUNCTION public.increment_free_months(row_id uuid)
RETURNS void AS $$
  UPDATE public.profiles SET free_months_earned = free_months_earned + 1 WHERE id = row_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_referral_count(row_id uuid)
RETURNS void AS $$
  UPDATE public.profiles SET referral_count = referral_count + 1 WHERE id = row_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

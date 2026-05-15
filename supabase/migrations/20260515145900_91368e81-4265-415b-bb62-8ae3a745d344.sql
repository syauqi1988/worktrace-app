
-- Create FAQs table
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_ms TEXT NOT NULL,
  question_en TEXT NOT NULL,
  answer_ms TEXT NOT NULL,
  answer_en TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read published FAQs; admins can read all
CREATE POLICY "Anyone authed read published faqs"
  ON public.faqs FOR SELECT
  TO authenticated
  USING (is_published = true OR public.is_admin());

-- Only admins manage FAQs
CREATE POLICY "Admins manage faqs"
  ON public.faqs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER faqs_set_updated_at
BEFORE UPDATE ON public.faqs
FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

CREATE INDEX idx_faqs_published_sort ON public.faqs (is_published, category, sort_order);

-- Seed a few default entries
INSERT INTO public.faqs (question_ms, question_en, answer_ms, answer_en, category, sort_order) VALUES
('Bagaimana cara menambah pelanggan baharu?', 'How do I add a new customer?', 'Pergi ke menu Pelanggan > Tambah Pelanggan, isi maklumat dan simpan.', 'Go to Customers > New Customer, fill in details and save.', 'getting-started', 10),
('Bagaimana cara membuat Variation Order (VO)?', 'How do I create a Variation Order (VO)?', 'Buka job > tab VO/Potongan > Tambah VO. Anda boleh pilih jenis Variasi atau Potongan.', 'Open a job > VO/Deduction tab > Add VO. You can pick Variation or Deduction type.', 'jobs', 20),
('Bagaimana saya verify bukti pembayaran?', 'How do I verify payment proof?', 'Buka invois > klik Verify pada bukti pembayaran yang dimuat naik pelanggan.', 'Open the invoice and click Verify on the uploaded customer payment proof.', 'invoices', 30);


CREATE TABLE public.completion_report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  name text NOT NULL,
  category text NULL,
  work_description text NULL,
  materials_used text NULL,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crt_user ON public.completion_report_templates(user_id);

ALTER TABLE public.completion_report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own or global templates"
ON public.completion_report_templates
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Insert own templates"
ON public.completion_report_templates
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own templates"
ON public.completion_report_templates
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own templates"
ON public.completion_report_templates
FOR DELETE TO authenticated
USING (user_id = auth.uid());

INSERT INTO public.completion_report_templates (user_id, name, category, work_description, materials_used, checklist, is_default, sort_order)
VALUES
(NULL, 'Servis Penyelenggaraan Am', 'Maintenance',
 E'Pemeriksaan dan servis penyelenggaraan telah dijalankan mengikut skop kerja yang dipersetujui.\nSemua komponen utama telah diperiksa dan diuji berfungsi dengan baik.\nKerja siap dilaksanakan tanpa sebarang masalah.',
 E'- Bahan pembersih\n- Minyak pelincir\n- Alat ganti standard',
 '[
   {"title":"Pemeriksaan awal kawasan kerja","done":true},
   {"title":"Servis/pembersihan komponen","done":true},
   {"title":"Ujian fungsi selepas servis","done":true},
   {"title":"Pembersihan tapak kerja","done":true},
   {"title":"Penerangan kepada pelanggan","done":true}
 ]'::jsonb,
 true, 1),
(NULL, 'Pembaikan Am', 'Repair',
 E'Kerja pembaikan telah dilaksanakan ke atas kerosakan yang dilaporkan.\nPunca masalah dikenalpasti dan diperbaiki.\nSistem telah diuji dan berfungsi normal selepas pembaikan.',
 E'- Alat ganti baru\n- Bahan perekat / pengedap\n- Wayar / paip (jika perlu)',
 '[
   {"title":"Diagnosa kerosakan","done":true},
   {"title":"Penggantian / pembaikan komponen","done":true},
   {"title":"Ujian selepas pembaikan","done":true},
   {"title":"Pembersihan tapak","done":true}
 ]'::jsonb,
 true, 2),
(NULL, 'Pemasangan Baru', 'Installation',
 E'Pemasangan unit/peralatan baru telah disiapkan mengikut spesifikasi.\nPemasangan dilakukan dengan selamat dan teratur.\nUjian akhir menunjukkan unit berfungsi sepenuhnya.',
 E'- Unit / peralatan baru\n- Pendakap / bracket\n- Skru, paip, wayar mengikut keperluan',
 '[
   {"title":"Semakan tapak pemasangan","done":true},
   {"title":"Pemasangan unit/peralatan","done":true},
   {"title":"Sambungan kuasa / paip","done":true},
   {"title":"Ujian fungsi penuh","done":true},
   {"title":"Tunjuk ajar kepada pelanggan","done":true},
   {"title":"Pembersihan kawasan kerja","done":true}
 ]'::jsonb,
 true, 3);

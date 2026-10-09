/** Offline knowledge used by the on-device WorkTrace AI Help. Keep short & factual. */
export const KB: { k: string[]; en: string; ms: string }[] = [
  { k: ['job', 'kerja', 'create', 'buat', 'new'], en: 'Create a job: Jobs menu > "+" > fill title, customer, category, job type (normal, deposit, milestone) > Save.', ms: 'Buat kerja: menu Kerja > "+" > isi tajuk, pelanggan, kategori, jenis kerja (biasa, deposit, berperingkat) > Simpan.' },
  { k: ['quotation', 'sebut harga', 'quote'], en: 'Quotation: open a Job > Create Quotation, add items from catalog, deductions, terms. Press Create, then share via the WhatsApp button.', ms: 'Sebut harga: buka Kerja > Buat Sebut Harga, tambah item dari katalog, potongan, terma. Tekan Cipta, kemudian kongsi melalui butang WhatsApp.' },
  { k: ['invoice', 'invois'], en: 'Invoice: from a Job or Quotation > Create Invoice. Milestone jobs create one invoice per stage, each with its own number. No completion report needed first.', ms: 'Invois: dari Kerja atau Sebut Harga > Buat Invois. Kerja berperingkat mencipta satu invois setiap peringkat dengan nombor sendiri. Laporan siap kerja tidak diperlukan dahulu.' },
  { k: ['milestone', 'peringkat', 'deposit', 'progress'], en: 'Milestone/deposit: choose the job type on the job form. Deposit % is free (5–100%). Templates for 2–10 stages. Use "Auto-fill to T&C" on the quotation to insert the payment block.', ms: 'Berperingkat/deposit: pilih jenis kerja di borang kerja. Peratus deposit bebas (5–100%). Templet 2–10 peringkat. Guna "Auto-isi ke T&C" di sebut harga untuk masukkan blok bayaran.' },
  { k: ['work order', 'wo', 'arahan kerja'], en: 'Work Order: open a Job or accepted Quotation > Create Work Order. It loads the quotation terms. Available on all plans.', ms: 'Arahan Kerja: buka Kerja atau Sebut Harga > Buat Work Order. Terma sebut harga dimuatkan. Tersedia untuk semua pelan.' },
  { k: ['completion', 'laporan', 'report', 'photo', 'gambar'], en: 'Completion report: Job > Completion Report. Photos are optional and keep their original orientation. Pick a template to prefill checklist.', ms: 'Laporan siap kerja: Kerja > Laporan Siap. Gambar pilihan dan kekal orientasi asal. Pilih templet untuk isi senarai semak.' },
  { k: ['vo', 'variation', 'variasi'], en: 'Variation Order: Job > VO, add/remove items, Create, then share via WhatsApp.', ms: 'Perintah Variasi: Kerja > VO, tambah/tolak item, Cipta, kemudian kongsi melalui WhatsApp.' },
  { k: ['whatsapp', 'share', 'kongsi', 'send', 'hantar'], en: 'Sharing: documents are created first, then press the WhatsApp share button on the detail page. Customers get a view-only link; no approval needed.', ms: 'Kongsi: dokumen dicipta dahulu, kemudian tekan butang kongsi WhatsApp di halaman butiran. Pelanggan dapat pautan lihat sahaja; tiada kelulusan diperlukan.' },
  { k: ['terms', 'terma', 'syarat', 't&c'], en: 'Terms: Settings > Terms for quotation, invoice and work order. Saved separately for Malay and English.', ms: 'Terma: Tetapan > Terma untuk sebut harga, invois dan arahan kerja. Disimpan berasingan untuk BM dan English.' },
  { k: ['payment', 'bayaran', 'bank', 'proof', 'bukti'], en: 'Payment details: Settings > Payment Details (bank, account, DuitNow). Customers can upload payment proof via the invoice link; verify it in the invoice.', ms: 'Maklumat bayaran: Tetapan > Maklumat Pembayaran (bank, akaun, DuitNow). Pelanggan boleh muat naik bukti bayaran melalui pautan invois; sahkan di invois.' },
  { k: ['product', 'produk', 'catalog', 'katalog', 'delete', 'padam'], en: 'Products: Products menu to add, edit or delete catalog items. Use "Add from Catalog" in documents.', ms: 'Produk: menu Produk untuk tambah, sunting atau padam item katalog. Guna "Tambah dari Katalog" dalam dokumen.' },
  { k: ['customer', 'pelanggan', 'supplier', 'pembekal', 'employee', 'pekerja', 'contact'], en: 'Contacts: Contacts menu > Customers, Suppliers, Employees. Each user only sees their own.', ms: 'Kenalan: menu Kenalan > Pelanggan, Pembekal, Pekerja. Setiap pengguna hanya melihat milik sendiri.' },
  { k: ['plan', 'subscription', 'langganan', 'upgrade', 'refund', 'cancel', 'batal'], en: 'Plans: Settings > Subscription to upgrade, cancel or request a refund (see Refund Policy).', ms: 'Pelan: Tetapan > Langganan untuk naik taraf, batal atau mohon bayaran balik (lihat Polisi Bayaran Balik).' },
  { k: ['language', 'bahasa', 'english'], en: 'Language: use the BM/EN toggle at the top bar.', ms: 'Bahasa: guna togol BM/EN di bar atas.' },
  { k: ['number', 'nombor', 'prefix', 'format'], en: 'Document numbering: Settings > Document Numbers to change prefix and next number.', ms: 'Penomboran dokumen: Tetapan > Nombor Dokumen untuk tukar awalan dan nombor seterusnya.' },
  { k: ['logo', 'company', 'syarikat', 'ssm', 'tin', 'sst'], en: 'Company info: Settings > Company for name, logo, SSM, TIN, SST.', ms: 'Maklumat syarikat: Tetapan > Syarikat untuk nama, logo, SSM, TIN, SST.' },
  { k: ['error', 'ralat', 'bug', 'issue', 'masalah', 'fail', 'gagal', 'slow'], en: 'Issues: refresh the page, check internet, log out/in. If it persists, send a support ticket (Support menu) with a screenshot.', ms: 'Masalah: muat semula halaman, semak internet, log keluar/masuk. Jika berterusan, hantar tiket sokongan (menu Sokongan) dengan tangkapan skrin.' },
];

export function searchKB(q: string, ms: boolean, n = 3) {
  const s = q.toLowerCase();
  return KB.map(e => ({ e, score: e.k.reduce((a, k) => a + (s.includes(k) ? k.length : 0), 0) }))
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, n)
    .map(x => (ms ? x.e.ms : x.e.en))
    .concat(extra.filter(l => s.split(/\s+/).some(w => w.length > 3 && l.toLowerCase().includes(w))).slice(0, 2));
}

export const fullKB = (ms: boolean) => [...KB.map(e => '- ' + (ms ? e.ms : e.en)), ...extra.slice(0, 25).map(l => '- ' + l)].join('\n');

/** FAQ questions, same order as KB. */
const Q: [string, string][] = [
  ['How do I create a job?', 'Bagaimana cara buat kerja?'],
  ['How do I create and share a quotation?', 'Bagaimana buat dan kongsi sebut harga?'],
  ['How do I create an invoice?', 'Bagaimana buat invois?'],
  ['How do deposit and milestone payments work?', 'Bagaimana bayaran deposit dan berperingkat berfungsi?'],
  ['How do I create a work order?', 'Bagaimana buat arahan kerja?'],
  ['How do I make a completion report?', 'Bagaimana buat laporan siap kerja?'],
  ['How do I create a variation order?', 'Bagaimana buat perintah variasi?'],
  ['How do I share documents on WhatsApp?', 'Bagaimana kongsi dokumen di WhatsApp?'],
  ['Where do I set terms & conditions?', 'Di mana tetapkan terma & syarat?'],
  ['How do payment details and payment proof work?', 'Bagaimana maklumat dan bukti bayaran berfungsi?'],
  ['How do I manage products?', 'Bagaimana urus produk?'],
  ['How do I manage contacts?', 'Bagaimana urus kenalan?'],
  ['How do I change or cancel my plan?', 'Bagaimana tukar atau batal pelan?'],
  ['How do I change the language?', 'Bagaimana tukar bahasa?'],
  ['How do I change document numbering?', 'Bagaimana tukar penomboran dokumen?'],
  ['Where do I update company info?', 'Di mana kemas kini maklumat syarikat?'],
  ['What if the app has a problem?', 'Bagaimana jika aplikasi bermasalah?'],
];

export const kbFaqs = () => KB.map((e, i) => ({
  id: `kb-${i}`, question_en: Q[i]?.[0] ?? e.k[0], question_ms: Q[i]?.[1] ?? e.k[0],
  answer_en: e.en, answer_ms: e.ms, category: 'WorkTrace', sort_order: 1000 + i,
}));

/** Extra facts learned at runtime (published FAQs from the database). */
let extra: string[] = [];
export const setExtraKB = (lines: string[]) => { extra = lines; };
export const extraKB = () => extra;

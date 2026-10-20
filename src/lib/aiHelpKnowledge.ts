/** Offline knowledge used by the on-device WorkTrace AI Help. Keep short & factual. */
export const KB: { k: string[]; en: string; ms: string }[] = [
  { k: ['journal', 'jurnal', 'chart of accounts', 'carta akaun', 'balance sheet', 'kunci kira-kira', 'profit', 'untung rugi', 'trial balance', 'imbangan duga', 'ledger', 'lejar'], en: 'Accounting: Accounting > Chart of Accounts comes preloaded with standard accounts; add, edit or deactivate your own (accounts used in postings cannot be deleted). Accounting > Journal Entries lists manual journals plus automatic entries from invoices, bills, purchase payments, credit notes and Bank records. New Journal Entry needs balanced debits and credits. Balance Sheet, Profit & Loss, Trial Balance, General Ledger, Journal and Double Entry Detail reports use these records.', ms: 'Perakaunan: Perakaunan > Carta Akaun dimuatkan dengan akaun standard; tambah, sunting atau nyahaktif akaun sendiri (akaun yang digunakan tidak boleh dipadam). Perakaunan > Catatan Jurnal menyenaraikan jurnal manual serta catatan automatik daripada invois, bil, bayaran pembelian, nota kredit dan rekod Bank. Catatan Jurnal Baharu memerlukan debit dan kredit seimbang. Laporan Kunci Kira-kira, Untung & Rugi, Imbangan Duga, Lejar Am, Butiran Jurnal dan Catatan Bergu menggunakan rekod ini.' },
  { k: ['reports', 'laporan kewangan', 'csv', 'aging', 'pengumuran', 'report export'], en: 'Reports: select a report, filter dates and search, refresh, download CSV or Print / Save PDF. Sales, quotation, purchase, item and manual Bank reports use your saved records. Invoice collections use fully Paid invoices; partial allocations are unavailable. Product amounts exclude document-level tax and deductions. Inventory, asset, reconciliation, FX and statutory SST reports identify required records when unavailable, rather than inventing figures. Bank reports require accepting the Bank draft first.', ms: 'Laporan: pilih laporan, tapis tarikh dan cari, muat semula, muat turun CSV atau Cetak / Simpan PDF. Laporan jualan, sebut harga, pembelian, item dan Bank manual menggunakan rekod anda. Kutipan invois menggunakan invois Dibayar penuh; peruntukan separa tidak tersedia. Jumlah produk tidak termasuk cukai dan potongan peringkat dokumen. Laporan inventori, aset, penyesuaian, pertukaran dan SST berkanun menyatakan rekod diperlukan apabila belum tersedia, bukan mereka angka. Laporan Bank memerlukan penerimaan draf Bank dahulu.' },
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
  { k: ['purchase', 'pembelian', 'bank', 'accounting', 'perakaunan', 'report', 'free', 'percuma', 'lock', 'kunci'], en: 'Purchases, Bank, Accounting and Reports are view-only on the Free plan: you can see them and your old data, but adding, editing or deleting needs a paid plan.', ms: 'Pembelian, Bank, Perakaunan dan Laporan adalah lihat sahaja untuk pelan Percuma: anda boleh lihat dan data lama, tetapi tambah, sunting atau padam memerlukan pelan berbayar.' },
  { k: ['backup', 'sandaran', 'export', 'eksport', 'migrate', 'pindah', 'download'], en: 'Data backup: Settings > Data Backup. Download everything as JSON or CSV spreadsheets. Paid plans only.', ms: 'Sandaran data: Tetapan > Sandaran Data. Muat turun semua sebagai JSON atau hamparan CSV. Pelan berbayar sahaja.' },
  { k: ['purchase order', 'bill', 'bil', 'grn', 'credit note', 'nota kredit', 'supplier payment', 'pesanan belian'], en: 'Purchases: Purchases menu > Purchase Orders, Goods Received Notes, Bills, Credit Notes, Payments, Refunds. Press New, pick a supplier, add items (tax is a % per line), Save. Tap a row to edit; use the PDF icon or Preview PDF to download.', ms: 'Pembelian: menu Pembelian > Pesanan Belian, Nota Penerimaan Barang, Bil, Nota Kredit, Bayaran, Bayaran Balik. Tekan Baru, pilih pembekal, tambah item (cukai % setiap baris), Simpan. Tekan baris untuk sunting; guna ikon PDF atau Pratonton PDF untuk muat turun.' },
  { k: ['contact person', 'orang hubungan', 'address', 'alamat', 'tin', 'registration', 'pendaftaran'], en: 'Contacts: New Customer/Supplier/Employee has entity type, legal name, registration no., TIN, SST, multiple contact persons (star = default), several phones/emails and addresses (mark billing/shipping). When creating a document, pick the contact, then choose the contact person and address.', ms: 'Kenalan: Pelanggan/Pembekal/Pekerja Baru ada jenis entiti, nama sah, no. pendaftaran, TIN, SST, ramai orang hubungan (bintang = lalai), beberapa telefon/emel dan alamat (tanda bil/penghantaran). Semasa mencipta dokumen, pilih kenalan, kemudian pilih orang hubungan dan alamat.' },
  { k: ['autosave', 'draft', 'draf', 'restore', 'pulih', 'unsaved', 'hilang'], en: 'Autosave: anything typed in a "new" form is kept on your device. When you press the add new button again, choose Restore to continue the unsaved form or Start new to begin fresh. The draft is cleared once saved.', ms: 'Autosimpan: apa yang ditaip dalam borang "baharu" disimpan dalam peranti anda. Bila tekan butang tambah baharu semula, pilih Pulihkan untuk sambung borang belum disimpan atau Mula baharu. Draf dipadam selepas disimpan.' },
  { k: ['purchase product', 'purchase item', 'produk pembelian', 'item pembelian', 'catalog', 'katalog'], en: 'All purchase documents use the same Products catalog as sales. Pick a product to fill its name, description, unit and price. Add New Product automatically saves it to Products before adding it to the purchase document. Quantity, account, discount and tax remain editable.', ms: 'Semua dokumen pembelian menggunakan katalog Produk yang sama dengan jualan. Pilih produk untuk isi nama, penerangan, unit dan harga. Tambah Produk Baru menyimpannya secara automatik ke Produk sebelum menambahnya ke dokumen pembelian. Kuantiti, akaun, diskaun dan cukai boleh disunting.' },
  { k: ['bank account', 'bank', 'money in', 'money out', 'transfer', 'wang masuk', 'wang keluar', 'pindahan', 'baki', 'ledger', 'lejar'], en: 'Bank: Accounts > New Account to save a bank/cash account and opening balance in MYR. Money In and Money Out record dated amounts, parties and references. Transfers move funds between two different accounts in one record. Tap a row to edit; the ledger icon shows account history. Balances recalculate after saves, edits and deletions. Accounts with transactions cannot be deleted. Entries are manual and do not automatically settle invoices or bills. Free plan is view-only.', ms: 'Bank: Akaun > Akaun Baru untuk simpan akaun bank/tunai dan baki awal dalam MYR. Wang Masuk dan Wang Keluar merekod jumlah, pihak dan rujukan bertarikh. Pindahan memindahkan wang antara dua akaun berbeza dalam satu rekod. Tekan baris untuk sunting; ikon lejar menunjukkan sejarah akaun. Baki dikira semula selepas simpan, sunting dan padam. Akaun yang mempunyai transaksi tidak boleh dipadam. Rekod dimasukkan secara manual dan tidak melangsaikan invois atau bil secara automatik. Pelan Percuma adalah lihat sahaja.' },
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
  ['How do I view and download reports?', 'Bagaimana melihat dan memuat turun laporan?'],
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
  ['What can Free users do in Purchases, Bank, Accounting and Reports?', 'Apa pengguna Percuma boleh buat dalam Pembelian, Bank, Perakaunan dan Laporan?'],
  ['How do I back up or export my data?', 'Bagaimana sandar atau eksport data saya?'],
  ['How do I create purchase orders, bills and other purchase documents?', 'Bagaimana buat pesanan belian, bil dan dokumen pembelian lain?'],
  ['How do I add contact persons and multiple addresses?', 'Bagaimana tambah orang hubungan dan beberapa alamat?'],
  ['How do I continue an unsaved form?', 'Bagaimana sambung borang yang belum disimpan?'],
  ['How do I select or save products in purchase documents?', 'Bagaimana pilih atau simpan produk dalam dokumen pembelian?'],
  ['How do I manage bank accounts, money in, money out and transfers?', 'Bagaimana urus akaun bank, wang masuk, wang keluar dan pindahan?'],
];

export const kbFaqs = () => KB.map((e, i) => ({
  id: `kb-${i}`, question_en: Q[i]?.[0] ?? e.k[0], question_ms: Q[i]?.[1] ?? e.k[0],
  answer_en: e.en, answer_ms: e.ms, category: 'WorkTrace', sort_order: 1000 + i,
}));

/** Extra facts learned at runtime (published FAQs from the database). */
let extra: string[] = [];
export const setExtraKB = (lines: string[]) => { extra = lines; };
export const extraKB = () => extra;

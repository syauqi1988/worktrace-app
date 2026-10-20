export type ReportDefinition = { name: string; ms: string; source?: 'invoice' | 'quotation' | 'purchase' | 'bank'; mode?: 'documents' | 'party' | 'items' | 'aging' | 'agingDetail' | 'cashflow'; purchaseKind?: string; paid?: boolean; detail?: boolean; requirement?: [string, string] };
export type ReportGroup = { title: string; reports: ReportDefinition[] };
const accounting: [string, string] = ['Posted double-entry journals and a chart of accounts are required. Accounting records are not yet available.', 'Catatan jurnal catatan bergu yang dipos dan carta akaun diperlukan. Rekod perakaunan belum tersedia.'];
const inventory: [string, string] = ['Stock movements, opening quantities and costing records are required. The Products catalog does not track stock.', 'Pergerakan stok, kuantiti awal dan rekod kos diperlukan. Katalog Produk tidak menjejak stok.'];
const tax: [string, string] = ['SST classifications, taxable dates and settlement allocations are required. Line tax alone is not sufficient for statutory SST reporting.', 'Pengelasan SST, tarikh bercukai dan peruntukan bayaran diperlukan. Cukai baris sahaja tidak mencukupi untuk laporan SST berkanun.'];
const assets: [string, string] = ['An asset register with acquisition, depreciation and disposal records is required. Fixed Assets is not yet connected.', 'Daftar aset dengan rekod perolehan, susut nilai dan pelupusan diperlukan. Aset Tetap belum disambungkan.'];
const fx: [string, string] = ['Foreign currency balances and dated exchange rates are required. These records are not yet available.', 'Baki mata wang asing dan kadar pertukaran bertarikh diperlukan. Rekod ini belum tersedia.'];
export const REPORT_GROUPS: ReportGroup[] = [
  { title: 'Financial Reports', reports: [
    { name: 'Balance Sheet', ms: 'Kunci Kira-kira', requirement: accounting },
    { name: 'Profit & Loss', ms: 'Untung & Rugi', requirement: accounting },
    { name: 'Cash Flow Statement', ms: 'Penyata Aliran Tunai', source: 'bank', mode: 'cashflow' },
    { name: 'Financial Summary', ms: 'Ringkasan Kewangan', source: 'invoice', mode: 'documents' },
  ] },
  { title: 'Aging Reports', reports: [
    { name: 'Aged Receivables Summary', ms: 'Ringkasan Pengumuran Penghutang', source: 'invoice', mode: 'aging' },
    { name: 'Aged Receivables Detail', ms: 'Butiran Pengumuran Penghutang', source: 'invoice', mode: 'agingDetail' },
    { name: 'Aged Payables Summary', ms: 'Ringkasan Pengumuran Pemiutang', source: 'purchase', purchaseKind: 'bill', mode: 'aging' },
    { name: 'Aged Payables Detail', ms: 'Butiran Pengumuran Pemiutang', source: 'purchase', purchaseKind: 'bill', mode: 'agingDetail' },
  ] },
  { title: 'Sales Reports', reports: [
    { name: 'Invoice Summary', ms: 'Ringkasan Invois', source: 'invoice', mode: 'documents' },
    { name: 'Sales Credit Note Summary', ms: 'Ringkasan Nota Kredit Jualan', requirement: ['Sales credit notes are not yet recorded. Purchase credit notes are not sales credits.', 'Nota kredit jualan belum direkodkan. Nota kredit pembelian bukan kredit jualan.'] },
    { name: 'Sales Payment Summary', ms: 'Ringkasan Bayaran Jualan', source: 'invoice', paid: true, mode: 'documents' },
    { name: 'Quotations by Customer', ms: 'Sebut Harga Mengikut Pelanggan', source: 'quotation', mode: 'party' },
    { name: 'Sales Orders By Customer', ms: 'Pesanan Jualan Mengikut Pelanggan', requirement: ['Sales orders are not yet recorded. Work orders and quotations are different document types.', 'Pesanan jualan belum direkodkan. Arahan kerja dan sebut harga ialah jenis dokumen berbeza.'] },
    { name: 'Delivery Orders By Customer', ms: 'Pesanan Penghantaran Mengikut Pelanggan', requirement: ['Delivery orders are not yet recorded. Completion reports are not delivery orders.', 'Pesanan penghantaran belum direkodkan. Laporan siap kerja bukan pesanan penghantaran.'] },
    { name: 'Sales Summary By Customer', ms: 'Ringkasan Jualan Mengikut Pelanggan', source: 'invoice', mode: 'party' },
    { name: 'Sales By Tag', ms: 'Jualan Mengikut Tag', source: 'invoice', mode: 'party', detail: true },
  ] },
  { title: 'Purchase Reports', reports: [
    { name: 'Bill Summary', ms: 'Ringkasan Bil', source: 'purchase', purchaseKind: 'bill', mode: 'documents' },
    { name: 'Purchase Credit Note Summary', ms: 'Ringkasan Nota Kredit Pembelian', source: 'purchase', purchaseKind: 'credit_note', mode: 'documents' },
    { name: 'Purchase Payment Summary', ms: 'Ringkasan Bayaran Pembelian', source: 'purchase', purchaseKind: 'payment', mode: 'documents' },
    { name: 'Purchase Orders by Supplier', ms: 'Pesanan Belian Mengikut Pembekal', source: 'purchase', purchaseKind: 'purchase_order', mode: 'party' },
    { name: 'Purchase Summary by Supplier', ms: 'Ringkasan Pembelian Mengikut Pembekal', source: 'purchase', purchaseKind: 'bill', mode: 'party' },
  ] },
  { title: 'Payment Reports', reports: [
    { name: 'Official Receipt Summary', ms: 'Ringkasan Resit Rasmi', source: 'invoice', paid: true, mode: 'documents' },
    { name: 'Payment Voucher Summary', ms: 'Ringkasan Baucar Bayaran', source: 'purchase', purchaseKind: 'payment', mode: 'documents' },
    { name: 'Cash Sales Summary', ms: 'Ringkasan Jualan Tunai', requirement: ['Sales payment method records are required to distinguish cash from bank payments.', 'Rekod kaedah bayaran jualan diperlukan untuk membezakan tunai daripada bayaran bank.'] },
    { name: 'Cash Purchase Summary', ms: 'Ringkasan Pembelian Tunai', requirement: ['Purchase payment method records are required to identify cash purchases.', 'Rekod kaedah bayaran pembelian diperlukan untuk mengenal pasti pembelian tunai.'] },
  ] },
  { title: 'Product Reports', reports: [
    { name: 'Product Sales Summary', ms: 'Ringkasan Jualan Produk', source: 'invoice', mode: 'items' },
    { name: 'Product Sales Detail', ms: 'Butiran Jualan Produk', source: 'invoice', mode: 'items', detail: true },
    { name: 'Product Bundle Sales Summary', ms: 'Ringkasan Jualan Pakej Produk', requirement: ['Product bundle definitions and bundle sales records are required.', 'Takrif pakej produk dan rekod jualan pakej diperlukan.'] },
    { name: 'Product Purchase Summary', ms: 'Ringkasan Pembelian Produk', source: 'purchase', purchaseKind: 'bill', mode: 'items' },
    { name: 'Product Purchase Detail', ms: 'Butiran Pembelian Produk', source: 'purchase', purchaseKind: 'bill', mode: 'items', detail: true },
    { name: 'Item Sales Collection', ms: 'Kutipan Jualan Item', requirement: ['Payment allocations to individual invoice items are required. Paid invoice totals cannot establish item-level collections.', 'Peruntukan bayaran kepada setiap item invois diperlukan. Jumlah invois dibayar tidak menentukan kutipan per item.'] },
  ] },
  { title: 'Inventory Reports', reports: ['Inventory Summary', 'Inventory Detail', 'Inventory Summary by Location', 'Profit Summary', 'Profit Detail'].map((name, i) => ({ name, ms: ['Ringkasan Inventori', 'Butiran Inventori', 'Ringkasan Inventori Mengikut Lokasi', 'Ringkasan Untung', 'Butiran Untung'][i], requirement: inventory })) },
  { title: 'Fixed Asset Reports', reports: ['Fixed Asset List', 'Depreciation Schedule', 'Disposal Schedule'].map((name, i) => ({ name, ms: ['Senarai Aset Tetap', 'Jadual Susut Nilai', 'Jadual Pelupusan'][i], requirement: assets })) },
  { title: 'Ledger Reports', reports: [
    { name: 'General Ledger', ms: 'Lejar Am', requirement: accounting },
    { name: 'Debtor Ledger', ms: 'Lejar Penghutang', source: 'invoice', mode: 'documents' },
    { name: 'Creditor Ledger', ms: 'Lejar Pemiutang', source: 'purchase', purchaseKind: 'bill', mode: 'documents' },
  ] },
  { title: 'SST Reports', reports: ['SST-02', 'SST Sales Detail', 'SST Purchase Detail', 'SST Payment Collection', 'SST Deemed Payments', 'SST Recovered Payments', 'SST by Products'].map((name, i) => ({ name, ms: ['SST-02', 'Butiran Jualan SST', 'Butiran Pembelian SST', 'Kutipan Bayaran SST', 'Bayaran Dianggap SST', 'Bayaran Dipulihkan SST', 'SST Mengikut Produk'][i], requirement: tax })) },
  { title: 'Accounting Reports', reports: [
    ...['Journal Entry Detail', 'Double Entry Detail', 'Trial Balance'].map((name, i) => ({ name, ms: ['Butiran Catatan Jurnal', 'Butiran Catatan Bergu', 'Imbangan Duga'][i], requirement: accounting })),
    { name: 'Bank Reconciliation', ms: 'Penyesuaian Bank', requirement: ['Bank statement imports and reconciliation matches are required. Manual bank entries alone cannot establish reconciliation.', 'Import penyata bank dan padanan penyesuaian diperlukan. Rekod bank manual sahaja tidak menentukan penyesuaian.'] },
    { name: 'Reconciled Transactions', ms: 'Transaksi Disesuaikan', requirement: ['Bank statement reconciliation matches are not yet recorded.', 'Padanan penyesuaian penyata bank belum direkodkan.'] },
    { name: 'Transaction List', ms: 'Senarai Transaksi', source: 'bank', mode: 'documents' },
    ...['Exchange Gain/Loss Summary', 'Unrealised Exchange Detail', 'Exchange Rates'].map((name, i) => ({ name, ms: ['Ringkasan Untung/Rugi Pertukaran', 'Butiran Pertukaran Belum Direalisasi', 'Kadar Pertukaran'][i], requirement: fx })),
    { name: 'Audit Trail', ms: 'Jejak Audit', requirement: ['Immutable change history with actor and before/after values is required. Current records are not an audit trail.', 'Sejarah perubahan kekal dengan pelaku dan nilai sebelum/selepas diperlukan. Rekod semasa bukan jejak audit.'] },
    { name: 'Chart of Accounts', ms: 'Carta Akaun', requirement: accounting },
  ] },
];
export const ALL_REPORTS = REPORT_GROUPS.flatMap(g => g.reports);
import { useTranslation } from 'react-i18next';

/**
 * Dual-language helpers.
 *  - useL():  l('English', 'Bahasa Melayu') — inline pair, use for ALL new UI text.
 *  - useTx(): tx('English') — looks up MS_DICT; used by shared list/form/menu screens.
 */
export const MS_DICT: Record<string, string> = {
  // Common
  'New': 'Baru', 'Save': 'Simpan', 'Saving...': 'Menyimpan...', 'Cancel': 'Batal', 'Delete': 'Padam',
  'Edit': 'Edit', 'Back': 'Kembali', 'Loading...': 'Memuatkan...', 'Search': 'Cari', 'Search...': 'Cari...',
  'All': 'Semua', 'Date': 'Tarikh', 'Date Range': 'Julat Tarikh', 'Amount': 'Jumlah', 'Total': 'Jumlah',
  'Status': 'Status', 'Reference': 'Rujukan', 'Action': 'Tindakan', 'Name': 'Nama', 'Phone': 'Telefon',
  'Email': 'E-mel', 'Address': 'Alamat', 'Notes': 'Nota', 'Active': 'Aktif', 'Inactive': 'Tidak Aktif',
  'Details': 'Butiran', 'Additional Info': 'Maklumat Tambahan', 'Company': 'Syarikat', 'Position': 'Jawatan',
  'No records found.': 'Tiada rekod dijumpai.', 'Reset filters': 'Set semula penapis', 'selected': 'dipilih',
  'items': 'item', 'of': 'daripada', 'page': 'halaman', 'Description': 'Penerangan', 'Qty': 'Kuantiti',
  'Unit Price': 'Harga Seunit', 'Items': 'Item', 'Add Item': 'Tambah Item', 'Subtotal': 'Jumlah Kecil',
  'Name is required': 'Nama diperlukan', 'Saved to Contacts': 'Disimpan ke Kenalan', 'No contacts yet': 'Tiada kenalan lagi',
  'Due Date': 'Tarikh Akhir', 'Terms': 'Terma', 'Remarks': 'Catatan', 'Attention': 'Perhatian', 'Select': 'Pilih',
  // Statuses
  'Draft': 'Draf', 'Sent': 'Dihantar', 'Received': 'Diterima', 'Paid': 'Dibayar', 'Unpaid': 'Belum Dibayar',
  'Overdue': 'Tertunggak', 'Closed': 'Ditutup', 'Approved': 'Diluluskan', 'Pending': 'Belum Selesai',
  // Nav / sections
  'Home': 'Utama', 'Contacts': 'Kenalan', 'Suppliers': 'Pembekal', 'Supplier': 'Pembekal', 'Employees': 'Pekerja',
  'Employee': 'Pekerja', 'Purchases': 'Pembelian', 'Purchase Orders': 'Pesanan Belian',
  'Goods Received Notes': 'Nota Penerimaan Barang', 'Bills': 'Bil', 'Credit Notes': 'Nota Kredit',
  'Payments': 'Bayaran', 'Refunds': 'Bayaran Balik', 'Bank': 'Bank', 'Money In': 'Wang Masuk',
  'Money Out': 'Wang Keluar', 'Transfers': 'Pindahan', 'Accounts': 'Akaun', 'Accounting': 'Perakaunan',
  'Journal Entries': 'Catatan Jurnal', 'Contras': 'Kontra', 'Fixed Assets': 'Aset Tetap',
  'Deemed Payments': 'Bayaran Dianggap', 'Chart of Accounts': 'Carta Akaun',
  'Home / Contacts': 'Utama / Kenalan', 'Home / Purchases': 'Utama / Pembelian',
  // Contacts
  'New Supplier': 'Pembekal Baru', 'New Employee': 'Pekerja Baru', 'Edit Supplier': 'Edit Pembekal',
  'Edit Employee': 'Edit Pekerja', 'No suppliers yet.': 'Tiada pembekal lagi.', 'No employees yet.': 'Tiada pekerja lagi.',
  'Delete suppliers': 'Padam pembekal', 'Delete employees': 'Padam pekerja',
  'Suppliers deleted': 'Pembekal dipadam', 'Employees deleted': 'Pekerja dipadam',
  'Supplier saved': 'Pembekal disimpan', 'Employee saved': 'Pekerja disimpan',
  'Customer': 'Pelanggan', 'Customers': 'Pelanggan',
  // Purchases
  'New Purchase Order': 'Pesanan Belian Baru', 'New Goods Received Note': 'Nota Penerimaan Barang Baru',
  'New Bill': 'Bil Baru', 'New Credit Note': 'Nota Kredit Baru', 'New Payment': 'Bayaran Baru', 'New Refund': 'Bayaran Balik Baru',
  'No purchase orders found.': 'Tiada pesanan belian dijumpai.', 'No goods received notes found.': 'Tiada nota penerimaan barang dijumpai.',
  'No bills found.': 'Tiada bil dijumpai.', 'No credit notes found.': 'Tiada nota kredit dijumpai.',
  'No payments found.': 'Tiada bayaran dijumpai.', 'No refunds found.': 'Tiada bayaran balik dijumpai.',
  'All suppliers': 'Semua pembekal', 'PO No.': 'No. PO', 'GRN No.': 'No. GRN', 'Bill No.': 'No. Bil',
  'CN No.': 'No. NK', 'Payment No.': 'No. Bayaran', 'Refund No.': 'No. Bayaran Balik', 'Number': 'Nombor',
  'Billing & Shipping': 'Bil & Penghantaran',
  'Billing & shipping parties for the transaction.': 'Pihak bil & penghantaran untuk transaksi.',
  'Shipping instructions, tracking no & etc.': 'Arahan penghantaran, no. penjejakan & lain-lain.',
  'Billing Attention': 'Perhatian Bil',
  'Shipping Attention': 'Perhatian Penghantaran',
  'Billing Address': 'Alamat Bil',
  'Shipping Address': 'Alamat Penghantaran',
  'General Info': 'Maklumat Am',
  'General information such as number, date and more for the transaction.': 'Maklumat am seperti nombor, tarikh dan lain-lain untuk transaksi.',
  'No.': 'No.',
  'Currency': 'Mata Wang',
  'Rate': 'Kadar',
  'Internal Note': 'Nota Dalaman',
  'Title': 'Tajuk',
  'Tax Inclusive': 'Termasuk Cukai',
  'Tax Exclusive': 'Tidak Termasuk Cukai',
  'Item': 'Item',
  'Account': 'Akaun',
  'Quantity': 'Kuantiti',
  'Discount': 'Diskaun',
  'Tax': 'Cukai',
  'No data': 'Tiada data',
  'Sub Total': 'Jumlah Kecil',
  'Discount Given': 'Diskaun Diberi',
  'TOTAL': 'JUMLAH',
  'Payment Terms': 'Terma Bayaran',
  'Term': 'Terma',
  'Due On': 'Tarikh Akhir',
  'No payment terms': 'Tiada terma bayaran',
  'Additional information such as remarks and country specific fields.': 'Maklumat tambahan seperti catatan dan medan khusus negara.',
  'Remarks displayed on the form.': 'Catatan yang dipaparkan pada borang.',
  'Attachments': 'Lampiran',
  'Supporting documents attached to the transaction.': 'Dokumen sokongan untuk transaksi.',
  'Drop files to upload': 'Lepaskan fail untuk dimuat naik',
  'Controls': 'Kawalan',
  'Controls and statuses for the transaction.': 'Kawalan dan status transaksi.',
  'Autosave On': 'Autosimpan Aktif',
  'Pending Approval': 'Menunggu Kelulusan',
  'Ready': 'Sedia',
  'Reference No.': 'No. Rujukan',
  'Add Line': 'Tambah Baris',
  'is required': 'diperlukan',
  'Add Term': 'Tambah Terma',
};

export function useL() {
  const { i18n } = useTranslation();
  const en = i18n.language?.startsWith('en');
  return (enText: string, msText: string) => (en ? enText : msText);
}

export function useTx() {
  const { i18n } = useTranslation();
  const en = i18n.language?.startsWith('en');
  return (s?: string | null): string => {
    if (!s) return s ?? '';
    if (en) return s;
    return MS_DICT[s] ?? s;
  };
}

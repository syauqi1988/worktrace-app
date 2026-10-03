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
  'Due Date': 'Tarikh Akhir', 'Terms': 'Terma', 'Remarks': 'Catatan', 'Attention': 'Perhatian',
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

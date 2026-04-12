

## Fix: Kaedah Bayaran Tidak Disertakan Dalam Invois

### Masalah
Kaedah bayaran tidak dipaparkan dalam invois kerana:
1. Invois yang sedia ada mungkin tidak mempunyai `selected_payment_methods` yang tersimpan (kosong).
2. Semasa edit invois, kaedah bayaran yang dipilih tidak dimuat semula — jadi ia hilang jika invois disimpan semula.

### Penyelesaian

**1. Fallback pada halaman detail invois** (`InvoiceDetailPage.tsx`)
- Jika `selected_payment_methods` kosong, gunakan SEMUA kaedah bayaran dari profil sebagai fallback.
- Ini memastikan invois lama (sebelum ciri ini ditambah) tetap memaparkan kaedah bayaran.

**2. Muat semula kaedah bayaran semasa edit** (`InvoiceFormPage.tsx`)  
- Semasa edit invois, restore `selectedPaymentMethods` dari `inv.selected_payment_methods` yang tersimpan.
- Jika tiada yang tersimpan, fallback kepada semua kaedah bayaran profil.

### Fail yang diubah
- `src/pages/InvoiceDetailPage.tsx` — fallback logic untuk `selectedPMs`
- `src/pages/InvoiceFormPage.tsx` — restore saved payment methods on edit

### Tiada perubahan pada
- PDF component (`InvoicePDF.tsx`) — sudah betul, ia render apa sahaja yang diterima via `paymentMethods` prop
- Struktur database — tiada perubahan diperlukan


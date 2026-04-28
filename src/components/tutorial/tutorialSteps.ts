import type { DriveStep } from 'driver.js';
import type { TutorialPage } from '@/hooks/useTutorial';

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

export function buildPageTutorialSteps(page: TutorialPage): DriveStep[] {
  switch (page) {
    case 'dashboard': return buildDashboardSteps();
    case 'jobs': return buildJobsSteps();
    case 'job-detail': return buildJobDetailSteps();
    case 'customers': return buildCustomersSteps();
    case 'quotations': return buildQuotationsSteps();
    case 'quotation-detail': return buildQuotationDetailSteps();
    case 'work-orders': return buildWorkOrdersSteps();
    case 'invoices': return buildInvoicesSteps();
    case 'invoice-detail': return buildInvoiceDetailSteps();
    case 'receipts': return buildReceiptsSteps();
    case 'reports': return buildReportsSteps();
    case 'support': return buildSupportSteps();
    case 'settings': return buildSettingsSteps();
    default: return [];
  }
}

// ──────────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────────
function buildDashboardSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: '👋 Selamat datang ke WorkTrace!',
        description: 'Aplikasi mudah untuk uruskan kerja, pelanggan, sebut harga, invois dan resit — semua dalam satu tempat. Mari kita mulakan dengan pantas.',
      },
    },
    {
      element: '[data-tutorial="dashboard-stats"]',
      popover: {
        title: '📊 Ringkasan Bisnes',
        description: 'Di sini anda boleh lihat berapa kerja aktif, berapa siap bulan ini dan jumlah pendapatan — terus dari satu skrin.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="dashboard-quick-actions"]',
      popover: {
        title: '⚡ Tindakan Pantas',
        description: 'Tekan butang ini bila anda nak terus buat kerja baru, daftar pelanggan atau jana invois — tak perlu masuk menu.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="dashboard-recent-jobs"]',
      popover: {
        title: '🔨 Kerja Terkini',
        description: '10 kerja terbaru anda muncul di sini. Tekan mana-mana kerja untuk lihat butiran penuh, sebut harga dan invois berkaitan.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: isMobile() ? '[data-tutorial="hamburger-menu"]' : '[data-tutorial="sidebar"]',
      popover: {
        title: isMobile() ? '📱 Buka Menu' : '📂 Menu Navigasi',
        description: isMobile()
          ? 'Tekan ikon menu (☰) di atas kiri untuk buka semua modul: Kerja, Pelanggan, Sebut Harga, Invois, Resit dan Laporan.'
          : 'Semua modul ada di sidebar kiri — Kerja, Pelanggan, Sebut Harga, Work Order, Invois, Resit, Laporan dan Tetapan.',
        side: isMobile() ? 'bottom' : 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="help-btn"]',
      popover: {
        title: '❓ Butang Bantuan',
        description: 'Tertekan-tekan? Tekan ikon ❓ di atas pada bila-bila masa untuk tonton tutorial halaman semasa anda.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      popover: {
        title: '✅ Aliran Kerja Penuh WorkTrace',
        description: 'Ikut urutan ini untuk hasil terbaik:\n\n1️⃣ Pelanggan — daftar maklumat pelanggan\n2️⃣ Kerja — buka kerja baru untuk pelanggan\n3️⃣ Sebut Harga — hantar tawaran kepada pelanggan\n4️⃣ Work Order — arahan kerja untuk team/subkon\n5️⃣ Completion Report — laporan kerja siap\n6️⃣ Invois — bil pembayaran\n7️⃣ Resit — auto-jana selepas dibayar\n\nMari mulakan! 🚀',
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────
// JOBS LIST
// ──────────────────────────────────────────────────────────
function buildJobsSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: '🔨 Modul Kerja',
        description: 'Setiap projek anda dipanggil "Kerja". Dari satu kerja, anda boleh hasilkan sebut harga, work order, invois dan resit.',
      },
    },
    {
      element: '[data-tutorial="jobs-search"]',
      popover: {
        title: '🔍 Cari Kerja',
        description: 'Taip nombor kerja, tajuk atau nama pelanggan untuk cari dengan cepat.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="jobs-status-tabs"]',
      popover: {
        title: '📋 Tapis Ikut Status',
        description: 'Tekan tab untuk lihat kerja mengikut peringkat: Lead, Scheduled, In Progress, Completed atau Cancelled.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: isMobile() ? '[data-tutorial="jobs-fab"]' : '[data-tutorial="jobs-new-btn"]',
      popover: {
        title: '➕ Tambah Kerja Baru',
        description: isMobile()
          ? 'Tekan butang + bulat di bawah untuk cipta kerja baru. Nombor kerja dijana secara automatik.'
          : 'Tekan "Kerja Baru" untuk cipta projek baru. Pilih pelanggan, kategori dan tarikh — nombor kerja dijana auto.',
        side: isMobile() ? 'top' : 'left',
        align: 'center',
      },
    },
    {
      popover: {
        title: '✅ Aliran Selepas Cipta Kerja',
        description: 'Selepas kerja dicipta, masuk ke halaman butiran kerja untuk: hasilkan sebut harga → tukar ke invois → tandakan siap. Status kerja akan dikemaskini secara automatik.',
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────
// JOB DETAIL
// ──────────────────────────────────────────────────────────
function buildJobDetailSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: '📄 Halaman Butiran Kerja',
        description: 'Inilah pusat kawalan untuk satu kerja. Di sini anda boleh urus semua dokumen berkaitan: sebut harga, work order, invois dan resit.',
      },
    },
    {
      popover: {
        title: '1️⃣ Hasilkan Sebut Harga',
        description: 'Mulakan dengan buat sebut harga untuk pelanggan. Tambah item kerja, harga, diskaun dan SST — jumlah dikira auto.',
      },
    },
    {
      popover: {
        title: '2️⃣ Hantar via WhatsApp',
        description: 'Selepas sebut harga siap, tekan butang WhatsApp untuk hantar pautan PDF terus kepada pelanggan. Cepat dan profesional.',
      },
    },
    {
      popover: {
        title: '3️⃣ Tukar ke Invois',
        description: 'Bila sebut harga diterima, tukar ke invois dengan satu klik. Item dipindah secara automatik — tak perlu taip semula.',
      },
    },
    {
      popover: {
        title: '4️⃣ Tandakan Siap',
        description: 'Bila kerja sudah disiapkan, kemaskini status kepada "Completed". Laporan kerja siap boleh dijana untuk pelanggan.',
      },
    },
    {
      popover: {
        title: '✅ Tip',
        description: 'Tekan ikon ❓ di mana-mana halaman untuk tonton tutorial halaman tersebut. Setiap modul ada tutorial sendiri.',
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────
// CUSTOMERS
// ──────────────────────────────────────────────────────────
function buildCustomersSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: '👥 Modul Pelanggan',
        description: 'Simpan semua maklumat pelanggan di sini sekali sahaja. Lepas itu, boleh guna semula untuk kerja, sebut harga dan invois.',
      },
    },
    {
      element: '[data-tutorial="customers-search"]',
      popover: {
        title: '🔍 Cari Pelanggan',
        description: 'Cari mengikut nama atau nombor telefon. Senang nak jumpa pelanggan lama untuk job berulang.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="customers-tags"]',
      popover: {
        title: '🏷️ Tag Pelanggan',
        description: 'Tandakan pelanggan VIP atau Repeat dengan tag. Tag bantu anda kenalpasti pelanggan penting dengan satu pandangan.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="customers-new-btn"]',
      popover: {
        title: '➕ Tambah Pelanggan',
        description: 'Tekan untuk daftar pelanggan baru. Nombor telefon penting — ia akan digunakan untuk hantar invois & resit melalui WhatsApp.',
        side: 'left',
        align: 'center',
      },
    },
    {
      popover: {
        title: '✅ Tip Mudah',
        description: 'Selepas pelanggan didaftar, anda boleh terus pilih mereka semasa cipta kerja baru. Tak perlu taip nama dan telefon berulang kali.',
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────
// QUOTATIONS LIST
// ──────────────────────────────────────────────────────────
function buildQuotationsSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: '📝 Modul Sebut Harga',
        description: 'Sebut harga (quotation) ialah tawaran harga rasmi kepada pelanggan sebelum kerja dimulakan.',
      },
    },
    {
      element: '[data-tutorial="quotations-status-tabs"]',
      popover: {
        title: '📊 Status Sebut Harga',
        description: 'Tab untuk tapis: Draft (belum hantar), Sent (sudah hantar), Accepted (diterima) atau Rejected (ditolak).',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="quotations-search"]',
      popover: {
        title: '🔍 Cari',
        description: 'Cari dengan nombor sebut harga atau nama pelanggan.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="quotations-new-btn"]',
      popover: {
        title: '➕ Buat Sebut Harga',
        description: 'Tekan untuk cipta sebut harga baru. Pilih kerja, tambah item dengan harga dan kuantiti — total dikira auto termasuk SST.',
        side: 'left',
        align: 'center',
      },
    },
    {
      popover: {
        title: '✅ Aliran Sebut Harga',
        description: 'Cipta → Hantar via WhatsApp → Pelanggan terima → Tukar ke Invois. Status kerja juga akan dikemaskini secara automatik.',
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────
// QUOTATION DETAIL
// ──────────────────────────────────────────────────────────
function buildQuotationDetailSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: '📋 Butiran Sebut Harga',
        description: 'Di sini anda boleh edit, hantar, dan tukar sebut harga ini ke invois.',
      },
    },
    {
      popover: {
        title: '📲 Hantar via WhatsApp',
        description: 'Tekan butang WhatsApp untuk hantar pautan PDF sebut harga terus kepada pelanggan. Mereka boleh terima atau tolak melalui pautan tersebut.',
      },
    },
    {
      popover: {
        title: '✅ Tukar ke Invois',
        description: 'Bila pelanggan setuju, tekan "Tukar ke Invois" — semua item akan dipindah ke invois baru. Mudah dan pantas.',
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────
// WORK ORDERS
// ──────────────────────────────────────────────────────────
function buildWorkOrdersSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: '📋 Modul Work Order',
        description: 'Work Order ialah arahan kerja rasmi untuk pekerja atau subkontraktor anda — mengandungi senarai tugas, tarikh dan terma kerja.',
      },
    },
    {
      element: '[data-tutorial="workorders-search"]',
      popover: {
        title: '🔍 Cari Work Order',
        description: 'Cari mengikut nombor work order, tajuk kerja atau nama pelanggan.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="workorders-status-tabs"]',
      popover: {
        title: '📊 Tapis Mengikut Status',
        description: 'Lihat work order ikut status: Draft, Sent (sudah hantar kepada team), Accepted atau Rejected.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      popover: {
        title: '✅ Cara Hasilkan',
        description: 'Work order dihasilkan dari halaman butiran kerja. Pergi ke Kerja → pilih satu kerja → tekan "Hasilkan Work Order".',
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────
// INVOICES LIST
// ──────────────────────────────────────────────────────────
function buildInvoicesSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: '🧾 Modul Invois',
        description: 'Invois ialah bil pembayaran rasmi yang dihantar kepada pelanggan. Selepas dibayar, resit akan dijana secara automatik.',
      },
    },
    {
      element: '[data-tutorial="invoices-status-tabs"]',
      popover: {
        title: '💰 Status Invois',
        description: 'Tab status: Draft, Sent (sudah hantar), Paid (sudah dibayar) dan Overdue (lewat bayar — paparan merah).',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="invoices-search"]',
      popover: {
        title: '🔍 Cari Invois',
        description: 'Cari dengan nombor invois atau nama pelanggan.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="invoices-new-btn"]',
      popover: {
        title: '➕ Buat Invois',
        description: 'Buat invois baru dari awal, atau lebih senang — tukar dari sebut harga yang sudah diterima. Item akan dipindah secara automatik.',
        side: 'left',
        align: 'center',
      },
    },
    {
      popover: {
        title: '💳 Maklumat Bayaran',
        description: 'Maklumat bank dan QR pembayaran anda akan keluar dalam setiap invois. Setup dahulu di Tetapan → Kaedah Pembayaran.',
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────
// INVOICE DETAIL
// ──────────────────────────────────────────────────────────
function buildInvoiceDetailSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: '🧾 Butiran Invois',
        description: 'Inilah pusat kawalan invois. Anda boleh hantar invois, mohon bukti bayaran, sahkan pembayaran, dan kongsi resit — semua di sini.',
      },
    },
    {
      popover: {
        title: '1️⃣ Hantar Invois',
        description: 'Tekan "Hantar Invois" untuk WhatsApp pelanggan dengan pautan ringkas (Tekan sini). Pautan tersebut bagi mereka lihat invois & muat naik bukti bayaran.',
      },
    },
    {
      popover: {
        title: '2️⃣ Mohon Bukti Bayaran',
        description: 'Belum dibayar? Tekan "Mohon Bukti Bayaran (WhatsApp)" untuk hantar peringatan kepada pelanggan dengan pautan upload bukti.',
      },
    },
    {
      popover: {
        title: '3️⃣ Sahkan Bukti',
        description: 'Bila pelanggan upload bukti, ia akan muncul di atas. Tekan "Sahkan & Tandakan Dibayar" — invois akan jadi Paid dan resit dijana auto.',
      },
    },
    {
      popover: {
        title: '4️⃣ Kongsi Resit',
        description: 'Selepas dibayar, satu butang baru akan muncul: "Kongsi Resit via WhatsApp". Tekan untuk hantar resit kepada pelanggan dengan satu klik.',
      },
    },
    {
      popover: {
        title: '✅ Tandakan Manual',
        description: 'Pelanggan bayar tunai atau bank-in tanpa upload bukti? Tekan "Tandakan Manual" untuk tandakan dibayar sendiri.',
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────
// RECEIPTS
// ──────────────────────────────────────────────────────────
function buildReceiptsSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: '🧾 Modul Resit',
        description: 'Semua invois yang sudah dibayar akan muncul di sini sebagai resit. Resit dijana SECARA AUTOMATIK — tak perlu buat manual.',
      },
    },
    {
      element: '[data-tutorial="receipts-summary"]',
      popover: {
        title: '💰 Ringkasan',
        description: 'Lihat jumlah resit dan jumlah duit yang sudah masuk — sekilas pandang.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="receipts-search"]',
      popover: {
        title: '🔍 Cari Resit',
        description: 'Cari mengikut nombor resit, nombor invois atau nama pelanggan.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      popover: {
        title: '✅ Cara Hasilkan Resit',
        description: 'Pergi ke Invois → pilih invois → tekan "Tandakan Dibayar" atau "Sahkan Bukti". Resit akan terus muncul di sini dengan nombor resit auto.',
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────
// REPORTS
// ──────────────────────────────────────────────────────────
function buildReportsSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: '📊 Laporan Ringkasan',
        description: 'Lihat prestasi bisnes anda — pendapatan, kerja siap, pelanggan baru dan banyak lagi. Sesuai untuk semakan bulanan.',
      },
    },
    {
      element: '[data-tutorial="reports-presets"]',
      popover: {
        title: '📅 Pilih Tempoh',
        description: 'Tekan pill ini untuk pilih tempoh laporan: Minggu Ini, Bulan Ini, 3 Bulan, Tahun Ini, atau set tarikh sendiri.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="reports-export"]',
      popover: {
        title: '📥 Eksport PDF',
        description: 'Tekan untuk muat turun laporan dalam format PDF — sesuai untuk simpan rekod atau hantar kepada akauntan anda.',
        side: 'left',
        align: 'center',
      },
    },
    {
      popover: {
        title: '✅ Tip',
        description: 'Laporan dikira berdasarkan invois yang sudah berstatus PAID. Pastikan semua invois yang dibayar sudah ditandakan dengan betul.',
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────
// SUPPORT
// ──────────────────────────────────────────────────────────
function buildSupportSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: '🆘 Pusat Sokongan',
        description: 'Ada masalah atau cadangan? Hantar tiket di sini, team kami akan bantu anda secepat mungkin.',
      },
    },
    {
      element: '[data-tutorial="support-new-btn"]',
      popover: {
        title: '➕ Tiket Baru',
        description: 'Tekan untuk hantar tiket baru. Pilih kategori (Bug, Bil, Cadangan, Akaun atau Am) dan terangkan masalah anda.',
        side: 'left',
        align: 'center',
      },
    },
    {
      popover: {
        title: '✅ Apa Berlaku Selepas Itu?',
        description: 'Anda akan terima notifikasi bila admin balas. Tekan tiket di senarai untuk lihat perbualan dan balas semula. Bantuan dalam Bahasa Melayu disediakan.',
      },
    },
  ];
}

// ──────────────────────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────────────────────
function buildSettingsSteps(): DriveStep[] {
  return [
    {
      popover: {
        title: '⚙️ Tetapan',
        description: 'Setup di sini sekali sahaja — selepas itu anda boleh fokus pada kerja sebenar.',
      },
    },
    {
      popover: {
        title: '🏢 Maklumat Syarikat',
        description: 'Isi nama syarikat, alamat dan nombor telefon. Maklumat ini akan keluar dalam semua sebut harga, invois dan resit.',
      },
    },
    {
      popover: {
        title: '🖼️ Logo Syarikat',
        description: 'Upload logo syarikat (Pro sahaja). Logo akan muncul pada PDF dokumen anda — nampak lebih profesional.',
      },
    },
    {
      popover: {
        title: '💳 Kaedah Pembayaran',
        description: 'Tambah maklumat akaun bank dan QR pembayaran. Maklumat ini akan dipaparkan dalam setiap invois supaya pelanggan tahu cara bayar.',
      },
    },
    {
      popover: {
        title: '📄 Nombor Dokumen',
        description: 'Tetapkan format nombor (contoh: INV-2026-001). Sistem akan jana nombor secara auto mengikut format anda.',
      },
    },
    {
      popover: {
        title: '✅ Selesai!',
        description: 'Lepas setup tetapan, anda dah sedia mula guna WorkTrace dengan penuh. Selamat berniaga! 🎉',
      },
    },
  ];
}

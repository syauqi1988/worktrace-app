import type { DriveStep } from 'driver.js';
import type { TutorialPage } from '@/hooks/useTutorial';

export function buildPageTutorialSteps(page: TutorialPage): DriveStep[] {
  switch (page) {
    case 'dashboard':
      return buildDashboardSteps();
    case 'jobs':
      return buildJobsSteps();
    case 'customers':
      return buildCustomersSteps();
    case 'quotations':
      return buildQuotationsSteps();
    case 'invoices':
      return buildInvoicesSteps();
    case 'settings':
      return [];
    default:
      return [];
  }
}

function buildDashboardSteps(): DriveStep[] {
  return [
    {
      element: '[data-tutorial="dashboard-stats"]',
      popover: {
        title: '📊 Ringkasan Bisnes Anda',
        description: 'Lihat jumlah kerja, kerja aktif, siap bulan ini dan pendapatan sekilas pandang di sini.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },
    {
      element: '[data-tutorial="dashboard-quick-actions"]',
      popover: {
        title: '⚡ Tindakan Pantas',
        description: 'Cipta kerja baru, tambah pelanggan atau jana invois dengan cepat menggunakan butang pintasan ini.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },
    {
      element: '[data-tutorial="dashboard-recent-jobs"]',
      popover: {
        title: '🔨 Kerja Terkini',
        description: '10 kerja terbaru anda dipaparkan di sini. Klik mana-mana kerja untuk lihat butiran penuh.',
        side: 'top' as const,
        align: 'start' as const,
      },
    },
    {
      element: window.innerWidth < 768
        ? '[data-tutorial="hamburger-menu"]'
        : '[data-tutorial="sidebar"]',
      popover: {
        title: '📱 Menu Navigasi',
        description: window.innerWidth < 768
          ? 'Tekan butang menu ini untuk buka navigasi. Semua modul WorkTrace ada di sana.'
          : 'Akses semua modul dari sidebar ini — Kerja, Pelanggan, Sebut Harga, Invois dan Tetapan.',
        side: (window.innerWidth < 768 ? 'bottom' : 'right') as any,
        align: 'start' as const,
      },
    },
    {
      popover: {
        title: '✅ Dashboard Siap!',
        description: 'Anda kini faham dashboard WorkTrace. Tekan ikon ? pada mana-mana halaman untuk tutorial halaman tersebut.',
      },
    },
  ];
}

function buildJobsSteps(): DriveStep[] {
  return [
    {
      element: '[data-tutorial="jobs-search"]',
      popover: {
        title: '🔍 Cari Kerja',
        description: 'Cari kerja menggunakan nombor kerja, tajuk atau nama pelanggan.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },
    {
      element: '[data-tutorial="jobs-status-tabs"]',
      popover: {
        title: '📋 Tapis Mengikut Status',
        description: 'Klik tab untuk tapis kerja — Lead, Scheduled, In Progress, Completed atau Cancelled. Mudah jejak setiap peringkat.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },
    {
      element: '[data-tutorial="jobs-new-btn"]',
      popover: {
        title: '➕ Tambah Kerja Baru',
        description: 'Cipta kerja baru dengan tajuk, pelanggan, kategori dan tarikh. Nombor kerja dijana secara automatik.',
        side: 'left' as const,
        align: 'center' as const,
      },
    },
    {
      element: '[data-tutorial="jobs-fab"]',
      popover: {
        title: '📲 Butang Pantas (Mobile)',
        description: 'Pada skrin kecil, gunakan butang + ini untuk tambah kerja baru dengan lebih cepat.',
        side: 'top' as const,
        align: 'center' as const,
      },
    },
    {
      popover: {
        title: '✅ Modul Kerja Siap!',
        description: 'Sekarang anda tahu cara urus kerja. Setiap kerja boleh ada sebut harga dan invois tersendiri.',
      },
    },
  ];
}

function buildCustomersSteps(): DriveStep[] {
  return [
    {
      element: '[data-tutorial="customers-search"]',
      popover: {
        title: '🔍 Cari Pelanggan',
        description: 'Cari menggunakan nama atau nombor telefon. Maklumat pelanggan digunakan semula dalam semua kerja.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },
    {
      element: '[data-tutorial="customers-tags"]',
      popover: {
        title: '🏷️ Tag Pelanggan',
        description: 'Tapis pelanggan menggunakan tag VIP atau Repeat. Tag membantu anda kenalpasti pelanggan penting.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },
    {
      element: '[data-tutorial="customers-new-btn"]',
      popover: {
        title: '➕ Tambah Pelanggan',
        description: 'Daftar pelanggan baru dengan nama, telefon dan alamat. Nombor telefon digunakan untuk WhatsApp follow-up.',
        side: 'left' as const,
        align: 'center' as const,
      },
    },
    {
      popover: {
        title: '✅ Modul Pelanggan Siap!',
        description: 'Pelanggan yang didaftarkan boleh dipilih semasa cipta kerja baru. Data pelanggan disimpan secara selamat.',
      },
    },
  ];
}

function buildQuotationsSteps(): DriveStep[] {
  return [
    {
      element: '[data-tutorial="quotations-status-tabs"]',
      popover: {
        title: '📊 Status Sebut Harga',
        description: 'Jejak semua sebut harga mengikut status — Draft, Sent, Accepted atau Rejected.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },
    {
      element: '[data-tutorial="quotations-new-btn"]',
      popover: {
        title: '➕ Buat Sebut Harga',
        description: 'Cipta sebut harga profesional dengan item kerja, harga, diskaun dan SST. Jumlah dikira secara automatik.',
        side: 'left' as const,
        align: 'center' as const,
      },
    },
    {
      element: '[data-tutorial="quotations-search"]',
      popover: {
        title: '🔍 Cari Sebut Harga',
        description: 'Cari sebut harga menggunakan nombor sebut harga atau nama pelanggan.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },
    {
      popover: {
        title: '📋 Aliran Sebut Harga',
        description: 'Selepas sebut harga dihantar dan diterima pelanggan, status kerja dikemaskini secara automatik. Sebut harga yang diterima boleh ditukar kepada invois.',
      },
    },
    {
      popover: {
        title: '✅ Modul Sebut Harga Siap!',
        description: 'Kongsikan sebut harga kepada pelanggan via WhatsApp dalam format PDF yang profesional.',
      },
    },
  ];
}

function buildInvoicesSteps(): DriveStep[] {
  return [
    {
      element: '[data-tutorial="invoices-status-tabs"]',
      popover: {
        title: '💰 Status Invois',
        description: 'Pantau status invois — Draft, Sent, Paid atau Overdue. Invois tertunggak dipaparkan dalam merah.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },
    {
      element: '[data-tutorial="invoices-new-btn"]',
      popover: {
        title: '➕ Buat Invois',
        description: 'Cipta invois baru atau tukar sebut harga yang diterima kepada invois secara automatik. Import item kerja terus.',
        side: 'left' as const,
        align: 'center' as const,
      },
    },
    {
      element: '[data-tutorial="invoices-search"]',
      popover: {
        title: '🔍 Cari Invois',
        description: 'Cari menggunakan nombor invois atau nama pelanggan.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },
    {
      popover: {
        title: '💳 Kaedah Pembayaran',
        description: 'Maklumat bank transfer dan QR payment anda dipaparkan dalam setiap invois. Setup dalam Tetapan → Kaedah Pembayaran.',
      },
    },
    {
      popover: {
        title: '✅ Modul Invois Siap!',
        description: 'Selepas bayaran diterima, tandakan invois sebagai Paid dan resit pembayaran akan dijana secara automatik untuk dikongsi kepada pelanggan.',
      },
    },
  ];
}

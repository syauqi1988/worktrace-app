import type { DriveStep } from 'driver.js';
import type { NavigateFunction } from 'react-router-dom';

export function buildTutorialSteps(navigate: NavigateFunction): DriveStep[] {
  return [
    // ─── DASHBOARD ───────────────────
    {
      element: '[data-tutorial="sidebar"]',
      popover: {
        title: '📱 Navigasi Utama',
        description:
          'Ini adalah sidebar navigasi anda. Semua modul WorkTrace boleh diakses dari sini — Kerja, Pelanggan, Sebut Harga, Invois dan Tetapan.',
        side: 'right' as const,
        align: 'start' as const,
      },
    },
    {
      element: '[data-tutorial="dashboard-stats"]',
      popover: {
        title: '📊 Ringkasan Bisnes',
        description:
          'Pantau prestasi perniagaan anda sekilas pandang. Lihat jumlah kerja, kerja aktif, kerja siap dan pendapatan bulan ini.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },
    {
      element: '[data-tutorial="dashboard-quick-actions"]',
      popover: {
        title: '⚡ Tindakan Pantas',
        description:
          'Gunakan butang ini untuk cipta kerja baru, tambah pelanggan atau jana invois dengan cepat tanpa perlu ke halaman lain.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },
    {
      element: '[data-tutorial="dashboard-recent-jobs"]',
      popover: {
        title: '🔨 Kerja Terkini',
        description:
          'Senarai 10 kerja terbaru anda dipaparkan di sini. Klik mana-mana kerja untuk lihat butiran penuh termasuk sebut harga dan invois.',
        side: 'top' as const,
        align: 'start' as const,
      },
    },

    // ─── JOBS ────────────────────────
    {
      element: '[data-tutorial="jobs-nav"]',
      popover: {
        title: '💼 Modul Kerja',
        description:
          'Klik "Kerja" untuk urus semua projek anda. Setiap kerja boleh ada status tersendiri — dari Lead hinggalah Completed.',
        side: 'right' as const,
        align: 'center' as const,
        onNextClick: () => {
          navigate('/jobs');
        },
      },
    },
    {
      element: '[data-tutorial="jobs-search"]',
      popover: {
        title: '🔍 Cari & Tapis Kerja',
        description:
          'Cari kerja menggunakan nombor kerja, tajuk atau nama pelanggan. Gunakan tab status untuk tapis mengikut Lead, Scheduled, In Progress dan lain-lain.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },
    {
      element: '[data-tutorial="jobs-new-btn"]',
      popover: {
        title: '➕ Tambah Kerja Baru',
        description:
          'Klik butang ini untuk cipta kerja baru. Isi tajuk kerja, pilih pelanggan, kategori dan tarikh yang dijadualkan.',
        side: 'left' as const,
        align: 'center' as const,
      },
    },
    {
      element: '[data-tutorial="jobs-status-tabs"]',
      popover: {
        title: '📋 Tab Status Kerja',
        description:
          'Tapis senarai kerja mengikut status. Lead → Scheduled → In Progress → Completed. Klik tab untuk lihat kerja dalam setiap peringkat.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },

    // ─── CUSTOMERS ───────────────────
    {
      element: '[data-tutorial="customers-nav"]',
      popover: {
        title: '👥 Modul Pelanggan',
        description:
          'Simpan semua maklumat pelanggan anda di sini. Nombor telefon pelanggan boleh digunakan terus untuk WhatsApp follow-up.',
        side: 'right' as const,
        align: 'center' as const,
        onNextClick: () => {
          navigate('/customers');
        },
      },
    },
    {
      element: '[data-tutorial="customers-search"]',
      popover: {
        title: '🔍 Cari Pelanggan',
        description:
          'Cari pelanggan menggunakan nama atau nombor telefon. Tapis menggunakan tag seperti VIP atau Repeat untuk pelanggan setia anda.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },
    {
      element: '[data-tutorial="customers-new-btn"]',
      popover: {
        title: '➕ Tambah Pelanggan',
        description:
          'Daftarkan pelanggan baru dengan nama, nombor telefon dan alamat. Setiap pelanggan boleh ditag sebagai VIP atau Repeat untuk rujukan mudah.',
        side: 'left' as const,
        align: 'center' as const,
      },
    },

    // ─── QUOTATIONS ──────────────────
    {
      element: '[data-tutorial="quotations-nav"]',
      popover: {
        title: '📋 Modul Sebut Harga',
        description:
          'Jana sebut harga profesional untuk setiap kerja. Sebut harga anda boleh dikongsi terus kepada pelanggan melalui WhatsApp dalam format PDF.',
        side: 'right' as const,
        align: 'center' as const,
        onNextClick: () => {
          navigate('/quotations');
        },
      },
    },
    {
      element: '[data-tutorial="quotations-new-btn"]',
      popover: {
        title: '➕ Buat Sebut Harga',
        description:
          'Klik untuk buat sebut harga baru. Pilih kerja, tambah item kerja dengan harga, tetapkan diskaun dan SST jika perlu. Jumlah dikira secara automatik.',
        side: 'left' as const,
        align: 'center' as const,
      },
    },
    {
      element: '[data-tutorial="quotations-status-tabs"]',
      popover: {
        title: '📊 Status Sebut Harga',
        description:
          'Jejak status setiap sebut harga — Draft → Sent → Accepted → Rejected. Sebut harga yang diterima boleh ditukar terus kepada Invois dengan satu klik.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },

    // ─── INVOICES ────────────────────
    {
      element: '[data-tutorial="invoices-nav"]',
      popover: {
        title: '🧾 Modul Invois',
        description:
          'Jana invois dan rekod semua pembayaran di sini. Invois boleh dikongsi via WhatsApp bersama maklumat akaun bank atau QR payment anda.',
        side: 'right' as const,
        align: 'center' as const,
        onNextClick: () => {
          navigate('/invoices');
        },
      },
    },
    {
      element: '[data-tutorial="invoices-new-btn"]',
      popover: {
        title: '➕ Buat Invois',
        description:
          'Buat invois baru atau tukar sebut harga yang diterima kepada invois secara automatik. Tetapkan tarikh bayaran dan kaedah pembayaran.',
        side: 'left' as const,
        align: 'center' as const,
      },
    },
    {
      element: '[data-tutorial="invoices-status-tabs"]',
      popover: {
        title: '💰 Status Pembayaran',
        description:
          'Pantau status invois anda — Draft → Sent → Paid atau Overdue. Gunakan butang peringatan WhatsApp untuk hantar reminder bayaran kepada pelanggan.',
        side: 'bottom' as const,
        align: 'start' as const,
      },
    },

    // ─── SETTINGS ────────────────────
    {
      element: '[data-tutorial="settings-nav"]',
      popover: {
        title: '⚙️ Tetapan',
        description:
          'Setup profil syarikat anda, muat naik logo, tambah akaun bank dan QR payment untuk dipaparkan dalam invois. Aktifkan LHDN e-Invois jika diperlukan.',
        side: 'right' as const,
        align: 'center' as const,
      },
    },

    // ─── FINAL STEP ──────────────────
    {
      popover: {
        title: '🎉 Tahniah! Anda Bersedia!',
        description:
          'Anda kini tahu cara menggunakan WorkTrace! Mulakan dengan tambah kerja pertama anda sekarang.\n\nIngat: Tutorial ini boleh diakses semula bila-bila masa melalui Tetapan → Tutorial.',
      },
    },
  ];
}

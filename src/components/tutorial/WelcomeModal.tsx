interface WelcomeModalProps {
  isOpen: boolean;
  onStart: () => void;
  onSkip: () => void;
}

export default function WelcomeModal({ isOpen, onStart, onSkip }: WelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl max-w-[440px] w-full p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="text-5xl mb-4">👋</div>
        <h2 className="text-lg font-medium text-[#0F172A] mb-3">
          Selamat Datang ke WorkTrace!
        </h2>
        <p className="text-sm text-[#64748B] leading-relaxed mb-4">
          Tutorial akan bermain secara automatik apabila anda melawat setiap halaman buat kali pertama.
        </p>
        <p className="text-sm text-[#64748B] mb-1">Anda juga boleh tekan ikon ? pada mana-mana halaman untuk tutorialnya.</p>
        <ul className="text-[13px] text-[#64748B] text-left space-y-1.5 mb-6 mx-auto max-w-[280px]">
          <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Tambah kerja dan pelanggan</li>
          <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Buat sebut harga profesional</li>
          <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Jana invois dan terima bayaran</li>
          <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Kongsi dokumen via WhatsApp</li>
        </ul>
        <button
          onClick={onStart}
          className="w-full h-11 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium transition-colors mb-2"
        >
          Faham, Mulakan!
        </button>
        <button
          onClick={onSkip}
          className="w-full h-11 rounded-lg text-[#64748B] text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Langkau Semua Tutorial
        </button>
        <p className="text-[11px] text-[#94A3B8] italic mt-4">
          Anda boleh semak tutorial ini semula bila-bila masa dalam Tetapan → Tutorial.
        </p>
      </div>
    </div>
  );
}

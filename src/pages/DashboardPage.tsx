import { LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Selamat datang ke WorkTrace</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Kerja Aktif', 'Pelanggan', 'Sebut Harga', 'Invois Belum Bayar'].map((label, i) => (
          <div key={label} className="bg-card rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold text-foreground mt-1">0</p>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center">
        <LayoutDashboard className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">Tiada data lagi. Mula tambah kerja dan pelanggan anda.</p>
      </div>
    </div>
  );
}

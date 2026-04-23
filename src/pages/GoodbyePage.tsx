import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function GoodbyePage() {
  const navigate = useNavigate();
  const [scheduledDate, setScheduledDate] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('worktrace_deletion_scheduled');
    if (stored) {
      try {
        const d = new Date(stored);
        setScheduledDate(d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }));
      } catch { /* ignore */ }
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-card border border-border rounded-2xl shadow-sm max-w-md w-full p-8 text-center space-y-4">
        <div className="text-5xl">😢</div>
        <h1 className="text-2xl font-bold text-foreground">Permintaan Pemadaman Diterima</h1>
        <p className="text-sm text-muted-foreground">Akaun anda akan dipadam pada:</p>
        {scheduledDate ? (
          <p className="text-lg font-bold text-primary">{scheduledDate}</p>
        ) : (
          <p className="text-lg font-bold text-primary">14 hari dari sekarang</p>
        )}
        <p className="text-sm text-muted-foreground">
          Sehingga tarikh tersebut, anda masih boleh log masuk dan batalkan pemadaman.
        </p>
        <Button onClick={() => navigate('/login')} className="w-full rounded-lg">
          Log Masuk Semula untuk Batal
        </Button>
        <p className="text-xs text-muted-foreground">
          Pertanyaan: <a href="mailto:customerservice@worktrace.my" className="underline">customerservice@worktrace.my</a>
        </p>
        <p className="text-xs text-muted-foreground">
          Terima kasih kerana menggunakan WorkTrace. Semoga berjaya! 🙏
        </p>
      </div>
    </div>
  );
}

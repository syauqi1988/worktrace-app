import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, X, AlertTriangle } from 'lucide-react';
import { tx } from '@/lib/tx';

const REASONS = [
  'Terlalu mahal',
  'Tidak guna aplikasi ini',
  tx('Hilang ciri yang diperlukan'),
  'Berpindah ke aplikasi lain',
  'Perniagaan ditutup sementara',
  'Lain-lain (nyatakan)',
];

const LOSE_ITEMS = [
  tx('Kerja aktif tanpa had'),
  tx('Pelanggan tanpa had'),
  tx('Kongsi quotation via WhatsApp'),
  tx('Logo syarikat di PDF'),
  tx('Kaedah bayaran di invois'),
  'Sistem referral',
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCancelled: () => void;
}

export default function CancellationDialog({ open, onClose, onCancelled }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const endDateStr = profile?.subscription_end_date
    ? new Date(profile.subscription_end_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const finalReason = reason === 'Lain-lain (nyatakan)' ? otherReason : reason;

  const handleConfirm = async () => {
    if (confirmText !== tx('BATAL') || !user) return;
    setLoading(true);
    try {
      await supabase.from('profiles').update({
        subscription_cancelled: true,
        cancel_requested_at: new Date().toISOString(),
        cancel_reason: finalReason,
      } as any).eq('id', user.id);

      // Subscription event logging happens server-side (billplz callback / cron).

      await refreshProfile();
      toast.success(`Langganan anda telah dibatalkan. Anda masih boleh menggunakan Pro sehingga ${endDateStr}.`, { duration: 8000 });
      onCancelled();
      resetAndClose();
    } catch {
      toast.error(tx('Gagal membatalkan langganan. Sila cuba lagi.'));
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setReason('');
    setOtherReason('');
    setConfirmText('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetAndClose(); }}>
      <DialogContent className="max-w-[420px] rounded-xl p-0 gap-0">
        {step === 1 && (
          <div className="p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">{tx('Kenapa anda ingin membatalkan?')}</h3>
            <div className="flex flex-wrap gap-2">
              {REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    reason === r
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-foreground hover:bg-accent'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {reason === 'Lain-lain (nyatakan)' && (
              <textarea
                value={otherReason}
                onChange={e => setOtherReason(e.target.value)}
                placeholder="Cerita sikit kenapa..."
                className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" onClick={resetAndClose} className="text-sm">{tx('Batal')}</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!reason || (reason === 'Lain-lain (nyatakan)' && !otherReason.trim())}
                className="rounded-lg"
              >
                {tx('Seterusnya')}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Jangan pergi dulu! 🙏</h3>
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-sm text-muted-foreground mb-2">{tx('Selepas pembatalan, anda akan kehilangan:')}</p>
              {LOSE_ITEMS.map(item => (
                <div key={item} className="flex items-center gap-2 text-sm text-foreground">
                  <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm text-blue-800">
                {tx('Langganan anda masih aktif sehingga')} <strong>{endDateStr}</strong>{tx('. Anda masih boleh menggunakan semua ciri Pro sehingga tarikh tersebut.')}
              </p>
            </div>
            <Button onClick={resetAndClose} className="w-full rounded-lg">{tx('Kekal dengan Pro')}</Button>
            <Button
              variant="outline"
              onClick={() => setStep(3)}
              className="w-full rounded-lg text-destructive border-destructive hover:bg-destructive/5"
            >
              Ya, Batalkan Langganan
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Pengesahan Pembatalan</h3>
            <p className="text-sm text-muted-foreground">
              {tx('Dengan membatalkan, langganan Pro anda akan tamat pada')} <strong>{endDateStr}</strong>{tx('. Selepas itu, akaun anda akan kembali ke pelan Free secara automatik.')}
            </p>
            <p className="text-sm text-muted-foreground">
              {tx('Data anda (kerja, pelanggan, invois) akan')} <strong>{tx('DISIMPAN')}</strong> dan tidak akan dipadam.
            </p>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{tx('Taip BATAL untuk mengesahkan:')}</label>
              <Input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={tx("Taip BATAL di sini")}
                className={`h-11 rounded-lg ${confirmText === tx('BATAL') ? 'border-green-500 focus-visible:ring-green-500' : confirmText ? 'border-destructive' : ''}`}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 rounded-lg">Kembali</Button>
              <Button
                onClick={handleConfirm}
                disabled={confirmText !== tx('BATAL') || loading}
                className="flex-1 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Sahkan Pembatalan
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

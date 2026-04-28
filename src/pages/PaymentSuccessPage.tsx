import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [countdown, setCountdown] = useState(5);
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncTimedOut, setSyncTimedOut] = useState(false);

  const plan = searchParams.get('plan') || 'pro';
  const period = searchParams.get('period') || 'monthly';

  const planLabel = plan === 'team' ? 'Team' : 'Pro';
  const periodLabel = period === 'yearly' ? 'Tahunan' : 'Bulanan';
  const isPlanSynced = useMemo(() => {
    return profile?.plan === plan && profile?.subscription_status === 'active';
  }, [plan, profile?.plan, profile?.subscription_status]);

  useEffect(() => {
    let cancelled = false;

    const pollProfile = async () => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await refreshProfile();
        if (cancelled) return;

        if (attempt < 7) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (!cancelled) {
        setSyncTimedOut(true);
        setIsSyncing(false);
      }
    };

    if (isPlanSynced) {
      setIsSyncing(false);
      setSyncTimedOut(false);
      return;
    }

    pollProfile();

    return () => {
      cancelled = true;
    };
  }, [isPlanSynced, refreshProfile]);

  useEffect(() => {
    if (!isPlanSynced) return;

    setIsSyncing(false);
    setSyncTimedOut(false);

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlanSynced, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border p-8 max-w-md w-full text-center space-y-6">
        {isSyncing ? (
          <LoaderCircle className="h-16 w-16 text-primary mx-auto animate-spin" />
        ) : (
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        )}

        <h1 className="text-2xl font-bold text-foreground">
          {isPlanSynced ? 'Pembayaran Berjaya!' : 'Sedang sync pembayaran...'}
        </h1>

        <p className="text-muted-foreground">
          {isPlanSynced
            ? `Selamat datang ke WorkTrace ${planLabel}!`
            : 'Kami sedang tunggu pengesahan BillPlz dan kemas kini pelan anda.'}
        </p>

        <div className="space-y-2 text-sm text-foreground">
          <p><span className="text-muted-foreground">Pelan:</span> {planLabel}</p>
          <p><span className="text-muted-foreground">Tempoh:</span> {periodLabel}</p>
        </div>

        {syncTimedOut ? (
          <p className="text-sm text-muted-foreground">
            Pembayaran anda mungkin berjaya tetapi pelan belum dikemas kini. Sila semak semula dalam beberapa saat atau hubungi sokongan jika masih belum berubah.
          </p>
        ) : isPlanSynced ? (
          <p className="text-sm text-muted-foreground">
            Akaun anda telah dinaik taraf. Semua ciri {planLabel} kini aktif.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Jangan tutup halaman ini sementara kami sedang semak status langganan anda.
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate('/dashboard')} className="w-full rounded-lg">
            Pergi ke Dashboard
          </Button>
          {!isPlanSynced && (
            <Button variant="outline" onClick={() => refreshProfile()} className="w-full rounded-lg">
              Semak Semula Status
            </Button>
          )}
        </div>

        {isPlanSynced && (
          <p className="text-xs text-muted-foreground">
            Akan ke dashboard dalam {countdown} saat...
          </p>
        )}
      </div>
    </div>
  );
}

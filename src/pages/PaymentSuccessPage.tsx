import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  const plan = searchParams.get('plan') || 'pro';
  const period = searchParams.get('period') || 'monthly';

  const planLabel = plan === 'team' ? 'Team' : 'Pro';
  const periodLabel = period === 'yearly' ? 'Tahunan' : 'Bulanan';

  useEffect(() => {
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
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border p-8 max-w-md w-full text-center space-y-6">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">Pembayaran Berjaya!</h1>
        <p className="text-muted-foreground">
          Selamat datang ke WorkTrace {planLabel}!
        </p>
        <div className="space-y-2 text-sm text-foreground">
          <p><span className="text-muted-foreground">Pelan:</span> {planLabel}</p>
          <p><span className="text-muted-foreground">Tempoh:</span> {periodLabel}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Akaun anda telah dinaik taraf. Semua ciri {planLabel} kini aktif.
        </p>
        <Button onClick={() => navigate('/dashboard')} className="w-full rounded-lg">
          Pergi ke Dashboard
        </Button>
        <p className="text-xs text-muted-foreground">
          Akan ke dashboard dalam {countdown} saat...
        </p>
      </div>
    </div>
  );
}

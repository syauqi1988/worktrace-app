import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBillPlz } from '@/hooks/useBillPlz';
import { X, AlertTriangle } from 'lucide-react';

export default function ExpiryBanner() {
  const { profile } = useAuth();
  const { initiatePayment, isLoading } = useBillPlz();
  const [dismissed, setDismissed] = useState(false);

  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];

  useEffect(() => {
    const stored = localStorage.getItem('expiry_banner_dismissed');
    if (stored === todayKey) setDismissed(true);
  }, [todayKey]);

  if (!profile || profile.plan === 'free' || !profile.subscription_end_date) return null;

  const endDate = new Date(profile.subscription_end_date);
  const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft > 7 || daysLeft < 0 || dismissed) return null;

  const endStr = endDate.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleDismiss = () => {
    localStorage.setItem('expiry_banner_dismissed', todayKey);
    setDismissed(true);
  };

  return (
    <div className="w-full px-4 py-2.5 flex items-center justify-between gap-2" style={{ backgroundColor: '#FEF3C7', borderBottom: '1px solid #FDE68A' }}>
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: '#B45309' }} />
        <p className="text-sm truncate" style={{ color: '#B45309' }}>
          Langganan Pro anda akan tamat dalam {daysLeft} hari ({endStr}).
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => initiatePayment(profile.plan as 'pro' | 'team', (profile.billing_period as 'monthly' | 'yearly') || 'monthly')}
          disabled={isLoading}
          className="text-sm font-medium px-3 py-1 rounded-lg whitespace-nowrap"
          style={{ color: '#B45309', textDecoration: 'underline' }}
        >
          Perbaharui Sekarang
        </button>
        <button onClick={handleDismiss} style={{ color: '#B45309' }}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

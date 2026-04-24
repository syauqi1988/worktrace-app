import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBillPlz } from '@/hooks/useBillPlz';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

export default function ExpiryBanner() {
  const { profile, refreshProfile } = useAuth();
  const { initiatePayment, isLoading } = useBillPlz();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];

  useEffect(() => {
    const stored = localStorage.getItem('expiry_banner_dismissed');
    if (stored === todayKey) setDismissed(true);
  }, [todayKey]);

  if (!profile) return null;

  // ===== Pending deletion variant (highest priority) =====
  if ((profile as any).account_status === 'pending_deletion' && (profile as any).deletion_scheduled_at) {
    const scheduled = new Date((profile as any).deletion_scheduled_at);
    const daysLeft = Math.max(0, Math.ceil((scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const dateStr = scheduled.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });

    const handleCancelDeletion = async () => {
      if (!profile) return;
      setCancelling(true);
      try {
        await supabase.from('profiles').update({
          account_status: 'active',
          deletion_cancelled_at: new Date().toISOString(),
          deletion_scheduled_at: null,
          deletion_requested_at: null,
        } as any).eq('id', profile.id);
        await supabase.from('account_deletion_requests')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'user' } as any)
          .eq('user_id', profile.id).eq('status', 'pending');
        await refreshProfile();
        toast.success('Pemadaman akaun dibatalkan!');
      } catch (e: any) {
        toast.error(e.message || 'Gagal batalkan pemadaman');
      } finally {
        setCancelling(false);
      }
    };

    return (
      <div className="w-full px-4 py-2.5 flex items-center justify-between gap-2" style={{ backgroundColor: '#FEE2E2', borderBottom: '1px solid #FCA5A5' }}>
        <div className="flex items-center gap-2 min-w-0">
          <Trash2 className="h-4 w-4 shrink-0" style={{ color: '#B91C1C' }} />
          <p className="text-sm truncate" style={{ color: '#B91C1C' }}>
            Akaun anda akan dipadam dalam {daysLeft} hari ({dateStr}).
          </p>
        </div>
        <button
          onClick={handleCancelDeletion}
          disabled={cancelling}
          className="text-sm font-medium px-3 py-1 rounded-lg whitespace-nowrap shrink-0"
          style={{ color: '#B91C1C', textDecoration: 'underline' }}
        >
          {cancelling ? 'Membatalkan...' : 'Batalkan Pemadaman'}
        </button>
      </div>
    );
  }

  // ===== Subscription expiry variant =====
  if (profile.plan === 'free' || !profile.subscription_end_date) return null;

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

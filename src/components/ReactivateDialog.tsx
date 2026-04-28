import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBillPlz } from '@/hooks/useBillPlz';
import { usePricingPlans } from '@/hooks/usePricingPlans';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ReactivateDialog({ open, onClose }: Props) {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const { initiatePayment, isLoading } = useBillPlz();
  const { getPlan, isLoading: plansLoading } = usePricingPlans();
  const { profile, user, refreshProfile } = useAuth();
  const [isReactivating, setIsReactivating] = useState(false);

  // Get pricing details for the selected plan
  const proPlan = getPlan('pro');
  const monthlyPrice = proPlan ? Number(proPlan.monthly_price) : 0;
  const yearlyPrice = proPlan ? Number(proPlan.yearly_price) : 0;
  const price = period === 'monthly' ? monthlyPrice : yearlyPrice;

  // Check if subscription is still active (end_date in future)
  const subscriptionEndDate = profile?.subscription_end_date 
    ? new Date(profile.subscription_end_date)
    : null;
  const isStillActive = subscriptionEndDate && subscriptionEndDate > new Date();

  const handleReactivate = async () => {
    if (!user || !profile) return;

    // If subscription is still active, just toggle the cancelled flag
    if (isStillActive) {
      setIsReactivating(true);
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ subscription_cancelled: false })
          .eq('id', user.id);

        if (error) throw error;

        await refreshProfile();
        toast.success('Langganan berjaya diaktifkan semula!');
        onClose();
      } catch (error) {
        console.error('Reactivate error:', error);
        toast.error('Gagal mengaktifkan semula langganan');
      } finally {
        setIsReactivating(false);
      }
    } else {
      // Subscription expired, proceed to payment
      await initiatePayment(profile?.plan as 'pro' | 'team', period);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[400px] rounded-xl">
        <h3 className="text-base font-bold text-foreground">Aktifkan Semula Langganan {proPlan?.name ?? 'Pro'}</h3>
        
        {isStillActive ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Langganan anda masih aktif sehingga {subscriptionEndDate?.toLocaleDateString('ms-MY', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
            <p className="text-sm text-foreground font-medium">
              Klik butang di bawah untuk aktifkan semula tanpa perlu bayar.
            </p>
            <Button
              onClick={handleReactivate}
              disabled={isReactivating}
              className="w-full rounded-lg"
            >
              {isReactivating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Aktifkan Semula (Percuma)
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Langganan anda telah tamat tempoh. Pilih tempoh untuk meneruskan langganan {proPlan?.name ?? 'Pro'}.
            </p>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setPeriod('monthly')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${period === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              >
                Bulanan
              </button>
              <button
                onClick={() => setPeriod('yearly')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${period === 'yearly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              >
                Tahunan -{Number(proPlan?.yearly_discount_pct ?? 20)}%
              </button>
            </div>
            <Button
              onClick={handleReactivate}
              disabled={isLoading || plansLoading || !proPlan}
              className="w-full rounded-lg"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Bayar RM{price.toFixed(2)}/{period === 'monthly' ? 'bulan' : 'tahun'}
            </Button>
          </div>
        )}
        
        <Button variant="outline" onClick={onClose} className="w-full rounded-lg">Batal</Button>
      </DialogContent>
    </Dialog>
  );
}
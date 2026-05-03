import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBillPlz } from '@/hooks/useBillPlz';
import { usePricingPlans } from '@/hooks/usePricingPlans';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getDateLocale } from '@/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ReactivateDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const { initiatePayment, isLoading } = useBillPlz();
  const { getPlan, isLoading: plansLoading } = usePricingPlans();
  const { profile, user, refreshProfile } = useAuth();
  const [isReactivating, setIsReactivating] = useState(false);

  const proPlan = getPlan('pro');
  const monthlyPrice = proPlan ? Number(proPlan.monthly_price) : 0;
  const yearlyPrice = proPlan ? Number(proPlan.yearly_price) : 0;
  const price = period === 'monthly' ? monthlyPrice : yearlyPrice;

  const subscriptionEndDate = profile?.subscription_end_date
    ? new Date(profile.subscription_end_date)
    : null;
  const isStillActive = subscriptionEndDate && subscriptionEndDate > new Date();

  const handleReactivate = async () => {
    if (!user || !profile) return;

    if (isStillActive) {
      setIsReactivating(true);
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ subscription_cancelled: false })
          .eq('id', user.id);

        if (error) throw error;

        await refreshProfile();
        toast.success(t('dialog.reactivateSuccess'));
        onClose();
      } catch (error) {
        console.error('Reactivate error:', error);
        toast.error(t('dialog.reactivateFailed'));
      } finally {
        setIsReactivating(false);
      }
    } else {
      await initiatePayment(profile?.plan as 'pro' | 'team', period);
    }
  };

  const planName = proPlan?.name ?? 'Pro';
  const dateStr = subscriptionEndDate?.toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) ?? '';

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[400px] rounded-xl">
        <h3 className="text-base font-bold text-foreground">{t('dialog.reactivateTitle', { plan: planName })}</h3>

        {isStillActive ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('dialog.stillActiveBody', { date: dateStr })}</p>
            <p className="text-sm text-foreground font-medium">{t('dialog.reactivateClick')}</p>
            <Button onClick={handleReactivate} disabled={isReactivating} className="w-full rounded-lg">
              {isReactivating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('dialog.reactivateFree')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('dialog.expiredBody', { plan: planName })}</p>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setPeriod('monthly')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${period === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              >
                {t('dialog.monthly')}
              </button>
              <button
                onClick={() => setPeriod('yearly')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${period === 'yearly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              >
                {t('dialog.yearly', { pct: Number(proPlan?.yearly_discount_pct ?? 20) })}
              </button>
            </div>
            <Button onClick={handleReactivate} disabled={isLoading || plansLoading || !proPlan} className="w-full rounded-lg">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('dialog.payAmount', { price: price.toFixed(2), period: period === 'monthly' ? t('dialog.perMonth') : t('dialog.perYear') })}
            </Button>
          </div>
        )}

        <Button variant="outline" onClick={onClose} className="w-full rounded-lg">{t('dialog.cancel')}</Button>
      </DialogContent>
    </Dialog>
  );
}

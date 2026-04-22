import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Lock } from 'lucide-react';
import { useBillPlz } from '@/hooks/useBillPlz';
import { usePricingPlans } from '@/hooks/usePricingPlans';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

export default function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const { initiatePayment, isLoading } = useBillPlz();
  const { getPlan, isLoading: plansLoading } = usePricingPlans();

  const proPlan = getPlan('pro');
  const monthlyPrice = proPlan ? Number(proPlan.monthly_price) : 0;
  const yearlyPrice = proPlan ? Number(proPlan.yearly_price) : 0;
  const discount = proPlan ? Number(proPlan.yearly_discount_pct) || 0 : 0;

  const isYearly = period === 'yearly';
  const price = isYearly ? yearlyPrice : monthlyPrice;
  // Effective monthly price when paying yearly
  const yearlyMonthly = yearlyPrice > 0 ? yearlyPrice / 12 : 0;
  // Original (undiscounted) yearly price for strikethrough
  const originalYearly = discount > 0 && yearlyPrice > 0
    ? Math.round(yearlyPrice / (1 - discount / 100))
    : 0;

  const features = (proPlan?.features ?? []).filter(f => f.included).slice(0, 5);

  const formatPrice = (n: number) => {
    const rounded = Math.round(n * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[420px] rounded-xl p-6">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3">
            <Lock className="h-10 w-10 text-primary mx-auto" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Had Pelan Free Dicapai
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            {reason || 'Anda telah mencapai had pelan Free. Naik taraf ke Pro untuk akses tanpa had.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex rounded-lg border border-border overflow-hidden mt-2">
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
            Tahunan{discount > 0 ? ` -${discount}%` : ''}
          </button>
        </div>

        <ul className="space-y-2 my-4">
          {features.map(f => (
            <li key={f.label} className="flex items-center gap-2 text-sm text-foreground">
              <Check className="h-4 w-4 text-green-600 shrink-0" />
              {f.label}
            </li>
          ))}
        </ul>

        <div className="text-center mb-4">
          {isYearly ? (
            <>
              {originalYearly > 0 && (
                <span className="text-sm text-muted-foreground line-through mr-1">RM{originalYearly}</span>
              )}
              <span className="text-2xl font-bold text-primary">RM{formatPrice(yearlyPrice)}</span>
              <span className="text-sm text-muted-foreground">/tahun</span>
              {yearlyMonthly > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Setara RM{formatPrice(yearlyMonthly)}/bulan
                </p>
              )}
              {discount > 0 && (
                <p className="text-xs text-green-600 font-medium mt-1">Jimat {discount}% dengan pelan tahunan!</p>
              )}
            </>
          ) : (
            <>
              <span className="text-2xl font-bold text-primary">RM{formatPrice(monthlyPrice)}</span>
              <span className="text-sm text-muted-foreground">/bulan</span>
              {discount > 0 && (
                <p className="text-xs text-green-600 font-medium mt-1">
                  Tukar ke tahunan dan jimat {discount}%
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => initiatePayment('pro', period)}
            disabled={isLoading || plansLoading || !proPlan}
            className="w-full rounded-lg"
          >
            {isLoading
              ? 'Memproses...'
              : `Upgrade ke ${proPlan?.name ?? 'Pro'}${isYearly && discount > 0 ? ` (-${discount}%)` : ''} — RM${formatPrice(price)}/${isYearly ? 'tahun' : 'bulan'}`}
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full rounded-lg text-muted-foreground">
            Mungkin lain kali
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

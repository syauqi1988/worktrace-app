import { useState } from 'react';
import { Check, X as XIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBillPlz } from '@/hooks/useBillPlz';
import { usePricingPlans, PricingPlan } from '@/hooks/usePricingPlans';
import { Skeleton } from '@/components/ui/skeleton';
import { openWhatsApp } from '@/lib/whatsapp';

interface PlanCardsProps {
  currentPlan?: string;
  onSelect: (planId: string, billingPeriod: string) => void;
  showToggle?: boolean;
  compact?: boolean;
}

const BADGE_COLOR_MAP: Record<string, string> = {
  blue: 'bg-primary text-primary-foreground',
  primary: 'bg-primary text-primary-foreground',
  gray: 'bg-muted text-muted-foreground',
  grey: 'bg-muted text-muted-foreground',
  muted: 'bg-muted text-muted-foreground',
  amber: 'bg-amber-100 text-amber-700',
  yellow: 'bg-amber-100 text-amber-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
};

function badgeClass(color: string | null) {
  if (!color) return 'bg-muted text-muted-foreground';
  return BADGE_COLOR_MAP[color.toLowerCase()] ?? 'bg-muted text-muted-foreground';
}

function isComingSoon(plan: PricingPlan) {
  return (plan.badge_text ?? '').toLowerCase().includes('akan datang');
}

export default function PlanCards({ currentPlan, onSelect, showToggle = true, compact = false }: PlanCardsProps) {
  const [yearly, setYearly] = useState(false);
  const { initiatePayment, isLoading } = useBillPlz();
  const { plans, isLoading: plansLoading } = usePricingPlans();

  // Use the highest yearly discount among paid plans for the toggle badge
  const toggleDiscount = Math.max(
    0,
    ...plans
      .filter(p => p.plan_key !== 'free')
      .map(p => Number(p.yearly_discount_pct) || 0)
  );

  const getPrice = (plan: PricingPlan) => {
    if (plan.plan_key === 'free') return 0;
    return yearly ? Number(plan.yearly_price) : Number(plan.monthly_price);
  };

  const getOriginal = (plan: PricingPlan) => {
    if (plan.plan_key === 'free') return 0;
    const discount = Number(plan.yearly_discount_pct) || 0;
    if (!discount) return 0;
    const price = getPrice(plan);
    if (yearly) {
      return Math.round(price / (1 - discount / 100));
    }
    return 0;
  };

  if (plansLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-80 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showToggle && (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => setYearly(false)}
            className={`px-4 py-2 rounded-l-full text-sm font-medium transition-colors ${
              !yearly ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            Bulanan
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-4 py-2 rounded-r-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
              yearly ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            Tahunan
            {toggleDiscount > 0 && (
              <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold">-{toggleDiscount}%</span>
            )}
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map(plan => {
          const isCurrent = currentPlan === plan.plan_key;
          const price = getPrice(plan);
          const original = getOriginal(plan);
          const savings = original > price ? original - price : 0;
          const period = plan.plan_key === 'free' ? '' : yearly ? '/tahun' : '/bulan';
          const comingSoon = isComingSoon(plan);

          return (
            <div
              key={plan.id}
              className={`rounded-xl ${compact ? 'p-4' : 'p-6'} flex flex-col transition-all bg-card ${
                plan.is_featured
                  ? 'border-2 border-primary shadow-md'
                  : 'border border-border'
              }`}
            >
              <div className="mb-4">
                {plan.badge_text && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeClass(plan.badge_color)}`}>
                      {plan.badge_text}
                    </span>
                  </div>
                )}
                <h3 className={`font-bold text-lg mt-2 ${plan.is_featured ? 'text-primary' : 'text-foreground'}`}>
                  {plan.name}
                </h3>
                {plan.tagline && (
                  <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                )}
                <div className="mt-2">
                  {original > 0 && (
                    <span className="text-sm text-muted-foreground line-through mr-2">
                      RM{original}
                    </span>
                  )}
                  <span className={`text-3xl font-bold ${plan.is_featured ? 'text-primary' : 'text-foreground'}`}>
                    RM{price}
                  </span>
                  <span className="text-sm text-muted-foreground">{period}</span>
                </div>
                {savings > 0 && yearly && (
                  <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    Jimat RM{savings}!
                  </span>
                )}
              </div>

              {!compact && plan.features.length > 0 && (
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={`${f.label}-${i}`} className={`flex items-start gap-2 text-sm ${f.included ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {f.included ? (
                        <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <XIcon className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                      )}
                      {f.label}
                    </li>
                  ))}
                </ul>
              )}

              {isCurrent ? (
                <div className="w-full py-2.5 rounded-lg text-center text-sm font-medium bg-muted text-muted-foreground">
                  Pelan Semasa
                </div>
              ) : comingSoon ? (
                <Button
                  variant="outline"
                  className="w-full rounded-lg gap-2"
                  onClick={() => window.open(`https://wa.me/60123456789?text=Saya+berminat+dengan+pelan+${plan.name}+WorkTrace`, '_blank')}
                >
                  <Clock className="h-4 w-4" />
                  Beritahu saya bila siap
                </Button>
              ) : plan.plan_key === 'free' ? (
                <Button
                  variant="outline"
                  className="w-full rounded-lg"
                  onClick={() => onSelect('free', 'monthly')}
                >
                  Cuba sekarang
                </Button>
              ) : (
                <Button
                  variant={plan.is_featured ? 'default' : 'outline'}
                  className="w-full rounded-lg"
                  disabled={isLoading}
                  onClick={() => {
                    if (currentPlan) {
                      initiatePayment(plan.plan_key as 'pro', yearly ? 'yearly' : 'monthly');
                    } else {
                      onSelect(plan.plan_key, yearly ? 'yearly' : 'monthly');
                    }
                  }}
                >
                  {isLoading ? 'Memproses...' : `Upgrade ke ${plan.name}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

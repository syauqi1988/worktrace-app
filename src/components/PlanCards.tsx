import { useState } from 'react';
import { Check, X as XIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBillPlz } from '@/hooks/useBillPlz';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    tagline: 'Cuba dulu, rasa dulu',
    note: 'Selamanya percuma',
    badge: 'Percuma',
    badgeColor: 'bg-muted text-muted-foreground',
    features: [
      { text: 'Sehingga 5 kerja aktif', included: true },
      { text: 'Sehingga 3 pelanggan', included: true },
      { text: 'Quotation & invois asas', included: true },
      { text: 'Eksport PDF (tanpa logo)', included: true },
      { text: 'WhatsApp share', included: false },
      { text: 'Logo di PDF', included: false },
      { text: 'Sistem referral', included: false },
    ],
    cta: 'Cuba sekarang',
    highlight: false,
    comingSoon: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 49,
    originalMonthly: 79,
    yearlyPrice: 470,
    originalYearly: 588,
    tagline: 'Untuk kontraktor yang serius',
    note: 'Early bird — terhad masa',
    badge: 'Paling popular',
    badgeColor: 'bg-primary text-primary-foreground',
    features: [
      { text: 'Kerja aktif tanpa had', included: true },
      { text: 'Pelanggan tanpa had', included: true },
      { text: 'Semua ciri Free', included: true },
      { text: 'WhatsApp share quotation', included: true },
      { text: 'Logo di PDF', included: true },
      { text: 'Kaedah pembayaran (bank + QR)', included: true },
      { text: 'Sistem referral (1 bulan percuma)', included: true },
      { text: 'Sokongan keutamaan', included: true },
    ],
    cta: 'Upgrade ke Pro',
    highlight: true,
    comingSoon: false,
  },
  {
    id: 'team',
    name: 'Team',
    monthlyPrice: 99,
    yearlyPrice: 950,
    originalYearly: 1188,
    tagline: 'Untuk pasukan kecil 2–10 orang',
    note: 'Sehingga 5 pengguna termasuk',
    badge: 'Akan datang',
    badgeColor: 'bg-amber-100 text-amber-700',
    features: [
      { text: 'Semua ciri Pro', included: true },
      { text: 'Akses berbilang pengguna (5 seat)', included: true },
      { text: 'Tugaskan kerja kepada pekerja', included: true },
      { text: 'Laporan prestasi pasukan', included: true },
      { text: 'Kawalan akses & kebenaran', included: true },
      { text: 'Tambah seat: RM15/pengguna', included: true },
    ],
    cta: 'Beritahu saya bila siap',
    highlight: false,
    comingSoon: true,
  },
];

interface PlanCardsProps {
  currentPlan?: string;
  onSelect: (planId: string, billingPeriod: string) => void;
  showToggle?: boolean;
  compact?: boolean;
}

export default function PlanCards({ currentPlan, onSelect, showToggle = true, compact = false }: PlanCardsProps) {
  const [yearly, setYearly] = useState(false);
  const { initiatePayment, isLoading } = useBillPlz();

  const getPrice = (plan: typeof PLANS[0]) => {
    if (plan.id === 'free') return 0;
    return yearly ? plan.yearlyPrice : plan.monthlyPrice;
  };

  const getOriginal = (plan: typeof PLANS[0]) => {
    if (plan.id === 'free') return 0;
    if (yearly) return (plan as any).originalYearly || 0;
    return (plan as any).originalMonthly || 0;
  };

  const getSavings = (plan: typeof PLANS[0]) => {
    const orig = getOriginal(plan);
    const price = getPrice(plan);
    return orig > price ? orig - price : 0;
  };

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
            <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold">-20%</span>
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id;
          const price = getPrice(plan);
          const original = getOriginal(plan);
          const savings = getSavings(plan);
          const period = plan.id === 'free' ? '' : yearly ? '/tahun' : '/bulan';

          return (
            <div
              key={plan.id}
              className={`rounded-xl ${compact ? 'p-4' : 'p-6'} flex flex-col transition-all bg-card ${
                plan.highlight
                  ? 'border-2 border-primary shadow-md'
                  : 'border border-border'
              }`}
            >
              <div className="mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                </div>
                <h3 className={`font-bold text-lg mt-2 ${plan.highlight ? 'text-primary' : 'text-foreground'}`}>
                  {plan.name}
                </h3>
                <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                <div className="mt-2">
                  {original > 0 && (
                    <span className="text-sm text-muted-foreground line-through mr-2">
                      RM{original}
                    </span>
                  )}
                  <span className={`text-3xl font-bold ${plan.highlight ? 'text-primary' : 'text-foreground'}`}>
                    RM{price}
                  </span>
                  <span className="text-sm text-muted-foreground">{period}</span>
                </div>
                {savings > 0 && yearly && (
                  <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    Jimat RM{savings}!
                  </span>
                )}
                <p className="text-xs text-muted-foreground mt-1">{plan.note}</p>
              </div>

              {!compact && (
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f.text} className={`flex items-start gap-2 text-sm ${f.included ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {f.included ? (
                        <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <XIcon className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>
              )}

              {isCurrent ? (
                <div className="w-full py-2.5 rounded-lg text-center text-sm font-medium bg-muted text-muted-foreground">
                  Pelan Semasa
                </div>
              ) : plan.comingSoon ? (
                <Button
                  variant="outline"
                  className="w-full rounded-lg gap-2"
                  onClick={() => window.open('https://wa.me/60123456789?text=Saya+berminat+dengan+pelan+Team+WorkTrace', '_blank')}
                >
                  <Clock className="h-4 w-4" />
                  {plan.cta}
                </Button>
              ) : plan.id === 'free' ? (
                <Button
                  variant="outline"
                  className="w-full rounded-lg"
                  onClick={() => onSelect('free', 'monthly')}
                >
                  {plan.cta}
                </Button>
              ) : (
                <Button
                  variant={plan.highlight ? 'default' : 'outline'}
                  className="w-full rounded-lg"
                  disabled={isLoading}
                  onClick={() => {
                    if (currentPlan) {
                      // Already logged in, go to BillPlz
                      initiatePayment(plan.id as 'pro', yearly ? 'yearly' : 'monthly');
                    } else {
                      // Onboarding flow
                      onSelect(plan.id, yearly ? 'yearly' : 'monthly');
                    }
                  }}
                >
                  {isLoading ? 'Memproses...' : plan.cta}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

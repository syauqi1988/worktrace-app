import { useState } from 'react';
import { Check, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: 19,
    features: [
      { text: 'Sehingga 50 kerja sebulan', included: true },
      { text: 'Quotation & invois asas', included: true },
      { text: 'Eksport PDF', included: true },
      { text: 'WhatsApp follow-up', included: true },
      { text: '1 pengguna', included: true },
      { text: 'Sokongan emel', included: true },
      { text: 'LHDN e-Invois', included: false },
      { text: 'Analitik & laporan', included: false },
    ],
    cta: 'Pilih Basic',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 49,
    features: [
      { text: 'Kerja tanpa had', included: true },
      { text: 'Semua ciri Basic', included: true },
      { text: 'LHDN e-Invois', included: true },
      { text: 'Analitik & laporan', included: true },
      { text: 'Sokongan keutamaan', included: true },
      { text: '1 pengguna', included: true },
    ],
    cta: 'Pilih Pro',
    highlight: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    monthlyPrice: 149,
    features: [
      { text: 'Semua ciri Pro', included: true },
      { text: 'Sehingga 10 pengguna', included: true },
      { text: 'White-label', included: true },
      { text: 'Pengurus akaun dedikasi', included: true },
      { text: 'Sokongan telefon', included: true },
    ],
    cta: 'Hubungi Kami',
    highlight: false,
  },
];

interface PlanCardsProps {
  currentPlan?: string;
  onSelect: (planId: string, billingPeriod: string) => void;
  showToggle?: boolean;
}

export default function PlanCards({ currentPlan, onSelect, showToggle = true }: PlanCardsProps) {
  const [yearly, setYearly] = useState(false);

  const getPrice = (monthly: number) => {
    if (yearly) return Math.round(monthly * 12 * 0.8);
    return monthly;
  };

  const getOriginalYearly = (monthly: number) => monthly * 12;
  const getSavings = (monthly: number) => (monthly * 12 * 0.2).toFixed(2);

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
          const price = getPrice(plan.monthlyPrice);
          const period = yearly ? '/tahun' : '/bulan';

          return (
            <div
              key={plan.id}
              className={`rounded-xl p-6 flex flex-col transition-all bg-card ${
                plan.highlight
                  ? 'border-2 border-primary shadow-md'
                  : 'border border-border'
              }`}
            >
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold text-lg ${plan.highlight ? 'text-primary' : 'text-foreground'}`}>
                    {plan.name}
                  </h3>
                  {plan.highlight && (
                    <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                      Paling Popular
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <span className={`text-3xl font-bold ${plan.highlight ? 'text-primary' : 'text-foreground'}`}>
                    RM{price}
                  </span>
                  <span className="text-sm text-muted-foreground">{period}</span>
                </div>
                {yearly && (
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground line-through">
                      RM{getOriginalYearly(plan.monthlyPrice)}/tahun
                    </span>
                    <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      Jimat RM{getSavings(plan.monthlyPrice)}!
                    </span>
                  </div>
                )}
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
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

              {isCurrent ? (
                <div className="w-full py-2.5 rounded-lg text-center text-sm font-medium bg-muted text-muted-foreground">
                  Pelan Semasa
                </div>
              ) : plan.id === 'agency' && currentPlan ? (
                <Button
                  variant="outline"
                  className="w-full rounded-lg"
                  onClick={() => window.open('https://wa.me/60123456789?text=Saya+nak+naik+taraf+ke+pelan+Agency+WorkTrace', '_blank')}
                >
                  Hubungi Kami
                </Button>
              ) : currentPlan ? (
                <Button
                  variant={plan.highlight ? 'default' : 'outline'}
                  className="w-full rounded-lg"
                  onClick={() => window.open(`https://wa.me/60123456789?text=Saya+nak+naik+taraf+ke+pelan+${plan.name}+WorkTrace`, '_blank')}
                >
                  Naik Taraf
                </Button>
              ) : (
                <Button
                  variant={plan.highlight ? 'default' : 'outline'}
                  className="w-full rounded-lg"
                  onClick={() => onSelect(plan.id, yearly ? 'yearly' : 'monthly')}
                >
                  {plan.cta}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

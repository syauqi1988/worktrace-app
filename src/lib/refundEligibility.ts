export type RefundEligibility =
  | 'full'              // within 14 days of first payment
  | 'prorated'          // yearly, day 15-30
  | 'special'           // double charge / unauthorized / outage (manual flag)
  | 'none_free'         // free plan, no payment
  | 'none_window';      // window closed

export interface EligibilityInput {
  plan?: string | null;
  billing_period?: string | null;
  subscription_start_date?: string | null;
}

export interface EligibilityResult {
  status: RefundEligibility;
  daysSincePayment: number;
  fullRefundUntil: Date | null;
  proratedRefundUntil: Date | null;
  isPaidPlan: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function getRefundEligibility(input: EligibilityInput, now: Date = new Date()): EligibilityResult {
  const isPaidPlan = !!input.plan && ['pro', 'team'].includes(input.plan);
  const start = input.subscription_start_date ? new Date(input.subscription_start_date) : null;
  const daysSincePayment = start ? Math.floor((now.getTime() - start.getTime()) / DAY_MS) : Infinity;
  const fullRefundUntil = start ? new Date(start.getTime() + 14 * DAY_MS) : null;
  const proratedRefundUntil = start ? new Date(start.getTime() + 30 * DAY_MS) : null;

  if (!isPaidPlan) {
    return { status: 'none_free', daysSincePayment, fullRefundUntil: null, proratedRefundUntil: null, isPaidPlan };
  }
  if (daysSincePayment <= 14) {
    return { status: 'full', daysSincePayment, fullRefundUntil, proratedRefundUntil, isPaidPlan };
  }
  if (input.billing_period === 'yearly' && daysSincePayment <= 30) {
    return { status: 'prorated', daysSincePayment, fullRefundUntil, proratedRefundUntil, isPaidPlan };
  }
  return { status: 'none_window', daysSincePayment, fullRefundUntil, proratedRefundUntil, isPaidPlan };
}

export function eligibilityToDbValue(s: RefundEligibility): 'full' | 'prorated' | 'special' | 'none' {
  if (s === 'full' || s === 'prorated' || s === 'special') return s;
  return 'none';
}

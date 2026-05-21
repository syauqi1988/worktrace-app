// HS Partnership PLT company info used on official subscription receipts.
export const HS_COMPANY = {
  name: 'HS PARTNERSHIP PLT',
  ssm: '202304000107',
  address: 'Lot 19234, Jalan Kelantan, Kampung Padang Air, 21060, Kuala Nerus, Terengganu, Malaysia',
  phone: '012-9600016',
  email: 'customerservice@worktrace.my',
  // Optional override via env var if a hosted logo URL is provided.
  logoUrl: Deno.env.get('HS_LOGO_URL') || '',
};

export function formatRM(amount: number): string {
  return 'RM ' + (Math.round(amount * 100) / 100).toFixed(2);
}

export function planLabel(plan: string, billing: string): string {
  const p = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Pro';
  const b = billing === 'yearly' ? 'Yearly' : 'Monthly';
  return `WorkTrace ${p} Subscription (${b})`;
}

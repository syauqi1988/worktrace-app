// Auto-generated payment terms block for quotation T&C.
// Used by QuotationFormPage to inject/replace deposit or milestone payment terms.

import type { MilestoneStage } from '@/components/invoice/MilestoneBuilder';

export const PAY_TERMS_START = '<!-- SYARAT_BAYARAN_AUTO_START -->';
export const PAY_TERMS_END = '<!-- SYARAT_BAYARAN_AUTO_END -->';

const fmt = (n: number) =>
  n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function buildDepositTermsBlock(total: number, depositPct: number): string {
  const pct = Math.max(0, Math.min(100, Number(depositPct) || 0));
  const depositAmt = (total * pct) / 100;
  const balancePct = 100 - pct;
  const balanceAmt = total - depositAmt;
  const lines = [
    'SYARAT BAYARAN:',
    `1. Deposit ${pct}% (RM ${fmt(depositAmt)}) perlu dijelaskan sebelum kerja bermula.`,
    `2. Baki ${balancePct}% (RM ${fmt(balanceAmt)}) perlu dijelaskan selepas kerja siap dan diserahkan.`,
    '3. Resit rasmi akan dikeluarkan selepas setiap bayaran diterima.',
  ];
  return wrap(lines.join('\n'));
}

export function buildMilestoneTermsBlock(total: number, stages: MilestoneStage[]): string {
  if (!stages.length) return '';
  const head = ['SYARAT BAYARAN BERPERINGKAT:'];
  const body = stages.map((s, i) => {
    const pct = Number(s.percentage) || 0;
    const amt = Number(s.amount) || (total * pct) / 100;
    return `${i + 1}. ${s.label} — ${pct}% (RM ${fmt(amt)})`;
  });
  const tail = [
    `Jumlah keseluruhan: RM ${fmt(total)}`,
    'Setiap bayaran perlu dijelaskan mengikut peringkat yang ditetapkan sebelum peringkat berikutnya bermula.',
  ];
  return wrap([...head, ...body, '', ...tail].join('\n'));
}

function wrap(content: string): string {
  return `${PAY_TERMS_START}\n${content}\n${PAY_TERMS_END}`;
}

/**
 * Inserts or replaces the auto block inside `existing` terms.
 * If markers exist, replaces. Otherwise appends to the end.
 */
export function upsertPaymentTermsBlock(existing: string, block: string): string {
  const base = existing || '';
  const startIdx = base.indexOf(PAY_TERMS_START);
  const endIdx = base.indexOf(PAY_TERMS_END);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = base.slice(0, startIdx).replace(/\s+$/, '');
    const after = base.slice(endIdx + PAY_TERMS_END.length).replace(/^\s+/, '');
    return [before, block, after].filter(Boolean).join('\n\n');
  }
  return [base.trim(), block].filter(Boolean).join('\n\n');
}

export function removePaymentTermsBlock(existing: string): string {
  const base = existing || '';
  const startIdx = base.indexOf(PAY_TERMS_START);
  const endIdx = base.indexOf(PAY_TERMS_END);
  if (startIdx === -1 || endIdx === -1) return base;
  const before = base.slice(0, startIdx).replace(/\s+$/, '');
  const after = base.slice(endIdx + PAY_TERMS_END.length).replace(/^\s+/, '');
  return [before, after].filter(Boolean).join('\n\n');
}

// Auto-generated payment terms block for quotation T&C.
// Used by QuotationFormPage to inject/replace deposit or milestone payment terms.

import type { MilestoneStage } from '@/components/invoice/MilestoneBuilder';

// Invisible zero-width markers so the user never sees them in the textarea / PDF
export const PAY_TERMS_START = '\u200B\u200C\u200D\u200B';
export const PAY_TERMS_END = '\u200B\u200D\u200C\u200B';
// Legacy markers (kept for back-compat removal of older saved blocks)
const LEGACY_START = '<!-- SYARAT_BAYARAN_AUTO_START -->';
const LEGACY_END = '<!-- SYARAT_BAYARAN_AUTO_END -->';

const fmt = (n: number) =>
  n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function buildDepositTermsBlock(total: number, depositPct: number): string {
  const pct = Math.max(0, Math.min(100, Number(depositPct) || 0));
  const depositAmt = (total * pct) / 100;
  const balancePct = 100 - pct;
  const balanceAmt = total - depositAmt;
  const lines = [
    'PAYMENT TERMS:',
    `1. Deposit ${pct}% (RM ${fmt(depositAmt)}) must be paid before work begins.`,
    `2. Balance ${balancePct}% (RM ${fmt(balanceAmt)}) must be paid after work is completed and handed over.`,
    '3. Official receipt will be issued after each payment is received.',
  ];
  return wrap(lines.join('\n'));
}

export function buildMilestoneTermsBlock(total: number, stages: MilestoneStage[]): string {
  if (!stages.length) return '';
  const head = ['MILESTONE PAYMENT TERMS:'];
  const body = stages.map((s, i) => {
    const pct = Number(s.percentage) || 0;
    const amt = Number(s.amount) || (total * pct) / 100;
    return `${i + 1}. ${s.label} — ${pct}% (RM ${fmt(amt)})`;
  });
  const tail = [
    `Total amount: RM ${fmt(total)}`,
    'Each payment must be settled according to the stage set before the next stage begins.',
  ];
  return wrap([...head, ...body, '', ...tail].join('\n'));
}

function wrap(content: string): string {
  return `${PAY_TERMS_START}\n${content}\n${PAY_TERMS_END}`;
}

/**
 * Inserts or replaces the auto block inside `existing` terms.
 * Also strips any legacy HTML-comment markers from older saves.
 */
export function upsertPaymentTermsBlock(existing: string, block: string): string {
  const base = stripLegacyMarkers(existing || '');
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
  let base = stripLegacyMarkers(existing || '');
  const startIdx = base.indexOf(PAY_TERMS_START);
  const endIdx = base.indexOf(PAY_TERMS_END);
  if (startIdx === -1 || endIdx === -1) return base;
  const before = base.slice(0, startIdx).replace(/\s+$/, '');
  const after = base.slice(endIdx + PAY_TERMS_END.length).replace(/^\s+/, '');
  return [before, after].filter(Boolean).join('\n\n');
}

export function hasPaymentTermsBlock(existing: string): boolean {
  const s = existing || '';
  return s.includes(PAY_TERMS_START) || s.includes(LEGACY_START);
}

function stripLegacyMarkers(s: string): string {
  // Convert any old HTML-comment markers to the new invisible ones so logic still works
  return s.split(LEGACY_START).join(PAY_TERMS_START).split(LEGACY_END).join(PAY_TERMS_END);
}

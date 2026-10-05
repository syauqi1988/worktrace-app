import i18n from '@/i18n';

/** Terms are stored per language: Malay in `<base>`, English in `<base>_en`. */
export type TermsBase = 'quotation_terms' | 'invoice_terms' | 'wo_terms';
const isEn = () => !!i18n.language?.startsWith('en');

export const termsField = (base: TermsBase) => (isEn() ? `${base}_en` : base);

/** Saved text for the current language (English falls back to Malay when not written yet). */
export function pickTerms(profile: any, base: TermsBase): string | null {
  if (!profile) return null;
  if (isEn()) return profile[`${base}_en`] || profile[base] || null;
  return profile[base] || null;
}

/** Exact saved text for the current language, no fallback (for editing in Settings). */
export const ownTerms = (profile: any, base: TermsBase): string | null | undefined =>
  profile?.[termsField(base)];

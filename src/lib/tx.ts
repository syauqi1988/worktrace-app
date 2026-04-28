/**
 * Runtime translation helper for inline UI strings.
 *
 * Approach: instead of extracting every literal into a JSON namespace
 * (which would require touching every file with custom keys), we keep
 * the original Bahasa Malaysia strings in the source code and look
 * them up in a Bahasa→English dictionary when the active language is
 * `en`. If a string isn't in the dictionary, the original Bahasa is
 * returned untouched, so nothing breaks.
 *
 * Use:
 *   import { tx } from '@/lib/tx';
 *   <h1>{tx('Tetapan')}</h1>
 *   toast.success(tx('Profil berjaya dikemaskini!'));
 *
 * For interpolation, do it after translation:
 *   tx('Akaun anda akan dipadam dalam {n} hari').replace('{n}', String(days))
 *
 * Use the `useTx` hook in components when you need re-renders on
 * language change:
 *   const tx = useTx();
 */

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { TX_DICT } from './txDict';

export function tx(s: string): string {
  if (!s) return s;
  if (i18n.language?.startsWith('en')) {
    const trimmed = s.trim();
    const en = TX_DICT[trimmed];
    if (en !== undefined) {
      // Preserve leading/trailing whitespace from original
      const lead = s.match(/^\s*/)?.[0] ?? '';
      const tail = s.match(/\s*$/)?.[0] ?? '';
      return lead + en + tail;
    }
  }
  return s;
}

/**
 * Hook variant — guarantees the component re-renders when the user
 * toggles language. Returns the same `tx` function.
 */
export function useTx() {
  // Subscribe to language changes so consumers re-render
  useTranslation();
  return tx;
}

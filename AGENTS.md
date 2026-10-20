# Agent Rules

- Bank accounts and transactions use a dedicated shared bank module; balances are calculated in integer sen, and transfers are one transaction with two same-owner account references. Why: edits/deletions cannot leave one-sided transfers or drift account balances; bank entries remain independent of sales and purchase payment records.

- Purchase forms reuse ProductPicker and QuickProductDialog with mandatory catalog saving for new products; purchase-specific field mapping lives in purchases/shared. Why: all purchase document types share the sales catalog without changing sales behavior.

- All user-facing text must be bilingual (Malay default, English switchable): use i18next keys in both `src/i18n/locales/ms.json` and `en.json`, or `useL()('English', 'Melayu')`, or dictionary helpers in `src/i18n/dual.ts` (`useTx()`/`MS_DICT` for English source text, `tm()`/`useTm()`/`EN_DICT` for Malay source text). Why: the app has a BM/EN toggle and single-language text breaks it.
- Shared list/form screens (`DataListPage`, `DataFormPage`, `Field`) and sidebar labels pass English strings through `useTx()`; add any new English label to `MS_DICT`. Why: one translation point for many pages.
- When adding or changing any user-facing feature, update `src/lib/aiHelpKnowledge.ts` (KB entry + FAQ question pair, BM and EN). Why: the on-device AI Help and the FAQ page read from it, so it must "learn" every change.

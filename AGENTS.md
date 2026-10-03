# Agent Rules

- All user-facing text must be bilingual (Malay default, English switchable): use i18next keys in both `src/i18n/locales/ms.json` and `en.json`, or `useL()('English', 'Melayu')` / `useTx()` + `MS_DICT` from `src/i18n/dual.ts`. Why: the app has a BM/EN toggle and single-language text breaks it.
- Shared list/form screens (`DataListPage`, `DataFormPage`, `Field`) and sidebar labels pass English strings through `useTx()`; add any new English label to `MS_DICT`. Why: one translation point for many pages.

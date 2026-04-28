# Dual-Language Support (BM / EN) with Header Toggle

Add an English translation alongside the existing Bahasa Malaysia UI, with a toggle button in the header to switch between them. Selection is persisted per device.

## What the user will see

- A new compact toggle in the top header (next to the support / notification / help buttons) showing **BM | EN**. Tapping it instantly switches all UI text.
- Language preference is saved in `localStorage` and restored on next visit.
- Default language: **Bahasa Malaysia** (current behavior preserved for existing users).
- All in-app screens translate: navigation, dashboard, jobs, customers, quotations, invoices, receipts, work orders, completion reports, reports, support, settings, login/onboarding, dialogs, toasts, empty states, expiry banner, tutorial modal.

## What stays in Bahasa only (out of scope, called out so there's no surprise)

- **Generated PDFs** (invoices, quotations, receipts, work orders, completion reports) — these are customer-facing documents printed for end customers; switching their language needs a separate decision (per-document? follow user pref? follow customer pref?). Left as Bahasa for now.
- **Database content** the user typed themselves (customer names, job descriptions, ticket bodies, etc.).
- **Email templates** sent from edge functions (support replies, deletion notices) — server-side, separate task.
- **Admin notification messages** stored in the `notifications` table (already written in Bahasa by triggers/edge functions).

If you want any of the above translated too, say so and I'll add a follow-up.

## Approach

Use **react-i18next** (the standard React i18n library, ~30KB, well-supported).

1. Install `i18next` + `react-i18next` + `i18next-browser-languagedetector`.
2. Create `src/i18n/index.ts` to initialize i18next with `ms` (default) and `en`, detecting from localStorage key `worktrace_lang`.
3. Create translation files:
   - `src/i18n/locales/ms.json` — extracted from current hardcoded Bahasa strings
   - `src/i18n/locales/en.json` — English equivalents
   Organized by namespace: `common`, `nav`, `auth`, `dashboard`, `jobs`, `customers`, `quotations`, `invoices`, `receipts`, `workOrders`, `reports`, `support`, `settings`, `tutorial`, `notifications`.
4. Import `./i18n` once in `src/main.tsx` so it boots before React.
5. Add `<LanguageToggle />` component to `AppShell.tsx` header (also on `LoginPage` and `OnboardingPage` since those render outside `AppShell`).
6. Replace hardcoded strings page-by-page using the `useTranslation()` hook: `t('jobs.title')` instead of `'Kerja'`.

## Header toggle design

Compact pill button matching the existing circular header buttons:

```text
[ BM | EN ]   ← active side highlighted with bg-primary text-primary-foreground
```

Single click toggles between the two languages. Uses the same height (h-8) and rounded styling as neighboring buttons.

## File-by-file scope

**New files**
- `src/i18n/index.ts` — i18next config
- `src/i18n/locales/ms.json` — Bahasa strings (extracted)
- `src/i18n/locales/en.json` — English strings
- `src/components/LanguageToggle.tsx` — header button

**Edited files (high-traffic, full translation)**
- `src/main.tsx` — import i18n
- `src/components/AppShell.tsx` — mount toggle, translate nav labels & quick actions
- `src/pages/LoginPage.tsx`, `OnboardingPage.tsx` — toggle + translate
- `src/pages/DashboardPage.tsx`
- `src/pages/JobsListPage.tsx`, `JobFormPage.tsx`, `JobDetailPage.tsx`
- `src/pages/CustomersListPage.tsx`, `CustomerFormPage.tsx`, `CustomerDetailPage.tsx`
- `src/pages/QuotationsListPage.tsx`, `QuotationFormPage.tsx`, `QuotationDetailPage.tsx`
- `src/pages/InvoicesListPage.tsx`, `InvoiceFormPage.tsx`, `InvoiceDetailPage.tsx`
- `src/pages/ReceiptsListPage.tsx`
- `src/pages/WorkOrdersListPage.tsx`, `WorkOrderFormPage.tsx`, `WorkOrderDetailPage.tsx`
- `src/pages/CompletionReportsListPage.tsx`, `CompletionReportPage.tsx`
- `src/pages/ReportsPage.tsx`
- `src/pages/SupportPage.tsx`, `SupportNewPage.tsx`, `SupportDetailPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/AccountDeletedPage.tsx`, `GoodbyePage.tsx`, `PaymentSuccessPage.tsx`, `PaymentFailedPage.tsx`, `NotFound.tsx`
- All `src/components/settings/*`, `NotificationBell`, `ExpiryBanner`, `InstallPromptBanner`, `AccountDeletionDialog`, `CancellationDialog`, `ReactivateDialog`, `UpgradeModal`, `PlanCards`, `BulkActionBar`, `EmptyState`
- `src/components/tutorial/tutorialSteps.ts`, `WelcomeModal.tsx`

**Not edited**
- PDF components in `src/components/pdf/*` (out of scope as noted)
- Public pages (`PublicApprovalPage`, `PublicPaymentProofPage`) — these are customer-facing; will translate UI chrome but keep document-context Bahasa
- Edge functions
- shadcn/ui primitives in `src/components/ui/*` (no user-facing copy there)

## Technical notes

- Translation key style: `namespace.key` (e.g. `nav.jobs`, `jobs.list.empty.title`, `common.save`).
- Use `Trans` component for strings with embedded React (links, bold).
- For pluralization (e.g. "1 day left" / "3 days left"), use i18next's built-in `count` interpolation.
- Date/number formatting: keep `toLocaleDateString('ms-MY' | 'en-MY', ...)` driven by current language. Currency stays MYR/RM.
- `last_support_visit` and similar DB fields: unchanged.
- No DB migration needed.
- Bundle impact: ~35KB gzipped for i18next + locale JSON.

## Out of scope (ask if you want these)

- Translating PDFs, emails, and server-generated notification messages
- Adding more languages (Mandarin, Tamil) — easy to add later, same structure
- Translating user-entered data
- RTL layout (not needed for EN/BM)

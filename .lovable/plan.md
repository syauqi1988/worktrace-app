# Align App with Refund Policy

The app already has cancellation (`CancellationDialog.tsx`) but doesn't reflect the new refund policy. Refunds themselves are processed manually via `customerservice@worktrace.my` (per policy), so the app's job is to **surface eligibility, guide the user, and capture the request** — not to auto-issue refunds.

## Goals

1. Show the user, in plain language, whether they qualify for a refund right now.
2. Add a "Request Refund" flow that pre-fills an email with all required info.
3. Log refund requests in Supabase so admin panel can track them.
4. Update cancellation copy so it matches policy (no more "no refund" blanket warning).
5. Add a public **Refund Policy** page accessible from Settings & Login footer.

## Eligibility Logic (computed client-side from `profile`)

Inputs: `subscription_start_date`, `billing_period`, `plan`, `subscription_status`.

```text
daysSincePayment = today - subscription_start_date
isPaidPlan       = plan in ('pro','team')

if !isPaidPlan                  -> "not_eligible_free"
elif daysSincePayment <= 14     -> "full_refund"        (14-day guarantee)
elif billing_period == 'yearly'
     and daysSincePayment <= 30 -> "prorated_refund"    (yearly only, day 15-30)
else                            -> "not_eligible_window_closed"
```

Special-case banners (informational only, not auto-detected):
- Double charge / unauthorized charge / 7-day outage → always full refund (manual review).

## UI Changes

### 1. New component `src/components/RefundRequestDialog.tsx`
Three-step dialog launched from Settings → Subscription:
- Step 1: Show eligibility result with policy summary (full / pro-rated / not eligible).
- Step 2: Reason dropdown (technical issue, double charge, unauthorized, no longer needed, other) + optional notes + transaction ref input.
- Step 3: Confirm → insert row into `refund_requests` table AND open `mailto:` to `customerservice@worktrace.my` with subject `Permohonan Bayaran Balik — [account]` and body pre-filled with account id, payment date, amount, reason, transaction ref. Show toast "Permohonan dihantar — kami balas dalam 1 hari bekerja."

### 2. Update `src/components/CancellationDialog.tsx`
- Step 2 lose-list stays.
- Replace blanket "no refund" wording in `paidPlanWarn` with policy-aware text:
  - If within 14 days → "Anda layak bayaran balik penuh. Klik 'Mohon Bayaran Balik'."
  - If yearly, 15-30 days → "Anda layak bayaran balik pro-rated."
  - Else → "Tempoh bayaran balik telah tamat. Akses kekal sehingga {date}."
- Add secondary "Mohon Bayaran Balik" button when eligible, opening RefundRequestDialog instead of pure cancel.

### 3. Update `src/pages/SettingsPage.tsx`
Subscription card: add small line under plan info:
- "Layak bayaran balik penuh sehingga {date+14d}" (green) if within 14 days.
- "Layak bayaran balik pro-rated sehingga {date+30d}" (amber) if yearly within 15–30 days.
- Add "Mohon Bayaran Balik" link beside "Batal Langganan" when eligible.

### 4. New page `src/pages/RefundPolicyPage.tsx`
Static page rendering the 8 sections from the user's policy text (MS + EN via i18n). Route `/refund-policy`. Linked from:
- Settings → Subscription footer ("Lihat dasar bayaran balik").
- Login page footer.
- Cancellation & Refund dialogs (small link).

### 5. i18n keys
Add namespace `refund.*` in `src/i18n/locales/ms.json` and `en.json` covering eligibility messages, dialog labels, and policy page sections.

## Database Changes (separate migration step, requires approval)

New table `refund_requests`:
- `user_id` (uuid, FK auth.users)
- `billplz_bill_id` (text, nullable)
- `payment_date` (date)
- `amount_myr` (numeric)
- `eligibility` (enum: full | prorated | special | none)
- `reason_category` (text)
- `notes` (text)
- `transaction_ref` (text)
- `status` (enum: pending | approved | rejected | processed, default pending)
- `admin_notes` (text)
- timestamps

RLS:
- User can `SELECT`/`INSERT` own rows.
- Admin (via existing `is_admin()` function used by announcements) can `SELECT`/`UPDATE` all.

The existing admin panel app (already integrated via shared Supabase) can immediately list/process refund requests using the same `is_admin()` pattern as announcements.

## Out of Scope

- Auto-issuing refunds via BillPlz API (policy keeps it manual via email).
- Pro-rated refund amount **calculation** server-side — we only flag eligibility; finance computes the exact refund.
- Editing existing BillPlz callback / payment flow.
- Dark mode pass.

## Files Touched

New:
- `src/components/RefundRequestDialog.tsx`
- `src/lib/refundEligibility.ts` (pure function + tests)
- `src/pages/RefundPolicyPage.tsx`
- Migration: `refund_requests` table + RLS

Edited:
- `src/components/CancellationDialog.tsx` (copy + eligible-action button)
- `src/pages/SettingsPage.tsx` (eligibility banner, refund link)
- `src/pages/LoginPage.tsx` (footer link)
- `src/App.tsx` (add `/refund-policy` route)
- `src/i18n/locales/ms.json`, `en.json` (refund namespace + policy text)

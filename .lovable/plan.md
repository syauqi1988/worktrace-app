

## Goal
Replace all hardcoded pricing/plan data in the frontend and edge functions with data from the `pricing_plans` Supabase table.

## Current state
- **Frontend hardcodes** in: `PlanCards.tsx` (PLANS array), `UpgradeModal.tsx` (RM49/RM79), `ReactivateDialog.tsx` (49 / 468), `SettingsPage.tsx` (line 755 inline RM string).
- **Edge function** `billplz-create-bill` has a hardcoded `prices` map (4900 / 47040 / 9900 / 95040 sen).
- **Edge function** `billplz-callback` has a hardcoded `PRICE_TO_PLAN` reverse-lookup map.
- **DB already has** `pricing_plans` with: `plan_key`, `name`, `tagline`, `monthly_price`, `yearly_price`, `yearly_discount_pct`, `currency`, `max_jobs`, `max_customers`, `features` (jsonb array of `{label, included}`), `is_active`, `is_featured`, `badge_text`, `badge_color`, `sort_order`. Current values: Free RM0, Pro RM29/mo & RM278.40/yr, Team RM99/mo & RM950.40/yr.

## Changes

### 1. New shared hook `src/hooks/usePricingPlans.ts`
- React Query hook that fetches from `pricing_plans` where `is_active = true`, ordered by `sort_order`.
- Returns typed `PricingPlan[]` plus loading state.
- Cached for 5 minutes (plans rarely change).

### 2. Refactor `src/components/PlanCards.tsx`
- Remove the hardcoded `PLANS` const.
- Use `usePricingPlans()` to render cards dynamically.
- Map DB fields → UI:
  - `plan_key` → id, `name` → name, `tagline`, `monthly_price`/`yearly_price` → price.
  - `features` jsonb (`[{label, included}]`) → feature list.
  - `badge_text` + `badge_color` → badge styling (map color name → tailwind classes).
  - `is_featured` → highlight border.
  - `plan_key === 'team'` treated as "coming soon" only if `badge_text` matches "Akan Datang" (or add a `coming_soon` flag — see step 6).
  - Strikethrough "original" price computed from `yearly_discount_pct` when on yearly toggle (no separate originalMonthly column needed; if discount = 20, original = price / 0.8).
- Loading skeleton while plans fetch.

### 3. Refactor `src/components/UpgradeModal.tsx`
- Fetch Pro plan via `usePricingPlans()`, pull monthly_price + features (filter `included: true`, take first ~5).
- Replace hardcoded RM49/RM79 with `monthly_price` and computed original (using `yearly_discount_pct` or simply the DB value).

### 4. Refactor `src/components/ReactivateDialog.tsx`
- Use `usePricingPlans()` to read Pro `monthly_price` and `yearly_price` instead of `49 / 468`.

### 5. Refactor `src/pages/SettingsPage.tsx` (line 755)
- Replace inline ternary with the matching plan's `monthly_price`/`yearly_price` from `usePricingPlans()` based on `profile.plan` and `profile.billing_period`.

### 6. Edge function `supabase/functions/billplz-create-bill/index.ts`
- Remove the hardcoded `prices` map.
- Use the service-role Supabase client (already created in file) to `select monthly_price, yearly_price, name from pricing_plans where plan_key = $plan and is_active = true`.
- Compute `amount` in sen: `Math.round((billing_period === 'yearly' ? yearly_price : monthly_price) * 100)`.
- Reject (400) if plan not found, inactive, or `plan_key = 'free'` (free shouldn't hit BillPlz).
- Use DB `name` in the description string.

### 7. Edge function `supabase/functions/billplz-callback/index.ts`
- Remove the hardcoded `PRICE_TO_PLAN` fallback map.
- `reference_2` (sent as `${plan}_${billing_period}`) is already the primary source — keep that path.
- Fallback if `reference_2` missing: query `pricing_plans` for a row whose `monthly_price * 100` or `yearly_price * 100` equals `bill.amount`.

### 8. Optional DB note
- No schema changes required. The existing `pricing_plans` rows already cover Free/Pro/Team. If you want a "coming soon" toggle without relying on `badge_text` string match, we can add a `coming_soon boolean` column later — not in scope unless you ask.

## Files touched
- New: `src/hooks/usePricingPlans.ts`
- Edit: `src/components/PlanCards.tsx`, `src/components/UpgradeModal.tsx`, `src/components/ReactivateDialog.tsx`, `src/pages/SettingsPage.tsx`
- Edit: `supabase/functions/billplz-create-bill/index.ts`, `supabase/functions/billplz-callback/index.ts`

## Behavior after change
- Editing a row in `pricing_plans` (price, features, badge, tagline, active flag) immediately updates the onboarding step, settings upgrade UI, upgrade modal, reactivate dialog, and the BillPlz amount charged — no code change needed.


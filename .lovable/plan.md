
## Context

Your admin panel lives in a **separate Lovable project** at `admin.worktrace.my`, which I do not have access to from this workspace. So the work splits in two:

1. **In this WorkTrace app (I can edit):** prepare the database — extend the feature catalog, seed missing rows, and add admin-only RPCs so the admin UI has a clean API.
2. **In your admin app (you paste the code I generate):** add a "Features" editor to the existing **Harga & Pelan** page.

## Audit of what already exists

- `pricing_plans` — pricing/tagline/limits/features JSON. Already used by `usePricingPlans`, `usePlanConfig`, `usePlanGate`. Has admin RLS (`is_admin()`).
- `plans` (slugs: `free`, `pro`) — used to link feature flags.
- `features` table — currently only 5 rows: `company_logo`, `limit_kerja`, `limit_pelanggan`, `whatsapp`, `workorder`.
- `plan_feature_flags` — per-plan unlock + limit_value, RLS allows admin upsert. Already wired.
- `is_admin()` / `is_admin_user()` SECURITY DEFINER functions exist.

The plumbing is mostly there. What's missing: a complete feature catalog covering everything you asked for, and a single admin-friendly RPC.

## Part 1 — Changes in THIS project (database)

### 1a. Seed the full feature catalog
Insert into `features` (idempotent on `slug`):

| slug | name | kind |
|---|---|---|
| whatsapp_share | WhatsApp Share | boolean |
| whatsapp_template_quotation | WA Template: Quotation | boolean |
| whatsapp_template_invoice | WA Template: Invoice | boolean |
| whatsapp_template_receipt | WA Template: Receipt | boolean |
| whatsapp_template_work_order | WA Template: Work Order | boolean |
| company_logo_pdf | Logo on PDF | boolean |
| custom_doc_numbering | Custom Doc Numbering | boolean |
| work_order_module | Work Order Module | boolean |
| completion_report | Completion Report | boolean |
| lhdn_einvoice | LHDN e-Invoice | boolean |
| push_notifications | Push Notifications | boolean |
| customer_approval_links | Customer Approval Links | boolean |
| payment_proof | Payment Proof Collection | boolean |
| support_priority | Priority Support | boolean |
| max_jobs_per_month | Max Jobs / Month | limit |
| max_customers_per_month | Max Customers / Month | limit |

Also ensure `plans` has a `team` row alongside `free` and `pro`.

### 1b. Seed default `plan_feature_flags`
For every (plan × feature) combo, insert a default row (free=locked except basic, pro=mostly unlocked, team=all unlocked) on conflict do nothing — preserves existing edits.

### 1c. New admin RPCs (SECURITY DEFINER, gated by `is_admin()`)

```sql
admin_list_plan_matrix()
  → returns rows of {plan_slug, plan_name, feature_slug, feature_name,
                     feature_kind, is_unlocked, limit_value}

admin_upsert_plan_feature(p_plan_slug text, p_feature_slug text,
                          p_is_unlocked bool, p_limit_value int)
  → upserts plan_feature_flags after checking is_admin()

admin_upsert_pricing_plan(p_plan_key, p_patch jsonb)
  → updates allowed columns of pricing_plans (price/tagline/badge/limits/features/...)
```

These give the admin UI a single clean surface and avoid relying on raw table RLS from a different domain.

### 1d. Keep `usePlanGate` / `usePlanConfig` working
Add a tiny `useFeatureFlag(slug)` hook in this project that reads `plan_feature_flags` for the current user's plan via the existing `plan flags read for my plan` RLS policy. So toggling "whatsapp_share = false" on Free actually disables the feature in the user app. (Optional follow-up — call this out but don't gate on it.)

## Part 2 — Code to paste into your admin project (admin.worktrace.my)

I'll output a single drop-in folder once you approve:

```
src/features/plan-editor/
  PlanEditorPage.tsx          ← mount on /admin/harga-pelan
  PricingPlanCard.tsx         ← edit name/tagline/prices/limits/badge
  FeatureMatrix.tsx           ← grid: rows=features, cols=plans
                                bool→Switch, limit→numeric input
  hooks/usePlanMatrix.ts      ← calls admin_list_plan_matrix
  hooks/useUpdatePlanFeature.ts ← calls admin_upsert_plan_feature
  hooks/useUpdatePricingPlan.ts ← calls admin_upsert_pricing_plan
```

UI behaviour:
- Two stacked sections on the Harga & Pelan page:
  1. **Pricing cards** (one per plan) with inline editable fields + Save.
  2. **Feature Matrix** table — features down the left, plans across the top, toggles/inputs in cells, autosaves on change with optimistic update + toast.
- Uses the same Supabase client (just point the admin app at the same project; it already is, since RLS uses the same `is_admin()`).

## Technical notes

- All mutations route through SECURITY DEFINER RPCs that re-check `is_admin()`, so even if RLS on `pricing_plans` / `plan_feature_flags` ever changes, the admin path stays correct and auditable.
- `features.slug` becomes the contract between the two apps — never rename, only add.
- No changes to existing pricing_plans rows' data; only schema-additive seeding.

## What I'll do once you approve

1. Run one migration in this project: features seed + plans seed + plan_feature_flags defaults + 3 admin RPCs.
2. Generate the admin folder above as a single message you paste into `admin.worktrace.my` (or you can grant me access to that project and I'll commit it directly).

**To let me commit straight into the admin app instead of pasting:** open it in Lovable and either share its project ID here, or invite this account so it shows up under cross-project tools.

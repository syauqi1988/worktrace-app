# WorkTrace — Job Type + Milestone Payments + Workflow Locks

This is a large, multi-system change. I'll split it into 4 phases so it can be reviewed/tested incrementally rather than as one massive untestable drop. **Recommend approving phase-by-phase**; if you'd rather I ship the whole thing in one go, say so.

## Phase 1 — Schema + foundations (no UI change yet)

**Migration** (single `supabase--migration` call):
- `jobs`: add `job_type text NOT NULL DEFAULT 'standard'`, `skip_log jsonb DEFAULT '[]'`, `milestone_config jsonb`
- `profiles`: add `default_job_type`, `default_milestone_template` (default `'30/40/30'`), `default_deposit_percentage` (default 30)
- `invoices`: add `milestone_stages jsonb`, `milestone_stage_number int`, `milestone_total_stages int`
- `payment_proofs`: add `milestone_stage int`, `milestone_label text`

**New code files:**
- `src/lib/jobTypes.ts` — `JOB_TYPES` constant (id, icon, color, name MS/EN, description, workflow steps)
- `src/lib/milestoneTemplates.ts` — the 6 templates (`30/40/30`, `50/50`, `20/30/30/20`, `25/25/25/25`, `30/70`, custom) with labels + triggers
- `src/lib/workflowRules.ts` — `WORKFLOW_MATRIX` + `checkWorkflowGate()` exactly as specified in Part C
- i18n keys added to `en.json` / `ms.json` under `jobType.*`, `milestone.*`, `workflow.*`

## Phase 2 — Job Type selector + dynamic workflow

- `src/pages/JobFormPage.tsx`: add 5-card job type selector below title, "set as default" toggle that updates profile, persist `job_type` on save. Deposit type also captures deposit % at creation.
- `src/pages/JobDetailPage.tsx`: replace static workflow bar with type-aware steps from `jobTypes.ts`, render completed/active/future states.
- `src/components/workflow/SkipStepModal.tsx`: warn-modal with 5 preset reasons + free-text "Other"; appends entry to `jobs.skip_log` and shows audit note on detail page.
- Wire `checkWorkflowGate()` into the "Create Quotation / WO / Invoice / Report" buttons on JobDetailPage. `hard` → toast error + blocked. `warn` → SkipStepModal. `open` → proceed.

## Phase 3 — Milestone Payment Builder

- `src/components/invoice/MilestoneBuilder.tsx` — full builder per spec: template pills, editable rows (label / % / amount / due date / trigger), auto-balance last row, amount↔% toggle, validation bar, add/remove rows.
- `src/pages/InvoiceFormPage.tsx`: add "Mod Pembayaran" toggle above line items. Pre-select Berperingkat for Deposit/Milestone job types (locked for Milestone). On save with milestones, create one invoice per stage (suffix in DB: `milestone_stage_number` / `milestone_total_stages`, shared `milestone_stages` plan), each with its own `payment_proofs` token + `milestone_stage` / `milestone_label`.
- Per-stage lock: stage 1 of Deposit requires Quote+WO accepted; final stage of Deposit/Milestone requires submitted completion report. Implemented in invoice generation handler.

## Phase 4 — PDF, payment page, tracker, WhatsApp, settings

- `src/components/pdf/InvoicePDF.tsx`: add stage banner at top + payment schedule summary table at bottom when `milestone_stages` present (other styles untouched).
- `src/pages/public/PublicPaymentProofPage.tsx`: when `milestone_stage` set, show stage context block + prefill amount.
- `src/pages/InvoiceDetailPage.tsx`: add MilestoneTracker card listing all sibling stages with status icons, paid/overdue/locked state, reminder + verify buttons, progress bar.
- `src/pages/JobDetailPage.tsx`: add Financial Summary card (quote value, VO, deductions, paid, balance, status).
- `src/lib/whatsappTemplates.ts`: add `milestonePaymentMessage()` producing the per-stage WA text.
- `src/pages/SettingsPage.tsx` (or accordion): new "Keutamaan Kerja" section with default job type, default template, default deposit %.

## Things explicitly NOT touched

Auth, BillPlz, referrals, announcements, support, tutorial, PDF base styles, routing structure, admin panel, customer approval flow, existing /bayar/:token logic (only additive).

## Technical notes

- One invoice row per milestone stage (simpler than a sub-table; matches the schema you specified).
- Skip-step reasons are stored as `{ step, reason, skipped_at }` entries, appended (never mutated).
- `checkWorkflowGate` is the single source of truth for lock decisions — used by both buttons and badges.
- Auto-balance: edits to non-last rows recompute last row's %; if sum of others > 100, last goes negative and validation bar turns red.

## Open question

Should I proceed phase-by-phase (recommended — I'll start with Phase 1 migration after you approve) or ship all 4 phases in one batch? Phase-by-phase keeps each step reviewable and reduces the chance of regressions in the existing invoice/PDF flow.
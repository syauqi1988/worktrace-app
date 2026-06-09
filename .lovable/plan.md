## Scope
Apply Fixes 1, 2, 3, 4 from the uploaded spec. Done in 4 phases so each is reviewable. **Recommend approving phase-by-phase.**

## Current state (already in DB)
- `profiles`: `quotation_terms`, `invoice_terms`, `wo_terms`, `payment_methods` (jsonb)
- `quotations`, `invoices`, `work_orders`: `terms` text
- `completion_reports`: `checklist` jsonb
- `invoices`: `selected_payment_methods` jsonb
- Missing: `deductions` on quotations/invoices/variation_orders; structured payment-details fields (bank, account, holder, note)

---

## Phase 1 — Schema migration (single call)
- `profiles`: add `payment_details jsonb` (bank_name, account_number, account_holder, payment_types[], note). Keep existing `payment_methods` untouched (legacy).
- `quotations`, `invoices`, `variation_orders`: add `deductions jsonb DEFAULT '[]'`.
- `quotations`: add `payment_details jsonb` snapshot column (so editing settings later doesn't change old quotes).

## Phase 2 — Fix 1: T&C consistency
- Audit Quotation/Invoice/WorkOrder/CompletionReport forms — ensure each:
  - Pre-fills from corresponding `profiles.*_terms` on new doc
  - Uses shadcn `<Textarea>` min 4 rows, auto-resize, BM label "Syarat & Terma" + tooltip
  - Persists per-document `terms` snapshot
- Settings: confirm the 3 terms textareas exist and labelled correctly. (Completion Report has no terms today — add `completion_terms` only if it has a T&C section; otherwise skip.)

## Phase 3 — Fix 2: Payment Details
- Settings: new "Maklumat Pembayaran" card writing to `profiles.payment_details` (bank, account, holder, multi-select payment types, note).
- QuotationForm: collapsible "Maklumat Pembayaran" section, default ON when settings configured, read-only preview, "Edit di Tetapan →" link, snapshots into `quotations.payment_details` on save.
- QuotationDetailPage: render payment-details card below totals.
- QuotationPDF: add payment-details block under totals.

## Phase 4 — Fix 3 + Fix 4 (combined batch)
**Fix 3 — AddItemModal (reusable)**
- New `src/components/AddItemModal.tsx` using shadcn Dialog (Sheet on mobile).
  - Tab 1 "Pilih Produk": reuse existing ProductPicker list + search.
  - Tab 2 "Produk Baru": full product fields + "Simpan ke Katalog" checkbox. If checked → insert into `products` then add line; if unchecked → add line only.
- Wire into Quotation/Invoice/WorkOrder/VO forms in place of current ProductPicker trigger.

**Fix 4 — DeductionItemsSection (reusable)**
- New `src/components/DeductionItemsSection.tsx` (rows: name, RM|% toggle, value, delete; "+ Tambah Potongan" button).
- Integrate into Quotation/Invoice/VO forms. Update totals math: subtotal → minus deductions → SST → grand total. Persist to `deductions` column.
- Render deductions in respective Detail pages + PDFs.

---

## Out of scope (this request)
- Fix 5 (full DocumentDetailLayout refactor) and Fix 6 (interactive checklist component) — defer until 1–4 land.

## Technical notes
- Payment details are **snapshotted** onto the quotation at create/update time so historical docs stay frozen.
- Deductions stored as `[{id, name, type:'fixed'|'percentage', value}]`.
- Tax (SST) applied on (subtotal − deductions) for consistency; will document in code comment.
- All new UI strings in BM; all modals use Sheet on `<640px`, Dialog on desktop.

## Confirm
OK to proceed phase-by-phase starting with Phase 1 migration? Or want all four phases in one batch?
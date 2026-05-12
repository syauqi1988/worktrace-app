# Product Library + VO / Deduction Workflow

This is a large two-feature build. I'll split it into 4 phases so you can review/test as we go. Each phase is independently shippable.

## Phase 1 — Product Library (foundation)

**Database**
- New `products` table: `code`, `name`, `description`, `category`, `unit_price`, `uom`, `is_active`, RLS (own rows only), updated_at trigger.

**UI**
- New route `/products` + sidebar entry "Produk" (Package icon, between Pelanggan and Sebut Harga).
- Products page: 4 stat cards (total / active / categories / latest), search + category filter + status pills, responsive card grid (3/2/1 cols).
- Create/Edit modal: code, category combo, name, long description, price, UOM combo (predefined groups + custom typing), active toggle.
- Soft delete (sets `is_active=false`) with confirm dialog.

## Phase 2 — Product Picker + line item enhancements

**Quotation & Invoice line items (additive, non-breaking)**
- Extend item JSON shape with `description_detail` and `uom` (existing rows without keys still render as before).
- Add "🔍 Cari dari Katalog Produk..." trigger above each line's description input → popover with grouped-by-category, searchable list (name/code/description, max 20).
- Selecting a product pre-fills description, description_detail, unit_price, uom (qty=1). All fields stay editable. Small "Dari katalog: X" badge below description.
- Add UOM input next to Qty in line item rows.

**PDF updates** (`InvoicePDF.tsx`, `QuotationPDF.tsx`)
- Render `description_detail` in italic 9px gray under item name, line-by-line with `•` bullets.
- Quantity column shows `"{qty} {uom}"` when uom present.
- No layout change when fields empty.

## Phase 3 — VO / Deduction database + form

**Database**
- New `variation_orders` table: `job_id`, `vo_number`, `type` (addition/deduction), `items` jsonb, `subtotal`, `discount`, `discount_type`, `sst`, `sst_rate`, `total`, `reason`, `status`, `customer_approval_token`, `pdf_url`, `notes`. RLS own rows.
- Storage bucket `vo-pdfs` (private) with owner-folder policy.
- Add `vo` doc type to `DEFAULT_DOC_SETTINGS` (prefix VO, padding 4) and to the doc-number Settings tabs.

**UI**
- Job Detail page: new "Variasi & Potongan" section, visible only after Completion Report submitted. Shows `[+ Tambah VO]` and `[+ Tambah Potongan]` buttons + compact list of existing VOs with status pill and edit/send actions.
- New route `/jobs/:jobId/vo/new` and `/jobs/:jobId/vo/:voId/edit`: type badge, header (auto VO number, reason textarea), line item builder reusing the catalogue picker from Phase 2, totals (negative red for deductions), notes, Save Draft / Generate PDF & Send.

## Phase 4 — VO PDF, approval flow, invoice integration

**VO PDF** (mirrors Work Order PDF style)
- Header (logo, "VARIASI ORDER" / "BORANG POTONGAN", VO number, date).
- Job ref box (customer, job number, original quotation number).
- Reason box, line items table, totals.
- Impact summary: Original / VO+ / Deduction- / Final.
- Two signature boxes.
- Upload to `vo-pdfs` bucket.

**Approval flow**
- Reuse existing `customer_approvals` system with `document_type='variation_order'`.
- WhatsApp templates for VO addition + deduction with PDF + approval link.
- On accept/reject, `variation_orders.status` updates via existing `respond_to_approval` flow (extend the SQL function to handle `variation_order`).

**Invoice integration**
- Invoice form detects accepted VOs/deductions for the job → shows "⚡ Variasi & Potongan Diterima" box with `[Import ke Invois]`.
- Import inserts grouped line items with section header rows: `--- Kerja Asal ---`, `--- Variasi Order (VO-XXXX) ---`, `--- Potongan (DED-XXXX) ---`.
- Job Detail financial summary shows Original + VO + Deduction = Final.

## Notes / decisions I'll apply

- Soft delete for products (per the brief — safer for historical docs).
- Description detail rendered in PDF prefixing `•` only when the line doesn't already start with `-` or `•`.
- Single VO number sequence; deductions can use a different prefix later if you want — for v1 both use the `vo` doc-number setting.
- All theming uses existing semantic tokens; no new colors added to `index.css`.
- No changes to auth, BillPlz, referrals, tutorial, admin app, or existing PDF styles beyond additive changes listed above.

## Recommended order to ship

1. **Phase 1** — migration + Products page (you can start cataloguing immediately).
2. **Phase 2** — picker + PDF additive changes.
3. **Phase 3** — VO migration + form (drafts work end-to-end).
4. **Phase 4** — VO PDF, approval, invoice import.

**Approve this plan and I'll start with Phase 1 (DB migration + Products page).** If you'd rather I bundle phases differently or skip something (e.g. you don't need the catalogue picker badge), tell me before I start.

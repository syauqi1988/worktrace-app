## Goal

Redesign the Completion Report so it looks like the WorkTrace mockup — clean, professional, mobile-first — across the **PDF**, the **public approval page** (what the customer sees), and the **submitted view in-app**. Form (edit mode), data flow, WhatsApp share, approval workflow, status banners, and edit/delete buttons stay exactly as today.

Add a few high-value optional fields so the report feels more detailed without bloating the form.

## New optional fields (added to `completion_reports`)

| Field | Type | Purpose |
|---|---|---|
| `location_label` | text | e.g. "Level 3 / Grid C5", site/area where the work was done |
| `project_ref` | text | Project / contract reference (e.g. "MRC-2024-078") |
| `checklist` | jsonb (array of `{ title, done, note? }`) | Free-form completion checklist, one item per line in the form, parsed into objects |
| `engineer_notes` | text | Renamed display of existing `notes` as "Engineer's notes / Site remarks" — no schema change, just relabel |
| `photo_captions` | jsonb (`{ before: string[], after: string[] }`) | Optional caption per photo, indexed to existing photo arrays |

All optional. Existing reports continue to render fine (fall back to "—" / hidden sections).

Migration adds the three new columns (`location_label`, `project_ref`, `checklist`, `photo_captions`) with safe defaults. No data backfill needed.

## Visual design (applied consistently to PDF + public page + in-app submitted view)

Inspired by the mockup:

- **Header bar**: company logo + name on the left, doc title "Laporan Siap Kerja" + report number on the right, status pill (Draf / Menunggu / Disahkan / Ditolak) with colored dot.
- **Meta strip**: 4 cells in one row (Tarikh Siap, Kategori/Trade, Lokasi, Disediakan oleh) — collapses to 2 cols on mobile.
- **Section headings**: small uppercase mono-style label + thin divider line + count chip (e.g. "4 gambar", "5 item").
- **Photo cards**: rounded card with image (4:3), small "Sebelum"/"Selepas" tag overlay, caption text + timestamp (using upload time / `created_at`) and location chip if `location_label` set.
- **Checklist items**: white card rows with green check (done) or amber dot (pending), title + note, right-aligned signer + time (uses technician name + `submitted_at`).
- **Remarks / Engineer's notes**: bordered card.
- **Sign-off row**: 2-card grid for now — "Disediakan oleh" (technician + completion_date) and "Disahkan oleh Pelanggan" (customer name from `customer_signature` + `accepted_at`, or "Menunggu pengesahan"). Mobile: stacks to 1 column.
- **Footer**: report id + "Dijana oleh WorkTrace" + generation date.
- **Palette**: WorkTrace orange `#E85C26`, dark `#1A1A1A`, surface `#F8F8F6`, line `#E5E5E5`, green `#2D7D46`, amber `#A0620D`, blue `#1B5FA8`. Mono accents (DM Mono available via Google Fonts on web; PDF uses Helvetica with letter-spacing).

### Mobile-first

- All grids use `grid-cols-1` → `sm:grid-cols-2` → `md:grid-cols-4`.
- Photo grid: `grid-cols-2` on mobile (matches mockup).
- Header actions wrap below the title on small screens.
- Sticky bottom bar already exists for form; submitted view actions stay inline and wrap.

## Files changed

1. **`supabase/migrations/<new>.sql`** — add columns:
   - `location_label text`, `project_ref text`, `checklist jsonb default '[]'`, `photo_captions jsonb default '{"before":[],"after":[]}'`.

2. **`src/pages/CompletionReportPage.tsx`**
   - Form: add optional inputs for Lokasi, Rujukan Projek, Checklist (textarea, one item per line; lines starting with `[ ]` = pending, `[x]` = done, plain text = done by default), and per-photo caption inputs under each thumbnail.
   - Save / load these new fields.
   - Replace the current submitted/read-only view with a new `<SubmittedReportView />` component styled per mockup. Edit / Padam / Pratonton PDF / Kongsi WhatsApp buttons unchanged in behavior.
   - Status banners (waiting / accepted / rejected) stay above as today.

3. **`src/components/pdf/CompletionReportPDF.tsx`** — full redesign of the layout per mockup:
   - New header bar, meta strip, section headings with divider, photo cards w/ tag + caption, checklist rows, remarks card, 2-column sign-off, footer with report id.
   - Accept new props: `location_label`, `project_ref`, `checklist`, `photo_captions`.
   - Keep page size A4, footer "Jana oleh WorkTrace" + page numbers.

4. **`src/pages/public/PublicApprovalPage.tsx`** — for `document_type === 'completion_report'`, render the new mockup-styled report inline (reusing a shared `<CompletionReportView />` component) above the existing Terima / Tolak action card. Other doc types (quotation, work order) untouched.

5. **`src/components/reports/CompletionReportView.tsx`** *(new)* — shared React component used by both `CompletionReportPage` (submitted view) and `PublicApprovalPage`, so the in-app and customer view stay identical and mobile-first. Pure presentational, takes the report + job + customer + company as props.

## Out of scope (unchanged)

- WhatsApp share message and flow.
- Approval link generation, accept/reject logic, status transitions.
- Auto-update of job status on submit.
- Edit / Delete buttons and confirm dialog.
- Other PDFs (Quotation, Invoice, Work Order, Receipt).
- Quotation / Work Order / Invoice pages.

## Acceptance

- New report (with no optional fields filled) renders cleanly — sections without data are hidden.
- Existing reports load and render without errors after migration.
- PDF, in-app submitted view, and public approval page all share the same look.
- Submitted view and public page look good at 360px wide (mobile-first).
- Hantar Laporan still opens WhatsApp to the customer's number with the existing pre-set message.

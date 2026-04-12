
Goal: fix the quotation/invoice PDF preview only, without touching unrelated modules.

Likely root cause
- `PDFPreviewModal.tsx` uses `react-pdf@10.4.1`, but the repo also installs a separate `pdfjs-dist@5.6.205`.
- The lockfile shows `react-pdf` itself is tied to `pdfjs-dist@5.4.296`, so the preview worker can be running a different version than the viewer expects.
- The detail pages already create a blob URL, but the modal ignores it and loads a wrapped `Uint8Array` instead, which adds another failure point.
- Because `<Document>` has no custom `error` / `onSourceError`, React-PDF falls back to its generic “Failed to load PDF file.” message.

Plan
1. Keep the fix scoped to:
   - `src/components/pdf/PDFPreviewModal.tsx`
   - `src/pages/QuotationDetailPage.tsx`
   - `src/pages/InvoiceDetailPage.tsx`
   - `package.json` / lockfile only for PDF.js version alignment
2. Simplify the preview source:
   - generate the PDF blob in the detail pages as now
   - keep one object URL in state
   - pass that blob URL into `PDFPreviewModal`
   - reuse the same URL for modal download
   - revoke the URL on close/unmount
3. Align the viewer and worker:
   - remove the version mismatch by pinning/removing the extra `pdfjs-dist` dependency so it matches React-PDF
   - set `pdfjs.GlobalWorkerOptions.workerSrc` using the same version React-PDF expects
4. Harden the modal:
   - load `<Document>` from the blob URL directly
   - add controlled `error`, `onSourceError`, and `onLoadError` handling
   - preserve the existing fullscreen modal, loading spinner, ESC close, outside-click close, and page rendering
5. Validate only the affected flow:
   - quotation preview opens and renders pages
   - invoice preview opens and renders pages
   - logo still appears
   - modal download still works
   - ESC and outside click still close the preview
   - no changes to jobs, customers, auth flow, or navigation

Technical details
- The strongest signal is the dual `pdfjs-dist` versions already present in the lockfile.
- I do not plan to change `QuotationPDF` or `InvoicePDF` unless the generated blob itself proves invalid, which is unlikely if download still works.
- I will avoid adding cMaps/wasm setup unless the aligned worker surfaces a specific missing-asset error.
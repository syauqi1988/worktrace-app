UPDATE public.profiles
SET logo_url = regexp_replace(
  logo_url,
  '/storage/v1/object/public/(quotation-pdfs|invoice-pdfs|work-order-pdfs|completion-report-pdfs)/',
  '/storage/v1/object/public/logos/'
)
WHERE logo_url ~ '/storage/v1/object/public/(quotation-pdfs|invoice-pdfs|work-order-pdfs|completion-report-pdfs)/[^/]+/logo\.';
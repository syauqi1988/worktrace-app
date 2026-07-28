import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, XCircle, Share2 } from 'lucide-react';
import CompletionReportView from '@/components/reports/CompletionReportView';

interface ApprovalRow {
  id: string;
  document_id: string;
  document_type: 'quotation' | 'work_order' | 'completion_report' | 'variation_order';
  token: string;
  pdf_url: string | null;
  customer_name: string | null;
  action: string | null;
  reason: string | null;
  expires_at: string | null;
  responded_at: string | null;
  user_id: string;
}

/**
 * Public shared-document view.
 *
 * Approval as a blocking action has been removed. This page is now view/share
 * only — the customer can open the PDF, download it, or share it further.
 * Legacy `action` values (accepted/rejected) on old rows are ignored for
 * gating purposes but the page still renders cleanly for historical data.
 */
export default function PublicApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ApprovalRow | null>(null);
  const [doc, setDoc] = useState<any>(null);
  const [company, setCompany] = useState<{ company_name: string | null; logo_url: string | null } | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: approvalRows } = await supabase.rpc('get_approval_by_token', { p_token: token });
      const data = Array.isArray(approvalRows) ? approvalRows[0] : approvalRows;

      if (!data) {
        setLoading(false);
        return;
      }
      const r = data as ApprovalRow;
      setRow(r);

      // Best-effort view timestamp for audit trail — no user action required.
      try { await supabase.rpc('mark_approval_viewed', { p_token: token }); } catch { /* ignore */ }

      const { data: summary } = await supabase.rpc('get_public_document_summary', { p_token: token });
      const s: any = summary;
      if (s?.company) setCompany(s.company);
      if (s?.data) {
        if (r.document_type === 'completion_report') {
          const merged = { ...(s.data.doc || {}), jobs: { ...(s.data.job || {}), customers: s.data.customer || null } };
          setDoc(merged);
        } else {
          setDoc(s.data.doc);
        }
      }
      setLoading(false);
    })();
  }, [token]);

  const handleShare = async () => {
    if (!row?.pdf_url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: docLabel, url: row.pdf_url });
        return;
      } catch { /* user cancelled */ }
    }
    try { await navigator.clipboard.writeText(row.pdf_url); } catch { /* ignore */ }
  };

  if (loading) {
    return <div className="min-h-screen p-6 max-w-xl mx-auto space-y-3">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>;
  }

  if (!row) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-1">{t('publicApproval.invalidLinkTitle')}</h1>
          <p className="text-muted-foreground text-sm">{t('publicApproval.invalidLinkBody')}</p>
        </div>
      </div>
    );
  }

  const docLabel =
    row.document_type === 'quotation' ? t('publicApproval.docQuotation')
    : row.document_type === 'work_order' ? t('publicApproval.docWorkOrder')
    : row.document_type === 'variation_order' ? 'Variation Order / Potongan'
    : t('publicApproval.docCompletion');
  const numberCol =
    row.document_type === 'quotation' ? 'quote_number'
    : row.document_type === 'work_order' ? 'wo_number'
    : row.document_type === 'variation_order' ? 'vo_number'
    : 'report_number';

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="logo" className="h-12 w-12 rounded object-contain" />
          ) : (
            <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">{t('publicApproval.from')}</p>
            <p className="font-semibold text-foreground">{company?.company_name || t('publicApproval.company')}</p>
          </div>
        </div>

        {row.document_type === 'completion_report' && doc ? (
          <CompletionReportView
            report={{
              report_number: doc.report_number,
              completion_date: doc.completion_date,
              technician_name: doc.technician_name,
              work_description: doc.work_description,
              materials_used: doc.materials_used,
              customer_signature: doc.customer_signature,
              notes: doc.notes,
              status: doc.status,
              accepted_at: doc.accepted_at,
              submitted_at: doc.submitted_at,
              before_photos: Array.isArray(doc.before_photos) ? doc.before_photos : [],
              after_photos: Array.isArray(doc.after_photos) && doc.after_photos.length
                ? doc.after_photos
                : (Array.isArray(doc.photos) ? doc.photos : []),
              location_label: doc.location_label,
              project_ref: doc.project_ref,
              checklist: Array.isArray(doc.checklist) ? doc.checklist : [],
              photo_captions: doc.photo_captions || { before: [], after: [] },
            }}
            job={doc.jobs ? { job_number: doc.jobs.job_number, title: doc.jobs.title, category: doc.jobs.category } : null}
            customer={doc.jobs?.customers ? { name: doc.jobs.customers.name, phone: doc.jobs.customers.phone, address: doc.jobs.customers.address } : null}
            company={{ company_name: company?.company_name || null, logo_url: company?.logo_url || null }}
          />
        ) : (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{docLabel}</p>
              <p className="text-lg font-bold text-foreground">{doc?.[numberCol] || '-'}</p>
            </div>
            {doc?.total != null && (
              <div>
                <p className="text-xs text-muted-foreground">{t('publicApproval.amount')}</p>
                <p className="text-2xl font-bold text-primary">RM {Number(doc.total || 0).toFixed(2)}</p>
              </div>
            )}
          </div>
        )}

        {/* View / Download / Share — no accept/reject action */}
        {row.pdf_url && (
          <div className="grid grid-cols-1 gap-2">
            <Button asChild className="w-full rounded-lg gap-2 h-11">
              <a href={row.pdf_url} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4" /> {t('publicApproval.viewPdf')}
              </a>
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="w-full rounded-lg gap-2">
                <a href={row.pdf_url} target="_blank" rel="noopener noreferrer" download>
                  <Download className="h-4 w-4" /> {t('publicApproval.downloadPdf')}
                </a>
              </Button>
              <Button variant="outline" className="w-full rounded-lg gap-2" onClick={handleShare}>
                <Share2 className="h-4 w-4" /> Share
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">{t('publicApproval.poweredBy')}</p>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getDateLocale } from '@/i18n';
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

export default function PublicApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ApprovalRow | null>(null);
  const [doc, setDoc] = useState<any>(null);
  const [company, setCompany] = useState<{ company_name: string | null; logo_url: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');

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

      if (!r.action) {
        await supabase.rpc('mark_approval_viewed', { p_token: token });
      }

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

  const respond = async (action: 'accepted' | 'rejected') => {
    if (!row) return;
    if (action === 'rejected' && !reason.trim()) {
      toast.error(t('publicApproval.needReason'));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc('respond_to_approval', {
      p_token: row.token,
      p_action: action,
      p_reason: action === 'rejected' ? reason.trim() : null,
    });

    if (error) {
      toast.error(t('publicApproval.submitFailed'));
      setSubmitting(false);
      return;
    }

    const respondedAt = new Date().toISOString();
    setRow({ ...row, action, responded_at: respondedAt, reason });
    setSubmitting(false);
    toast.success(action === 'accepted' ? t('publicApproval.thanksAccepted') : t('publicApproval.responseSent'));

    // Stamp the shared PDF with action + timestamp so the same link shows it.
    try {
      const { data: stamped } = await supabase.functions.invoke('stamp-approval-pdf', {
        body: { token: row.token },
      });
      if (stamped?.pdf_url) {
        setRow((prev) => (prev ? { ...prev, pdf_url: stamped.pdf_url } : prev));
      }
    } catch (e) {
      console.warn('stamp-approval-pdf failed', e);
    }
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

  const expired = row.expires_at && new Date(row.expires_at) < new Date();
  const docLabel =
    row.document_type === 'quotation' ? t('publicApproval.docQuotation')
    : row.document_type === 'work_order' ? t('publicApproval.docWorkOrder')
    : row.document_type === 'variation_order' ? 'Variation Order / Deduction'
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
          <>
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
            {row.pdf_url && (
              <Button asChild variant="outline" className="w-full rounded-lg gap-2">
                <a href={row.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" /> {t('publicApproval.downloadPdf')}
                </a>
              </Button>
            )}
          </>
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
            {row.pdf_url && (
              <Button asChild variant="outline" className="w-full rounded-lg gap-2">
                <a href={row.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" /> {t('publicApproval.viewPdf')}
                </a>
              </Button>
            )}
          </div>
        )}

        {row.action ? (
          <div className={`border rounded-xl p-4 text-center ${row.action === 'accepted' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {row.action === 'accepted' ? <CheckCircle2 className="h-10 w-10 mx-auto mb-2" /> : <XCircle className="h-10 w-10 mx-auto mb-2" />}
            <p className="font-bold">
              {row.action === 'accepted' ? t('publicApproval.approved') : t('publicApproval.rejected')}
            </p>
            {row.reason && <p className="text-sm mt-2">{t('publicApproval.reasonLabel')} {row.reason}</p>}
            {row.responded_at && (
              <p className="text-xs mt-2 opacity-75">{new Date(row.responded_at).toLocaleString(getDateLocale())}</p>
            )}
          </div>
        ) : expired ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center text-amber-800">
            <p className="font-medium">{t('publicApproval.linkExpired')}</p>
          </div>
        ) : rejectMode ? (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">{t('publicApproval.rejectPrompt')}</p>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={t('publicApproval.rejectPlaceholder')} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRejectMode(false)} disabled={submitting}>{t('publicApproval.cancel')}</Button>
              <Button variant="destructive" className="flex-1" onClick={() => respond('rejected')} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('publicApproval.submit')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => respond('accepted')} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white rounded-lg gap-2 h-12">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} {t('publicApproval.accept')}
            </Button>
            <Button onClick={() => setRejectMode(true)} variant="outline" disabled={submitting} className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg gap-2 h-12">
              <XCircle className="h-5 w-5" /> {t('publicApproval.reject')}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">{t('publicApproval.poweredBy')}</p>
      </div>
    </div>
  );
}

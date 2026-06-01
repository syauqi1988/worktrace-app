import { useState, useEffect } from 'react';
import { openWhatsApp, buildWhatsAppUrl } from '@/lib/whatsapp';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import PDFPreviewModal from '@/components/pdf/PDFPreviewModal';
import CompletionReportPDF from '@/components/pdf/CompletionReportPDF';
import { pdf } from '@react-pdf/renderer';
import { embedPdfCompanyLogo, imageUrlToBase64 } from '@/utils/imageToBase64';
import { usePlanGate } from '@/hooks/usePlanGate';
import { getOrCreateApprovalToken, buildPublicApprovalUrl, uploadApprovalPdf } from '@/lib/approvals';
import { getOrCreateShortLink } from '@/lib/shortLinks';
import { renderTemplate } from '@/lib/whatsappTemplates';
import {
  ArrowLeft, Edit, Trash2, User, Phone, Mail, MapPin,
  CalendarDays, FileText, Receipt, MessageCircle, ClipboardCheck, CheckCircle, Eye, Loader2, AlertTriangle
} from 'lucide-react';
import { WorkflowBar } from '@/components/workflow/WorkflowBar';
import { getJobType, type JobType, type WorkflowStepKey } from '@/lib/jobTypes';
import { format as fmtDate } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  Lead: 'bg-gray-100 text-gray-600',
  Scheduled: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const CATEGORY_COLORS: Record<string, string> = {
  Renovation: 'bg-blue-100 text-blue-700',
  Aircond: 'bg-cyan-100 text-cyan-700',
  Electrical: 'bg-amber-100 text-amber-700',
  Plumbing: 'bg-indigo-100 text-indigo-700',
  Maintenance: 'bg-green-100 text-green-700',
  Welding: 'bg-orange-100 text-orange-700',
  Other: 'bg-gray-100 text-gray-600',
};

const STATUSES = ['Lead', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'];

interface Job {
  id: string;
  job_number: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  scheduled_date: string | null;
  completed_date: string | null;
  amount: number | null;
  notes: string | null;
  created_at: string;
  customer_id: string | null;
  customers: { id: string; name: string; phone: string | null; email: string | null; address: string | null } | null;
  job_type?: string | null;
  skip_log?: Array<{ step: string; reason: string; skipped_at: string }> | null;
}

interface Quotation {
  id: string;
  quote_number: string;
  total: number;
  status: string;
  valid_until: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
  due_date: string | null;
}

interface CompletionReport {
  id: string;
  report_number: string;
  status: string | null;
  completion_date: string | null;
  work_description: string | null;
  technician_name: string | null;
  materials_used: string | null;
  customer_signature: string | null;
  notes: string | null;
  photos: any;
  accepted_at?: string | null;
}

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '60' + cleaned.slice(1);
  if (!cleaned.startsWith('60')) cleaned = '60' + cleaned;
  return cleaned;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function JobDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [report, setReport] = useState<CompletionReport | null>(null);
  const [workOrder, setWorkOrder] = useState<{ id: string; wo_number: string; status: string; total: number } | null>(null);
  const [vos, setVos] = useState<Array<{ id: string; vo_number: string; type: string; status: string; total: number; reason: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [logoBase64, setLogoBase64] = useState('');
  const { checkWhatsAppShare } = usePlanGate();

  useEffect(() => {
    if (!user || !id) return;
    async function fetch() {
      const [jobRes, quoRes, invRes, reportRes, woRes] = await Promise.all([
        supabase.from('jobs')
          .select('*, customers(id, name, phone, email, address)')
          .eq('id', id)
          .single(),
        supabase.from('quotations')
          .select('id, quote_number, total, status, valid_until')
          .eq('job_id', id)
          .eq('user_id', user!.id)
          .maybeSingle(),
        supabase.from('invoices')
          .select('id, invoice_number, total, status, due_date')
          .eq('job_id', id)
          .eq('user_id', user!.id)
          .maybeSingle(),
        supabase.from('completion_reports')
          .select('id, report_number, status, completion_date, work_description, technician_name, materials_used, customer_signature, notes, photos, accepted_at')
          .eq('job_id', id)
          .eq('user_id', user!.id)
          .maybeSingle(),
        supabase.from('work_orders')
          .select('id, wo_number, status, total')
          .eq('job_id', id)
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setJob(jobRes.data as unknown as Job);
      setQuotation(quoRes.data as Quotation | null);
      setInvoice(invRes.data as Invoice | null);
      setReport(reportRes.data as CompletionReport | null);
      setWorkOrder(woRes.data as any);
      const { data: voData } = await (supabase as any).from('variation_orders')
        .select('id, vo_number, type, status, total, reason')
        .eq('job_id', id).eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      setVos((voData as any) || []);
      setLoading(false);
    }
    fetch();
    if (!id || !user) return;
    const ch = supabase.channel(`job-detail-${id}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'jobs', filter: `id=eq.${id}` }, () => fetch())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'quotations', filter: `job_id=eq.${id}` }, () => fetch())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'invoices', filter: `job_id=eq.${id}` }, () => fetch())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'completion_reports', filter: `job_id=eq.${id}` }, () => fetch())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'work_orders', filter: `job_id=eq.${id}` }, () => fetch())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'variation_orders', filter: `job_id=eq.${id}` }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, id]);

  useEffect(() => {
    if (profile?.logo_url) {
      imageUrlToBase64(profile.logo_url).then(setLogoBase64);
    } else {
      setLogoBase64('');
    }
  }, [profile?.logo_url]);

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;
    const updates: { status: string; completed_date?: string } = { status: newStatus };
    if (newStatus === 'Completed') updates.completed_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('jobs').update(updates).eq('id', job.id);
    if (error) {
      toast({ title: t('jobDetail.error'), description: error.message, variant: 'destructive' });
    } else {
      setJob({ ...job, status: newStatus, completed_date: updates.completed_date as string || job.completed_date });
      toast({ title: t('jobDetail.statusUpdated') });
    }
  };

  const handleDelete = async () => {
    if (!job) return;
    setDeleting(true);
    const { error } = await supabase.from('jobs').delete().eq('id', job.id);
    setDeleting(false);
    if (error) {
      toast({ title: t('jobDetail.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('jobDetail.deleted') });
      navigate('/jobs');
    }
  };

  const handleReportPreview = async () => {
    if (!report || !job) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const photoBase64s: string[] = [];
      const photos = Array.isArray(report.photos) ? report.photos : [];
      for (const url of photos) {
        try { const b64 = await imageUrlToBase64(url as string); photoBase64s.push(b64); } catch { photoBase64s.push(''); }
      }
      const blob = await pdf(
        <CompletionReportPDF
          report={{ ...report, completion_date: report.completion_date || '', photos: photoBase64s.filter(Boolean), materials_used: report.materials_used || '', customer_signature: report.customer_signature || '', notes: report.notes || '' }}
          job={{ job_number: job.job_number, title: job.title, category: job.category }}
          customer={job.customers ? { name: job.customers.name, phone: job.customers.phone, address: job.customers.address } : null}
          company={{
            company_name: profile?.company_name || null,
            phone: profile?.phone || null,
            address: profile?.address || null,
            logo_url: profile?.logo_url || null,
            logo_base64: logoBase64,
            ssm_number_new: profile?.ssm_number_new || null,
            ssm_number_old: profile?.ssm_number_old || null,
          }}
        />
      ).toBlob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleReportWhatsApp = async () => {
    if (!checkWhatsAppShare()) return;
    if (!report || !job || !user || !job.customers?.phone) return;
    setIsSharing(true);
    try {
      const photoBase64s: string[] = [];
      const photos = Array.isArray(report.photos) ? report.photos : [];
      for (const url of photos) {
        try { const b64 = await imageUrlToBase64(url as string); photoBase64s.push(b64); } catch { photoBase64s.push(''); }
      }
      const pdfData = await embedPdfCompanyLogo({
        report: { ...report, completion_date: report.completion_date || '', photos: photoBase64s.filter(Boolean), materials_used: report.materials_used || '', customer_signature: report.customer_signature || '', notes: report.notes || '' },
        job: { job_number: job.job_number, title: job.title, category: job.category },
        customer: job.customers ? { name: job.customers.name, phone: job.customers.phone, address: job.customers.address } : null,
        company: {
          company_name: profile?.company_name || null,
          phone: profile?.phone || null,
          address: profile?.address || null,
          logo_url: profile?.logo_url || null,
          logo_base64: logoBase64,
          ssm_number_new: profile?.ssm_number_new || null,
          ssm_number_old: profile?.ssm_number_old || null,
        },
      });
      const blob = await pdf(<CompletionReportPDF {...pdfData} />).toBlob();
      const pdfUrl = await uploadApprovalPdf({
        bucket: 'completion-report-pdfs',
        userId: user.id,
        documentId: report.id,
        documentNumber: report.report_number,
        blob,
      });
      const token = await getOrCreateApprovalToken({
        userId: user.id,
        documentId: report.id,
        documentType: 'completion_report',
        customerName: job.customers.name,
        customerEmail: job.customers.email || null,
        pdfUrl,
        expiresInDays: 30,
      });
      const approvalUrl = buildPublicApprovalUrl(token);
      const shortUrl = await getOrCreateShortLink({ userId: user.id, targetUrl: approvalUrl, kind: 'approval' });
      const phone = formatPhone(job.customers.phone);
      const companyName = profile?.company_name || '';
      const details = t('jobDetail.waReportDetails', {
        number: report.report_number,
        title: job.title,
        date: report.completion_date ? formatDate(report.completion_date) : '-',
        url: shortUrl,
      });
      const message = renderTemplate(
        (profile as any)?.whatsapp_templates,
        'completion_report',
        { customer_name: job.customers.name, company_name: companyName },
        details,
      );
      openWhatsApp(phone, message);
    } catch {
      toast({ title: t('jobDetail.reportShareFail'), variant: 'destructive' });
    } finally {
      setIsSharing(false);
    }
  };

  const whatsappUrl = job?.customers?.phone
    ? buildWhatsAppUrl(formatPhone(job.customers.phone), renderTemplate((profile as any)?.whatsapp_templates, 'job_followup', { customer_name: job.customers.name, company_name: profile?.company_name || '', job_number: job.job_number }, ''))
    : null;

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p className="text-muted-foreground">{t('jobDetail.notFound')}</p>
        <Button variant="outline" onClick={() => navigate('/jobs')} className="mt-4">{t('jobDetail.back')}</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 pb-28 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{job.job_number}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status]}`}>{job.status}</span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{job.title}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/jobs/${job.id}/edit`)} className="gap-1.5 shrink-0">
          <Edit className="h-3.5 w-3.5" /> {t('jobDetail.edit')}
        </Button>
      </div>

      {/* Customer Card */}
      {job.customers && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('jobDetail.customer')}</p>
          <p className="text-base font-semibold text-foreground">{job.customers.name}</p>
          {job.customers.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-foreground">{job.customers.phone}</span>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full hover:bg-green-100">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
            </div>
          )}
          {job.customers.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-foreground">{job.customers.email}</span>
            </div>
          )}
          {job.customers.address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-foreground">{job.customers.address}</span>
            </div>
          )}
        </div>
      )}

      {/* Job Info Card */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('jobDetail.jobInfo')}</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{t('jobDetail.category')}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-0.5 ${CATEGORY_COLORS[job.category] || CATEGORY_COLORS.Other}`}>{job.category}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('jobDetail.status')}</p>
            <Select value={job.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-7 w-fit mt-0.5 text-xs rounded-full border-0 px-2 py-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {job.scheduled_date && (
            <div>
              <p className="text-xs text-muted-foreground">{t('jobDetail.scheduledDate')}</p>
              <p className="text-sm text-foreground mt-0.5">{formatDate(job.scheduled_date)}</p>
            </div>
          )}
          {job.completed_date && (
            <div>
              <p className="text-xs text-muted-foreground">{t('jobDetail.completedDate')}</p>
              <p className="text-sm text-foreground mt-0.5">{formatDate(job.completed_date)}</p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">{t('jobDetail.created')}</p>
            <p className="text-sm text-foreground mt-0.5">{formatDate(job.created_at)}</p>
          </div>
        </div>
        {job.description && (
          <div>
            <p className="text-xs text-muted-foreground">{t('jobDetail.description')}</p>
            <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{job.description}</p>
          </div>
        )}
        {job.notes && (
          <div>
            <p className="text-xs text-muted-foreground">{t('jobDetail.notes')}</p>
            <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}
      </div>

      {/* Related Quotation */}
      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> {t('jobDetail.quotation')}
        </p>
        {quotation ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-primary">{quotation.quote_number}</span>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                quotation.status === 'Accepted' ? 'bg-[#DCFCE7] text-[#15803D]' :
                quotation.status === 'Sent' ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                quotation.status === 'Rejected' ? 'bg-[#FEE2E2] text-[#B91C1C]' :
                'bg-[#F1F5F9] text-[#64748B]'
              }`}>{quotation.status}</span>
            </div>
            <p className="text-sm font-semibold text-foreground">RM {Number(quotation.total).toFixed(2)}</p>
            {quotation.valid_until && (
              <p className="text-xs text-muted-foreground">{t('jobDetail.validUntil', { date: formatDate(quotation.valid_until) })}</p>
            )}
            <Button variant="outline" size="sm" className="text-xs gap-1 mt-1"
              onClick={() => navigate(`/quotations/${quotation.id}`)}>
              {t('jobDetail.viewQuote')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t('jobDetail.noQuote')}</p>
            <Button variant="outline" size="sm" className="text-xs gap-1"
              onClick={() => navigate(`/quotations/new?job_id=${job.id}`)}>
              <FileText className="h-3.5 w-3.5" /> {t('jobDetail.createQuote')}
            </Button>
          </div>
        )}
      </div>

      {/* Work Order Card — Team plan only */}
      {profile?.plan === 'team' && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" /> {t('jobDetail.workOrder')}
          </p>
          {workOrder ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-primary">{workOrder.wo_number}</span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  workOrder.status === 'Accepted' ? 'bg-[#DCFCE7] text-[#15803D]' :
                  workOrder.status === 'Sent' ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                  workOrder.status === 'Rejected' ? 'bg-[#FEE2E2] text-[#B91C1C]' :
                  'bg-[#F1F5F9] text-[#64748B]'
                }`}>{workOrder.status}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">RM {Number(workOrder.total).toFixed(2)}</p>
              <Button variant="outline" size="sm" className="text-xs gap-1 mt-1"
                onClick={() => navigate(`/jobs/${job.id}/work-order`)}>
                {t('jobDetail.viewWo')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {quotation?.status === 'Accepted'
                  ? t('jobDetail.woReady')
                  : t('jobDetail.woNeedsAccept')}
              </p>
              <Button variant="outline" size="sm" className="text-xs gap-1"
                disabled={quotation?.status !== 'Accepted'}
                onClick={() => navigate(`/jobs/${job.id}/work-order/new`)}>
                <ClipboardCheck className="h-3.5 w-3.5" /> {t('jobDetail.createWo')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Completion Report Card */}
      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <ClipboardCheck className="h-3.5 w-3.5" /> {t('jobDetail.completionReport')}
        </p>
        {report ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-primary">{report.report_number}</span>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                report.status === 'accepted' ? 'bg-[#DCFCE7] text-[#15803D]' :
                report.status === 'submitted' ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                report.status === 'rejected' ? 'bg-[#FEE2E2] text-[#B91C1C]' :
                'bg-[#F1F5F9] text-[#64748B]'
              }`}>
                {report.status === 'accepted' ? t('jobDetail.statusAccepted') :
                 report.status === 'submitted' ? t('jobDetail.statusSubmitted') :
                 report.status === 'rejected' ? t('jobDetail.statusRejected') : t('jobDetail.statusDraft')}
              </span>
            </div>
            {report.status === 'submitted' && (
              <div className="flex items-center gap-1.5 text-[#1D4ED8]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-xs font-medium">{t('jobDetail.waitingCustomer')}</span>
              </div>
            )}
            {report.status === 'accepted' && (
              <div className="flex items-center gap-1.5 text-[#15803D]">
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{t('jobDetail.confirmedByCustomer')}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-1">
              {report.status === 'draft' ? (
                <Button variant="outline" size="sm" className="text-xs gap-1"
                  onClick={() => navigate(`/jobs/${job.id}/completion-report`)}>
                  <Edit className="h-3.5 w-3.5" /> {t('jobDetail.editReport')}
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="text-xs gap-1"
                  onClick={() => navigate(`/jobs/${job.id}/completion-report`)}>
                  {t('jobDetail.viewReport')}
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handleReportPreview}>
                <Eye className="h-3.5 w-3.5" /> {t('jobDetail.previewPdf')}
              </Button>
              {(report.status === 'submitted' || report.status === 'accepted' || report.status === 'rejected') && job.customers?.phone && (
                <Button size="sm" className="text-xs gap-1 text-white" style={{ backgroundColor: '#25D366' }} onClick={handleReportWhatsApp} disabled={isSharing}>
                  {isSharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                  {t('jobDetail.shareWa')}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {quotation?.status === 'Accepted' ? t('jobDetail.reportReady') : t('jobDetail.reportNeedsAccept')}
            </p>
            <Button variant="outline" size="sm" className="text-xs gap-1"
              disabled={quotation?.status !== 'Accepted'}
              onClick={() => navigate(`/jobs/${job.id}/completion-report`)}>
              <ClipboardCheck className="h-3.5 w-3.5" /> {t('jobDetail.fillReport')}
            </Button>
          </div>
        )}
      </div>

      {/* Variation Orders / Deductions */}
      {report?.status === 'accepted' && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Variasi & Potongan
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Tambah Variation Order atau Potongan sebelum menjana invois akhir.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <Button variant="outline" size="sm" className="text-xs gap-1"
              onClick={() => navigate(`/jobs/${job.id}/vo/new?type=addition`)}>
              <FileText className="h-3.5 w-3.5" /> + Tambah VO
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1 text-red-700 border-red-200 hover:bg-red-50"
              onClick={() => navigate(`/jobs/${job.id}/vo/new?type=deduction`)}>
              <FileText className="h-3.5 w-3.5" /> + Tambah Potongan
            </Button>
          </div>
          {vos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Tiada variasi.</p>
          ) : (
            <div className="space-y-2">
              {vos.map(v => {
                const isDed = v.type === 'deduction';
                return (
                  <div key={v.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">{v.vo_number}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          isDed ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>{isDed ? 'Potongan' : 'VO'}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          v.status === 'Accepted' ? 'bg-green-100 text-green-700' :
                          v.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                          v.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>{v.status}</span>
                      </div>
                      <p className={`text-sm font-semibold ${isDed ? 'text-red-700' : 'text-foreground'}`}>
                        {isDed ? '-' : '+'}RM {Number(v.total).toFixed(2)}
                      </p>
                      {v.reason && <p className="text-xs text-muted-foreground truncate">{v.reason}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="text-xs"
                        onClick={() => navigate(`/jobs/${job.id}/vo/${v.id}/edit`)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs text-red-600 hover:text-red-700"
                        onClick={async () => {
                          if (!confirm(`Padam ${v.vo_number}?`)) return;
                          const { error } = await (supabase as any).from('variation_orders').delete().eq('id', v.id);
                          if (error) {
                            toast({ title: 'Ralat', description: error.message, variant: 'destructive' });
                          } else {
                            await (supabase as any).from('customer_approvals').delete().eq('document_id', v.id).eq('document_type', 'variation_order');
                            setVos(prev => prev.filter(x => x.id !== v.id));
                            toast({ title: 'VO dipadam' });
                          }
                        }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Financial Summary */}
      {report?.status === 'accepted' && quotation && (() => {
        const quoteTotal = Number(quotation.total) || 0;
        const additions = vos.filter(v => v.type === 'addition' && v.status === 'Accepted').reduce((s, v) => s + (Number(v.total) || 0), 0);
        const deductions = vos.filter(v => v.type === 'deduction' && v.status === 'Accepted').reduce((s, v) => s + (Number(v.total) || 0), 0);
        const finalTotal = quoteTotal + additions - deductions;
        return (
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Ringkasan Kewangan</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Sebut Harga Asal</span><span>RM {quoteTotal.toFixed(2)}</span></div>
              {additions > 0 && <div className="flex justify-between"><span className="text-blue-700">+ Variasi</span><span className="text-blue-700">+RM {additions.toFixed(2)}</span></div>}
              {deductions > 0 && <div className="flex justify-between"><span className="text-red-700">− Potongan</span><span className="text-red-700">−RM {deductions.toFixed(2)}</span></div>}
              <div className="flex justify-between border-t border-border pt-2 mt-2 font-bold"><span>Jumlah Akhir</span><span className="text-primary">RM {finalTotal.toFixed(2)}</span></div>
            </div>
          </div>
        );
      })()}

      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Receipt className="h-3.5 w-3.5" /> {t('jobDetail.invoice')}
        </p>
        {invoice ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-primary">{invoice.invoice_number}</span>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                invoice.status === 'Paid' ? 'bg-[#DCFCE7] text-[#15803D]' :
                invoice.status === 'Sent' ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                'bg-[#F1F5F9] text-[#64748B]'
              }`}>{invoice.status}</span>
            </div>
            <p className="text-sm font-semibold text-foreground">RM {Number(invoice.total).toFixed(2)}</p>
            {invoice.due_date && (
              <p className="text-xs text-muted-foreground">{t('jobDetail.payBefore', { date: formatDate(invoice.due_date) })}</p>
            )}
            <Button variant="outline" size="sm" className="text-xs gap-1 mt-1"
              onClick={() => navigate(`/invoices/${invoice.id}`)}>
              {t('jobDetail.viewInvoice')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {report?.status === 'accepted' ? t('jobDetail.noInvoice') : t('jobDetail.invoiceNeedsReport')}
            </p>
            {report?.status === 'accepted' ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs gap-1"
                  onClick={() => navigate(`/invoices/new?job_id=${job.id}`)}>
                  <Receipt className="h-3.5 w-3.5" /> {t('jobDetail.createInvoice')}
                </Button>
                <Button variant="outline" size="sm" className="text-xs gap-1"
                  onClick={() => navigate(`/jobs/${job.id}/vo/new`)}>
                  <FileText className="h-3.5 w-3.5" /> {t('jobDetail.createVo')}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="text-xs gap-1"
                disabled
                onClick={() => navigate(`/invoices/new?job_id=${job.id}`)}>
                <Receipt className="h-3.5 w-3.5" /> {t('jobDetail.createInvoice')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={() => navigate(`/jobs/${job.id}/edit`)} className="flex-1 rounded-lg gap-2">
          <Edit className="h-4 w-4" /> {t('jobDetail.editJob')}
        </Button>
        <Button variant="outline" onClick={() => setDeleteOpen(true)} className="rounded-lg gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" /> {t('jobDetail.delete')}
        </Button>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('jobDetail.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('jobDetail.deleteDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>{t('jobDetail.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t('jobDetail.deleting') : t('jobDetail.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview */}
      <PDFPreviewModal
        fileUrl={previewUrl}
        loading={previewLoading}
        onClose={() => { setPreviewOpen(false); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
        onDownload={async () => {
          if (previewUrl) {
            const a = document.createElement('a');
            a.href = previewUrl;
            a.download = `Laporan-${report?.report_number || 'RPT'}.pdf`;
            a.click();
          }
        }}
        open={previewOpen}
        title={t('jobDetail.previewTitle', { name: report?.report_number || 'Laporan' })}
      />
    </div>
  );
}

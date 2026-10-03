import React, { useState, useEffect } from 'react';
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
import DataFormPage from '@/components/form/DataFormPage';
import { useL } from '@/i18n/dual';
import { ChevronDown, ArrowLeftRight, Ban, Copy, Share2, Plus } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WorkflowBar } from '@/components/workflow/WorkflowBar';
import { JobMilestoneTracker } from '@/components/JobMilestoneTracker';
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
  milestone_stage_number?: number | null;
  milestone_total_stages?: number | null;
  milestone_stages?: any;
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [report, setReport] = useState<CompletionReport | null>(null);
  const [workOrder, setWorkOrder] = useState<{ id: string; wo_number: string; status: string; total: number } | null>(null);
  const [vos, setVos] = useState<Array<{ id: string; vo_number: string; type: string; status: string; total: number; reason: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const l = useL();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [logoBase64, setLogoBase64] = useState('');
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [reports, setReports] = useState<CompletionReport[]>([]);
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
          .order('created_at', { ascending: false }),
        supabase.from('invoices')
          .select('id, invoice_number, total, status, due_date, milestone_stage_number, milestone_total_stages, milestone_stages, created_at')
          .eq('job_id', id)
          .eq('user_id', user!.id)
          .order('milestone_stage_number', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true }),
        supabase.from('completion_reports')
          .select('id, report_number, status, completion_date, work_description, technician_name, materials_used, customer_signature, notes, photos, accepted_at')
          .eq('job_id', id)
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false }),
        supabase.from('work_orders')
          .select('id, wo_number, status, total')
          .eq('job_id', id)
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false }),
      ]);
      setJob(jobRes.data as unknown as Job);
      const qList = ((quoRes.data as any[]) || []) as Quotation[];
      setQuotations(qList);
      setQuotation(qList[0] ?? null);
      const invList = ((invRes.data as any[]) || []) as Invoice[];
      setInvoices(invList);
      setInvoice(invList[0] ?? null);
      const rList = ((reportRes.data as any[]) || []) as CompletionReport[];
      setReports(rList);
      setReport(rList[0] ?? null);
      const wList = ((woRes.data as any[]) || []);
      setWorkOrders(wList);
      setWorkOrder(wList[0] ?? null);
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

  const duplicateJob = () => navigate(`/jobs/new?duplicate=${job!.id}`);


  const headerActions = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <ChevronDown className="h-4 w-4" /> {l('Actions', 'Tindakan')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2"><ArrowLeftRight className="h-4 w-4" /> {l('Transfer to...', 'Pindah ke...')}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-popover z-50">
              <DropdownMenuItem onClick={() => navigate(`/quotations/new?job_id=${job.id}`)}>{l('Transfer to Quotation', 'Pindah ke Sebut Harga')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}/work-order/new`)}>{l('Transfer to Work Order', 'Pindah ke Work Order')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}/completion-report`)}>{l('Transfer to Completion Report', 'Pindah ke Laporan Siap')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/invoices/new?job_id=${job.id}`)}>{l('Transfer to Invoice', 'Pindah ke Invois')}</DropdownMenuItem>
              {job.job_type !== 'milestone' && (
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem className="gap-2" onClick={() => navigate(`/jobs/${job.id}/edit`)}><Edit className="h-4 w-4" /> {t('jobDetail.editJob')}</DropdownMenuItem>
          <DropdownMenuSeparator />
          {job.status !== 'Cancelled' && (
            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => handleStatusChange('Cancelled')}>
              <Ban className="h-4 w-4" /> {l('Cancel Job', 'Batal Kerja')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> {t('jobDetail.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={duplicateJob} disabled={duplicating}>
        {duplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} {l('Duplicate', 'Salin')}
      </Button>
      <Button size="sm" className="gap-1.5 shrink-0" disabled={!whatsappUrl}
        onClick={() => whatsappUrl && window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}>
        <Share2 className="h-4 w-4" /> {l('QuickShare', 'Kongsi Pantas')}
      </Button>
    </>
  );

  return (
    <>
    <DataFormPage
      breadcrumb={l('Home / Jobs', 'Utama / Kerja')}
      title={job.job_number}
      titleBadge={<span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[job.status]}`}>{job.status}</span>}
      headerActions={headerActions}
      onBack={() => navigate(-1)}
      onSave={() => navigate(`/jobs/${job.id}/edit`)}
      saveLabel={t('jobDetail.editJob')}
      sections={[
        { id: 'workflow', title: l('Workflow', 'Aliran Kerja'), description: job.title, content: (
      <div className="bg-card rounded-xl border border-border p-3">
        <WorkflowBar
          jobType={'standard'}
          completed={new Set<WorkflowStepKey>([
            ...(quotation ? ['quotation' as WorkflowStepKey] : []),
            ...(report ? ['completion_report' as WorkflowStepKey] : []),
            ...(invoice ? ['invoice' as WorkflowStepKey, 'invoice_deposit' as WorkflowStepKey, 'invoice_final' as WorkflowStepKey] : []),
          ])}
        />
        {Array.isArray(job.skip_log) && job.skip_log.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border space-y-1">
            {job.skip_log.map((e, i) => (
              <p key={i} className="text-[11px] text-amber-700 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {e.step} dilangkau — {e.reason} ({fmtDate(new Date(e.skipped_at), 'dd MMM yyyy, HH:mm')})
              </p>
            ))}
          </div>
        )}
      </div>
        ) },
        ...(job.customers ? [{ id: 'customer', title: t('jobDetail.customer'), content: (
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
                  <Share2 className="h-3.5 w-3.5" /> WhatsApp
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
        ) }] : []),
        { id: 'info', title: t('jobDetail.jobInfo'), content: (
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
        ) },
        { id: 'documents', title: l('Documents', 'Dokumen'), content: (<div className="space-y-4">
      <DocGroup
        icon={<FileText className="h-3.5 w-3.5" />}
        title={t('jobDetail.quotation')}
        emptyText={t('jobDetail.noQuote')}
        createLabel={l('New Quotation', 'Sebut Harga Baru')}
        onCreate={() => navigate(`/quotations/new?job_id=${job.id}`)}
        items={quotations.map(q => ({ id: q.id, number: q.quote_number, status: q.status, total: q.total, onView: () => navigate(`/quotations/${q.id}`) }))}
      />
      <DocGroup
        icon={<ClipboardCheck className="h-3.5 w-3.5" />}
        title={t('jobDetail.workOrder')}
        emptyText={t('jobDetail.woReady')}
        createLabel={l('New Work Order', 'Work Order Baru')}
        onCreate={() => navigate(`/jobs/${job.id}/work-order/new`)}
        items={workOrders.map((w: any) => ({ id: w.id, number: w.wo_number, status: w.status, total: w.total, onView: () => navigate(`/jobs/${job.id}/work-order?wo=${w.id}`) }))}
      />
      <DocGroup
        icon={<ClipboardCheck className="h-3.5 w-3.5" />}
        title={t('jobDetail.completionReport')}
        emptyText={t('jobDetail.reportReady')}
        createLabel={l('New Report', 'Laporan Baru')}
        onCreate={() => navigate(`/jobs/${job.id}/completion-report${reports.length ? '?new=1' : ''}`)}
        items={reports.map(r => ({ id: r.id, number: r.report_number, status: r.status === 'accepted' ? t('jobDetail.statusAccepted') : r.status === 'submitted' ? t('jobDetail.statusSubmitted') : r.status === 'rejected' ? t('jobDetail.statusRejected') : t('jobDetail.statusDraft'), onView: () => navigate(`/jobs/${job.id}/completion-report?report=${r.id}`) }))}
      />
      <DocGroup
        icon={<Receipt className="h-3.5 w-3.5" />}
        title={t('jobDetail.invoice')}
        emptyText={t('jobDetail.noInvoice')}
        createLabel={l('New Invoice', 'Invois Baru')}
        onCreate={() => navigate(`/invoices/new?job_id=${job.id}`)}
        items={invoices.map(i => ({ id: i.id, number: i.invoice_number, status: i.status, total: i.total, onView: () => navigate(`/invoices/${i.id}`) }))}
      />
        </div>) },
      ]}
    />
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
    </>
  );
}


function DocGroup({ icon, title, emptyText, createLabel, onCreate, items }: {
  icon: React.ReactNode; title: string; emptyText: string; createLabel: string; onCreate: () => void;
  items: { id: string; number: string; status: string; total?: number | null; onView: () => void }[];
}) {
  const l = useL();
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">{icon} {title}{items.length > 0 && ` (${items.length})`}</p>
        <Button size="sm" className="text-xs gap-1 h-8" onClick={onCreate}><Plus className="h-3.5 w-3.5" /> {createLabel}</Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map(it => (
            <button key={it.id} type="button" onClick={it.onView}
              className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border hover:bg-accent text-left">
              <div className="min-w-0">
                <p className="text-sm font-bold text-primary truncate">{it.number}</p>
                {it.total != null && <p className="text-xs text-muted-foreground">RM {Number(it.total).toFixed(2)}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{it.status}</span>
                <span className="text-xs text-primary font-medium">{l('View', 'Lihat')}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ArrowLeft, X, Loader2, Eye, MessageCircle,
  CheckCircle, XCircle, Receipt, Camera, ImageIcon,
  Edit, Trash2, FileText,
} from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { pdf } from '@react-pdf/renderer';
import CompletionReportPDF from '@/components/pdf/CompletionReportPDF';
import PDFPreviewModal from '@/components/pdf/PDFPreviewModal';
import CompletionReportView, { ChecklistItem } from '@/components/reports/CompletionReportView';
import TemplatePickerSection from '@/components/reports/TemplatePickerSection';
import { embedPdfCompanyLogo, imageUrlToBase64 } from '@/utils/imageToBase64';
import { autoUpdateJobStatus } from '@/utils/autoUpdateJobStatus';
import { generateAndIncrement, generateDocNumber, DEFAULT_DOC_SETTINGS } from '@/utils/generateDocNumber';
import { usePlanGate } from '@/hooks/usePlanGate';
import { getOrCreateApprovalToken, buildPublicApprovalUrl, uploadApprovalPdf } from '@/lib/approvals';
import { getOrCreateShortLink } from '@/lib/shortLinks';
import { renderTemplate } from '@/lib/whatsappTemplates';
import { openWhatsApp } from '@/lib/whatsapp';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Job {
  id: string;
  job_number: string;
  title: string;
  category: string;
  customer_id: string | null;
  customers: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (no hooks, no side-effects)
// ─────────────────────────────────────────────────────────────────────────────

function formatPhoneIntl(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0060')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('600'))  cleaned = '60' + cleaned.slice(3);
  if (cleaned.startsWith('0'))    cleaned = '60' + cleaned.slice(1);
  if (!cleaned.startsWith('60'))  cleaned = '60' + cleaned;
  return cleaned;
}

function formatDateMs(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ms-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDateTimeMs(d: string | null) {
  if (!d) return '-';
  const dt = new Date(d);
  return (
    dt.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' +
    dt.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
}

function parseChecklist(raw: string): ChecklistItem[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const m = line.match(/^\[([ xX])\]\s*(.+)$/);
      if (m) return { title: m[2].trim(), done: m[1].toLowerCase() === 'x' };
      return { title: line, done: true };
    });
}

function checklistToText(items: ChecklistItem[]): string {
  return items.map(i => `[${i.done === false ? ' ' : 'x'}] ${i.title}`).join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CompletionReportPage() {
  const { t } = useTranslation();
  const { id: jobId } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // ── Remote data ──────────────────────────────────────────────────────────
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Async operation flags ────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [sharing, setSharing]       = useState(false);
  const [deleting, setDeleting]     = useState(false);

  // ── Report metadata ──────────────────────────────────────────────────────
  const [reportId, setReportId]       = useState<string | null>(null);
  const [reportNumber, setReportNumber] = useState('');
  const [reportStatus, setReportStatus] =
    useState<'draft' | 'submitted' | 'accepted' | 'rejected'>('draft');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [acceptedAt, setAcceptedAt]   = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // ── Form fields ──────────────────────────────────────────────────────────
  const [completionDate, setCompletionDate] =
    useState(() => new Date().toISOString().slice(0, 10));
  const [technicianName, setTechnicianName]   = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [materialsUsed, setMaterialsUsed]     = useState('');
  const [customerSignature, setCustomerSignature] = useState('');
  const [notes, setNotes]               = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [projectRef, setProjectRef]     = useState('');
  const [checklistText, setChecklistText] = useState('');
  const [errors, setErrors]             = useState<Record<string, string>>({});

  // ── Photos ───────────────────────────────────────────────────────────────
  const [beforePhotos, setBeforePhotos]   = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos]     = useState<string[]>([]);
  const [beforeCaptions, setBeforeCaptions] = useState<string[]>([]);
  const [afterCaptions, setAfterCaptions]   = useState<string[]>([]);
  const [uploadingKind, setUploadingKind] =
    useState<'before' | 'after' | null>(null);

  // ── PDF / preview ────────────────────────────────────────────────────────
  const [logoBase64, setLogoBase64]   = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Dialogs ──────────────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ── Plan gate ────────────────────────────────────────────────────────────
  const { checkWhatsAppShare } = usePlanGate();

  // ─────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────

  // Pre-convert company logo once
  useEffect(() => {
    if (profile?.logo_url) imageUrlToBase64(profile.logo_url).then(setLogoBase64);
  }, [profile?.logo_url]);

  // Load job + existing report
  useEffect(() => {
    if (!user || !jobId) return;

    async function load() {
      const [jobRes, reportRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, job_number, title, category, customer_id, customers(name, phone, email, address)')
          .eq('id', jobId)
          .single(),
        supabase
          .from('completion_reports')
          .select('*')
          .eq('job_id', jobId)
          .eq('user_id', user!.id)
          .maybeSingle(),
      ]);

      setJob(jobRes.data as unknown as Job);

      if (reportRes.data) {
        const r = reportRes.data as any;
        setReportId(r.id);
        setReportNumber(r.report_number);
        setCompletionDate(r.completion_date || new Date().toISOString().slice(0, 10));
        setTechnicianName(r.technician_name || '');
        setWorkDescription(r.work_description || '');
        setMaterialsUsed(r.materials_used || '');
        setBeforePhotos(Array.isArray(r.before_photos) ? r.before_photos : []);
        setAfterPhotos(
          Array.isArray(r.after_photos) && r.after_photos.length
            ? r.after_photos
            : Array.isArray(r.photos) ? r.photos : [],
        );
        setCustomerSignature(r.customer_signature || '');
        setNotes(r.notes || '');
        setLocationLabel(r.location_label || '');
        setProjectRef(r.project_ref || '');
        const cl: ChecklistItem[] = Array.isArray(r.checklist) ? r.checklist : [];
        setChecklistText(cl.length ? checklistToText(cl) : '');
        const caps = (r.photo_captions || {}) as { before?: string[]; after?: string[] };
        setBeforeCaptions(Array.isArray(caps.before) ? caps.before : []);
        setAfterCaptions(Array.isArray(caps.after) ? caps.after : []);
        const status = (r.status as 'draft' | 'submitted' | 'accepted' | 'rejected') || 'draft';
        setReportStatus(status);
        setRejectionReason(r.rejection_reason || null);
        setAcceptedAt(r.accepted_at || null);
        setIsSubmitted(status === 'submitted' || status === 'accepted');
      } else {
        // Preview next doc number without consuming it yet
        const { data: profileData } = await supabase
          .from('profiles')
          .select('doc_number_settings')
          .eq('id', user!.id)
          .single();
        const settings = (profileData as any)?.doc_number_settings?.completion_report;
        const merged = { ...DEFAULT_DOC_SETTINGS.completion_report, ...(settings || {}) };
        setReportNumber(generateDocNumber(merged));
        if (profile?.company_name) setTechnicianName(profile.company_name);
      }

      setLoading(false);
    }

    load();
  }, [user, jobId, profile]);

  // Realtime: reflect customer accept / reject immediately
  useEffect(() => {
    if (!user || !jobId) return;
    const ch = supabase
      .channel(`completion-report-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'completion_reports',
          filter: `job_id=eq.${jobId}`,
        },
        (payload: any) => {
          const r = payload.new;
          if (!r) return;
          const status =
            (r.status as 'draft' | 'submitted' | 'accepted' | 'rejected') || 'draft';
          setReportStatus(status);
          setRejectionReason(r.rejection_reason || null);
          setAcceptedAt(r.accepted_at || null);
          setIsSubmitted(status === 'submitted' || status === 'accepted');
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, jobId]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers — build the PDF data object (used in preview + share)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Converts all photo URLs to base64, builds the full PDF data object,
   * and embeds the company logo. Returns a ready-to-render PDF props object.
   */
  const buildPdfData = async (photosBefore: string[], photosAfter: string[]) => {
    if (!job) throw new Error('Job not loaded');

    const [beforeBase64, afterBase64] = await Promise.all([
      Promise.all(photosBefore.map(url => imageUrlToBase64(url).catch(() => ''))),
      Promise.all(photosAfter.map(url => imageUrlToBase64(url).catch(() => ''))),
    ]);

    return embedPdfCompanyLogo({
      report: {
        report_number: reportNumber,
        completion_date: completionDate,
        technician_name: technicianName,
        work_description: workDescription,
        materials_used: materialsUsed,
        customer_signature: customerSignature,
        notes,
        status: reportStatus,
        accepted_at: acceptedAt,
        before_photos: beforeBase64.filter(Boolean),
        after_photos: afterBase64.filter(Boolean),
        location_label: locationLabel || null,
        project_ref: projectRef || null,
        checklist: parseChecklist(checklistText),
        photo_captions: { before: beforeCaptions, after: afterCaptions },
      },
      job: {
        job_number: job.job_number,
        title: job.title,
        category: job.category,
      },
      customer: job.customers
        ? {
            name: job.customers.name,
            phone: job.customers.phone,
            address: job.customers.address,
          }
        : null,
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
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Photo upload / remove / caption
  // ─────────────────────────────────────────────────────────────────────────

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'before' | 'after',
  ) => {
    const files = e.target.files;
    if (!files || !user || !jobId) return;

    const current = kind === 'before' ? beforePhotos : afterPhotos;
    const setter  = kind === 'before' ? setBeforePhotos : setAfterPhotos;

    for (let i = 0; i < files.length; i++) {
      if (current.length + i >= 10) break;
      const file = files[i];

      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('completionReport.fileTooLarge', { name: file.name }));
        continue;
      }

      setUploadingKind(kind);
      const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/${jobId}/${kind}/${Date.now()}_${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('completion-photos')
        .upload(path, file, { upsert: true, contentType: file.type || `image/${ext}` });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(t('completionReport.uploadFailed', { msg: uploadError.message }));
        continue;
      }

      const { data: signed, error: signedError } = await supabase.storage
        .from('completion-photos')
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      if (signedError || !signed?.signedUrl) {
        console.error('Signed URL error:', signedError);
        toast.error(t('completionReport.imageUrlFailed'));
        continue;
      }

      setter(prev => [...prev, signed.signedUrl]);
    }

    setUploadingKind(null);
    e.target.value = '';
  };

  const removePhoto = (kind: 'before' | 'after', index: number) => {
    if (kind === 'before') {
      setBeforePhotos(prev => prev.filter((_, i) => i !== index));
      setBeforeCaptions(prev => prev.filter((_, i) => i !== index));
    } else {
      setAfterPhotos(prev => prev.filter((_, i) => i !== index));
      setAfterCaptions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const setCaption = (kind: 'before' | 'after', index: number, val: string) => {
    const setter = kind === 'before' ? setBeforeCaptions : setAfterCaptions;
    const arr    = kind === 'before' ? beforeCaptions    : afterCaptions;
    const next   = [...arr];
    next[index]  = val;
    setter(next);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Save / submit
  // ─────────────────────────────────────────────────────────────────────────

  const handleSave = async (status: 'draft' | 'submitted') => {
    // Validate on submit
    if (status === 'submitted') {
      const newErrors: Record<string, string> = {};
      if (!completionDate)         newErrors.completionDate  = t('completionReport.errDate');
      if (!technicianName.trim())  newErrors.technicianName  = t('completionReport.errTechnician');
      if (!workDescription.trim()) newErrors.workDescription = t('completionReport.errWorkDesc');
      if (afterPhotos.length === 0) newErrors.photos         = t('completionReport.errPhotos');
      if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
    }

    if (status === 'draft') setSaving(true);
    else setSubmitting(true);

    try {
      const payload: any = {
        user_id:            user!.id,
        job_id:             jobId,
        report_number:      reportNumber,
        completion_date:    completionDate || null,
        technician_name:    technicianName.trim()    || null,
        work_description:   workDescription.trim()   || null,
        materials_used:     materialsUsed.trim()     || null,
        customer_signature: customerSignature.trim() || null,
        photos:             afterPhotos,   // legacy column kept for backwards-compat
        before_photos:      beforePhotos,
        after_photos:       afterPhotos,
        notes:              notes.trim()         || null,
        location_label:     locationLabel.trim() || null,
        project_ref:        projectRef.trim()    || null,
        checklist:          parseChecklist(checklistText),
        photo_captions:     { before: beforeCaptions, after: afterCaptions },
        status,
      };

      if (status === 'submitted') {
        payload.submitted_at      = new Date().toISOString();
        payload.rejected_at       = null;
        payload.rejection_reason  = null;
      }

      let savedId = reportId;

      if (reportId) {
        const { error } = await supabase
          .from('completion_reports')
          .update(payload)
          .eq('id', reportId);
        if (error) throw error;
      } else {
        // Atomically generate + increment doc number
        const finalNumber = await generateAndIncrement(supabase, user!.id, 'completion_report');
        payload.report_number = finalNumber;
        setReportNumber(finalNumber);

        const { data: inserted, error } = await supabase
          .from('completion_reports')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        savedId = inserted?.id || null;
        if (savedId) setReportId(savedId);
      }

      if (status === 'submitted') {
        await autoUpdateJobStatus(supabase as any, jobId!, user!.id, 'report_submitted', {
          completed_date: completionDate,
        });
        setReportStatus('submitted');
        setRejectionReason(null);
        setIsSubmitted(true);
        if (savedId) setReportId(savedId);
        toast.success(t('completionReport.submittedToast'));
        // ✅ No auto-share here.
        // The "Hantar via WhatsApp" button in the submitted banner gives the user
        // a fresh gesture → browser allows window.open reliably on all platforms.
      } else {
        toast.success(t('completionReport.draftToast'));
      }
    } catch (err: any) {
      toast.error(err.message || t('completionReport.saveError'));
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Delete
  // ─────────────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!reportId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('completion_reports')
        .delete()
        .eq('id', reportId);
      if (error) throw error;
      toast.success(t('completionReport.deletedToast'));
      navigate(`/jobs/${jobId}`);
    } catch (e: any) {
      toast.error(e.message || t('completionReport.deleteError'));
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PDF preview
  // ─────────────────────────────────────────────────────────────────────────

  const handlePreview = async () => {
    if (!job) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const pdfData = await buildPdfData(beforePhotos, afterPhotos);
      const blob    = await pdf(<CompletionReportPDF {...pdfData} />).toBlob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      toast.error(t('completionReport.previewError'));
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handlePreviewDownload = async () => {
    if (!previewUrl) return;
    const a      = document.createElement('a');
    a.href       = previewUrl;
    a.download   = t('completionReport.fileName', { number: reportNumber });
    a.click();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // WhatsApp sharing
  //
  // Pattern mirrors InvoiceDetailPage:
  //   shareReportWhatsAppCore  — pure async logic, no plan gate, no loading state.
  //                              Can be called from any async chain that started
  //                              with a direct user gesture.
  //   handleWhatsAppShare      — button onClick wrapper: plan gate + phone guard
  //                              + loading state + error toast.
  //
  // Why no pre-opened blank window:
  //   openPendingWhatsAppWindow() opens a blank tab then tries to redirect it
  //   after several seconds of async work. Browsers (especially Safari / mobile
  //   Chrome) treat that redirect as a popup and block it. The fix is to call
  //   window.open() (via openWhatsApp) only AFTER all async work is done, from
  //   a call-stack that traces back to a direct user click. That is guaranteed
  //   here because handleWhatsAppShare is the only entry point.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Core share logic — no plan gate, no setSharing.
   * Generates PDF → uploads → gets approval token → short link → opens WhatsApp.
   * Must only be called from a call-stack rooted in a direct user gesture.
   */
  const shareReportWhatsAppCore = async (rid: string) => {
    if (!job || !user || !job.customers?.phone) return;

    let pdfUrl: string | null = null;

    // PDF generation is best-effort — if it fails we still send the approval link
    try {
      const pdfData = await buildPdfData(beforePhotos, afterPhotos);
      const blob    = await pdf(<CompletionReportPDF {...pdfData} />).toBlob();
      pdfUrl        = await uploadApprovalPdf({
        bucket:         'completion-report-pdfs',
        userId:         user.id,
        documentId:     rid,
        documentNumber: reportNumber,
        blob,
      });
    } catch (pdfError) {
      console.warn('Completion report PDF skipped; sharing approval link only:', pdfError);
    }

    const token       = await getOrCreateApprovalToken({
      userId:        user.id,
      documentId:    rid,
      documentType:  'completion_report',
      customerName:  job.customers.name,
      customerEmail: job.customers.email || null,
      pdfUrl,
      expiresInDays: 30,
    });
    const approvalUrl = buildPublicApprovalUrl(token);
    const shortUrl    = await getOrCreateShortLink({
      userId:    user.id,
      targetUrl: approvalUrl,
      kind:      'approval',
    });

    const phone   = formatPhoneIntl(job.customers.phone);
    const details = t('completionReport.waDetails', {
      number: reportNumber,
      job:    job.title,
      date:   formatDateMs(completionDate),
      link:   shortUrl,
    });
    const msg = renderTemplate(
      (profile as any)?.whatsapp_templates,
      'completion_report',
      {
        customer_name: job.customers.name,
        company_name:  profile?.company_name || '',
      },
      details,
    );

    // ✅ Single, direct window.open — called only after all async work is done.
    // No blank window pre-opened. Works on mobile Safari, Chrome, WebView.
    openWhatsApp(phone, msg);
  };

  /**
   * Button-level wrapper — always called from a direct onClick.
   * Handles: plan gate check, phone guard, loading state, error boundary.
   */
  const handleWhatsAppShare = async () => {
    if (!reportId) return;

    // ① Plan gate — early exit before any async work
    if (!checkWhatsAppShare()) return;

    // ② Phone guard
    if (!job?.customers?.phone) {
      toast.error(t('completionReport.noPhone'));
      return;
    }

    setSharing(true);
    try {
      await shareReportWhatsAppCore(reportId);
    } catch (e: any) {
      toast.error(e?.message || t('completionReport.shareError'));
    } finally {
      setSharing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const reportViewProps = {
    report: {
      report_number:       reportNumber,
      completion_date:     completionDate,
      technician_name:     technicianName,
      work_description:    workDescription,
      materials_used:      materialsUsed,
      customer_signature:  customerSignature,
      notes,
      status:              reportStatus,
      accepted_at:         acceptedAt,
      before_photos:       beforePhotos,
      after_photos:        afterPhotos,
      location_label:      locationLabel,
      project_ref:         projectRef,
      checklist:           parseChecklist(checklistText),
      photo_captions:      { before: beforeCaptions, after: afterCaptions },
    },
    job:      job ? { job_number: job.job_number, title: job.title, category: job.category } : null,
    customer: job?.customers
      ? { name: job.customers.name, phone: job.customers.phone, address: job.customers.address }
      : null,
    company:  { company_name: profile?.company_name || null, logo_url: profile?.logo_url || null },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading / not-found states
  // ─────────────────────────────────────────────────────────────────────────

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
        <p className="text-muted-foreground">{t('completionReport.jobNotFound')}</p>
        <Button variant="outline" onClick={() => navigate('/jobs')} className="mt-4">
          {t('completionReport.back')}
        </Button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl pb-28 md:pb-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {t('completionReport.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{reportNumber}</p>
        </div>
      </div>

      {/* ── Status banners ─────────────────────────────────────────────────── */}

      {/* Waiting for approval */}
      {reportStatus === 'submitted' && (
        <div className="bg-[#DBEAFE] border border-[#93C5FD] rounded-xl p-4 space-y-2">
          <div className="inline-flex items-center gap-2 bg-white/70 text-[#1D4ED8] text-sm font-medium px-3 py-1.5 rounded-full">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('completionReport.waitingApproval')}
          </div>
          <p className="text-xs text-[#1D4ED8]/80">
            {t('completionReport.waitingHint')}
          </p>
          {/* ✅ Direct onClick → handleWhatsAppShare → shareReportWhatsAppCore
              → openWhatsApp. No pre-opened blank window. Works on mobile. */}
          {job.customers?.phone && (
            <Button
              onClick={handleWhatsAppShare}
              disabled={sharing}
              className="text-white rounded-lg gap-2"
              style={{ backgroundColor: '#25D366' }}
            >
              {sharing
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <MessageCircle className="h-4 w-4" />}
              {t('completionReport.reshareWa')}
            </Button>
          )}
        </div>
      )}

      {/* Accepted */}
      {reportStatus === 'accepted' && (
        <div className="bg-[#DCFCE7] border border-[#BBF7D0] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#15803D] text-sm font-semibold">
            <CheckCircle className="h-5 w-5" />
            {t('completionReport.approved')}
          </div>
          {acceptedAt && (
            <p className="text-xs text-[#15803D]/80">
              {t('completionReport.approvedAt', { date: formatDateTimeMs(acceptedAt) })}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => navigate(`/invoices/new?job_id=${jobId}`)}
              size="sm"
              className="rounded-lg gap-2"
            >
              <Receipt className="h-4 w-4" /> {t('completionReport.createInvoice')}
            </Button>
            <Button
              onClick={() => navigate(`/jobs/${jobId}/vo/new`)}
              size="sm"
              variant="outline"
              className="rounded-lg gap-2"
            >
              <FileText className="h-4 w-4" /> {t('completionReport.voDeduction')}
            </Button>
          </div>
        </div>
      )}

      {/* Rejected */}
      {reportStatus === 'rejected' && (
        <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#B91C1C] text-sm font-semibold">
            <XCircle className="h-5 w-5" />
            {t('completionReport.rejected')}
          </div>
          {rejectionReason && (
            <p className="text-sm text-[#B91C1C]">
              {t('completionReport.rejectedReason', { reason: rejectionReason })}
            </p>
          )}
          <p className="text-xs text-[#B91C1C]/80">
            {t('completionReport.rejectedHint')}
          </p>
        </div>
      )}

      {/* ── Submitted / accepted — read-only view ──────────────────────────── */}
      {isSubmitted && (
        <CompletionReportView {...reportViewProps} />
      )}

      {/* ── Draft / edit — form ────────────────────────────────────────────── */}
      {!isSubmitted && (
        <>
          {/* Job info (read-only) */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('completionReport.jobInfo')}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{t('completionReport.jobNumber')}</p>
                <p className="font-medium text-foreground">{job.job_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('completionReport.jobTitle')}</p>
                <p className="text-foreground">{job.title}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('completionReport.customer')}</p>
                <p className="text-foreground">{job.customers?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('completionReport.category')}</p>
                <p className="text-foreground">{job.category}</p>
              </div>
            </div>
          </div>

          {/* Completion date */}
          <div className="space-y-1.5">
            <Label>{t('completionReport.completionDate')}</Label>
            <Input
              type="date"
              value={completionDate}
              onChange={e => {
                setCompletionDate(e.target.value);
                setErrors(p => ({ ...p, completionDate: '' }));
              }}
            />
            {errors.completionDate && (
              <p className="text-xs text-destructive">{errors.completionDate}</p>
            )}
          </div>

          {/* Technician name */}
          <div className="space-y-1.5">
            <Label>{t('completionReport.technicianName')}</Label>
            <Input
              value={technicianName}
              onChange={e => {
                setTechnicianName(e.target.value);
                setErrors(p => ({ ...p, technicianName: '' }));
              }}
              placeholder={t('completionReport.technicianPlaceholder')}
            />
            {errors.technicianName && (
              <p className="text-xs text-destructive">{errors.technicianName}</p>
            )}
          </div>

          {/* Location + project ref */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                {t('completionReport.location')}{' '}
                <span className="text-xs text-muted-foreground font-normal">
                  {t('completionReport.optional')}
                </span>
              </Label>
              <Input
                value={locationLabel}
                onChange={e => setLocationLabel(e.target.value)}
                placeholder={t('completionReport.locationPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                {t('completionReport.projectRef')}{' '}
                <span className="text-xs text-muted-foreground font-normal">
                  {t('completionReport.optional')}
                </span>
              </Label>
              <Input
                value={projectRef}
                onChange={e => setProjectRef(e.target.value)}
                placeholder={t('completionReport.projectRefPlaceholder')}
              />
            </div>
          </div>

          {/* Template picker */}
          <TemplatePickerSection
            current={{ work_description: workDescription, materials_used: materialsUsed, checklistText }}
            onApply={tpl => {
              setWorkDescription(tpl.work_description);
              setMaterialsUsed(tpl.materials_used);
              setChecklistText(tpl.checklistText);
              setErrors(p => ({ ...p, workDescription: '' }));
            }}
          />

          {/* Work description */}
          <div className="space-y-1.5">
            <Label>{t('completionReport.workDesc')}</Label>
            <Textarea
              value={workDescription}
              onChange={e => {
                setWorkDescription(e.target.value);
                setErrors(p => ({ ...p, workDescription: '' }));
              }}
              rows={5}
              placeholder={t('completionReport.workDescPlaceholder')}
            />
            {errors.workDescription && (
              <p className="text-xs text-destructive">{errors.workDescription}</p>
            )}
          </div>

          {/* Materials used */}
          <div className="space-y-1.5">
            <Label>{t('completionReport.materials')}</Label>
            <Textarea
              value={materialsUsed}
              onChange={e => setMaterialsUsed(e.target.value)}
              rows={3}
              placeholder={t('completionReport.materialsPlaceholder')}
            />
          </div>

          {/* Before photos */}
          <PhotoSection
            kind="before"
            label={t('completionReport.beforePhotos')}
            badge={{ text: t('completionReport.optBadge'), className: 'bg-amber-100 text-amber-700' }}
            helper={t('completionReport.beforeHelper')}
            photos={beforePhotos}
            captions={beforeCaptions}
            uploading={uploadingKind === 'before'}
            disabled={false}
            onUpload={e => handlePhotoUpload(e, 'before')}
            onRemove={i => removePhoto('before', i)}
            onCaption={(i, v) => setCaption('before', i, v)}
            captionPlaceholder={t('completionReport.captionPlaceholder')}
            uploadingLabel={t('completionReport.uploading')}
            cameraLabel={t('completionReport.camera')}
            galleryLabel={t('completionReport.gallery')}
          />

          {/* After photos */}
          <PhotoSection
            kind="after"
            label={t('completionReport.afterPhotos')}
            badge={{ text: t('completionReport.requiredBadge'), className: 'bg-red-100 text-red-700' }}
            helper={t('completionReport.afterHelper')}
            photos={afterPhotos}
            captions={afterCaptions}
            uploading={uploadingKind === 'after'}
            disabled={false}
            onUpload={e => handlePhotoUpload(e, 'after')}
            onRemove={i => removePhoto('after', i)}
            onCaption={(i, v) => setCaption('after', i, v)}
            error={errors.photos}
            captionPlaceholder={t('completionReport.captionPlaceholder')}
            uploadingLabel={t('completionReport.uploading')}
            cameraLabel={t('completionReport.camera')}
            galleryLabel={t('completionReport.gallery')}
          />

          {/* Checklist */}
          <div className="space-y-1.5">
            <Label>
              {t('completionReport.checklist')}{' '}
              <span className="text-xs text-muted-foreground font-normal">
                {t('completionReport.optional')}
              </span>
            </Label>
            <Textarea
              value={checklistText}
              onChange={e => setChecklistText(e.target.value)}
              rows={4}
              placeholder={t('completionReport.checklistPlaceholder')}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              {t('completionReport.checklistHelper')}
            </p>
          </div>

          {/* Customer signature */}
          <div className="space-y-1.5">
            <Label>{t('completionReport.customerSignature')}</Label>
            <Input
              value={customerSignature}
              onChange={e => setCustomerSignature(e.target.value)}
              placeholder={t('completionReport.customerSignaturePlaceholder')}
            />
            <p className="text-[11px] text-muted-foreground">
              {t('completionReport.signatureHelper')}
            </p>
          </div>

          {/* Additional notes */}
          <div className="space-y-1.5">
            <Label>{t('completionReport.additionalNotes')}</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder={t('completionReport.notesPlaceholder')}
            />
          </div>
        </>
      )}

      {/* ── Actions — edit / draft mode ────────────────────────────────────── */}
      {!isSubmitted && (
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => handleSave('submitted')}
            disabled={submitting}
            className="rounded-lg"
          >
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('completionReport.submitting')}</>
              : t('completionReport.submit')}
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="flex-1 rounded-lg"
            >
              {saving ? t('completionReport.savingDraft') : t('completionReport.saveDraft')}
            </Button>
            <Button
              variant="outline"
              onClick={handlePreview}
              className="flex-1 rounded-lg gap-2"
            >
              <Eye className="h-4 w-4" /> {t('completionReport.previewPdf')}
            </Button>
          </div>

          {reportId && (
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg gap-2"
            >
              <Trash2 className="h-4 w-4" /> {t('completionReport.deleteReport')}
            </Button>
          )}
        </div>
      )}

      {/* ── Actions — submitted / accepted mode ───────────────────────────── */}
      {isSubmitted && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePreview} className="rounded-lg gap-2">
            <Eye className="h-4 w-4" /> {t('completionReport.previewPdf')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsSubmitted(false);
              toast.info(t('completionReport.editModeOpened'));
            }}
            className="rounded-lg gap-2"
          >
            <Edit className="h-4 w-4" /> {t('completionReport.editReport')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteOpen(true)}
            className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg gap-2"
          >
            <Trash2 className="h-4 w-4" /> {t('completionReport.delete')}
          </Button>
        </div>
      )}

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('completionReport.deleteTitle')}
        body={t('completionReport.deleteBody')}
        confirmLabel={deleting ? t('completionReport.deleting') : t('completionReport.delete')}
        confirmVariant="danger"
        isLoading={deleting}
      />

      <PDFPreviewModal
        open={previewOpen}
        title={t('completionReport.previewTitle', { number: reportNumber })}
        loading={previewLoading}
        fileUrl={previewUrl}
        onClose={closePreview}
        onDownload={handlePreviewDownload}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PhotoSection sub-component
// ─────────────────────────────────────────────────────────────────────────────

interface PhotoSectionProps {
  kind: 'before' | 'after';
  label: string;
  badge: { text: string; className: string };
  helper: string;
  photos: string[];
  captions?: string[];
  uploading: boolean;
  disabled: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  onCaption?: (index: number, value: string) => void;
  error?: string;
  captionPlaceholder?: string;
  uploadingLabel?: string;
  cameraLabel?: string;
  galleryLabel?: string;
}

function PhotoSection({
  label,
  badge,
  helper,
  photos,
  captions = [],
  uploading,
  disabled,
  onUpload,
  onRemove,
  onCaption,
  error,
  captionPlaceholder,
  uploadingLabel,
  cameraLabel,
  galleryLabel,
}: PhotoSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="m-0">{label}</Label>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
          {badge.text}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{helper}</p>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((url, i) => (
          <div key={i} className="space-y-1.5">
            <div className="relative">
              <img
                src={url}
                alt={`${label} ${i + 1}`}
                className="w-full h-[100px] object-cover rounded-lg border border-border"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-white rounded-full flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {onCaption && !disabled && (
              <Input
                value={captions[i] || ''}
                onChange={e => onCaption(i, e.target.value)}
                placeholder={captionPlaceholder || 'Caption'}
                className="h-7 text-[11px] px-2"
              />
            )}
          </div>
        ))}

        {photos.length < 10 && !disabled && (
          uploading ? (
            <div className="h-[100px] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground mt-1">
                {uploadingLabel || 'Uploading...'}
              </span>
            </div>
          ) : (
            <>
              {/* Camera (capture) */}
              <label className="h-[100px] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors">
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground mt-1">
                  {cameraLabel || 'Camera'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onUpload}
                  className="hidden"
                  disabled={disabled}
                />
              </label>
              {/* Gallery (multi-select) */}
              <label className="h-[100px] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground mt-1">
                  {galleryLabel || 'Gallery'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onUpload}
                  className="hidden"
                  disabled={disabled}
                />
              </label>
            </>
          )
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Plus, X, Loader2, Eye, MessageCircle, CheckCircle, XCircle, Receipt, Camera, ImageIcon, Edit, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { pdf } from '@react-pdf/renderer';
import CompletionReportPDF from '@/components/pdf/CompletionReportPDF';
import PDFPreviewModal from '@/components/pdf/PDFPreviewModal';
import CompletionReportView, { ChecklistItem } from '@/components/reports/CompletionReportView';
import { embedPdfCompanyLogo, imageUrlToBase64 } from '@/utils/imageToBase64';
import { autoUpdateJobStatus } from '@/utils/autoUpdateJobStatus';
import { generateAndIncrement, generateDocNumber, DEFAULT_DOC_SETTINGS } from '@/utils/generateDocNumber';
import { usePlanGate } from '@/hooks/usePlanGate';
import { getOrCreateApprovalToken, buildPublicApprovalUrl, uploadApprovalPdf } from '@/lib/approvals';
import { getOrCreateShortLink } from '@/lib/shortLinks';
import { renderTemplate } from '@/lib/whatsappTemplates';

interface Job {
  id: string;
  job_number: string;
  title: string;
  category: string;
  customer_id: string | null;
  customers: { name: string; phone: string | null; email: string | null; address: string | null } | null;
}

function formatPhoneIntl(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0060')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('600')) cleaned = '60' + cleaned.slice(3);
  if (cleaned.startsWith('0')) cleaned = '60' + cleaned.slice(1);
  if (!cleaned.startsWith('60')) cleaned = '60' + cleaned;
  return cleaned;
}

function formatDateMs(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTimeMs(d: string | null) {
  if (!d) return '-';
  const dt = new Date(d);
  return `${dt.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })} ${dt.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}

function openPendingWhatsAppWindow(): Window | null {
  try {
    const win = window.open('', '_blank');
    win?.document.write('<!doctype html><title>WhatsApp</title><body style="font-family:sans-serif;padding:24px">Opening WhatsApp...</body>');
    return win;
  } catch {
    return null;
  }
}

function openWhatsAppUrl(url: string, pendingWindow?: Window | null) {
  if (pendingWindow && !pendingWindow.closed) {
    pendingWindow.location.href = url;
    return;
  }
  window.open(url, '_blank');
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

export default function CompletionReportPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportNumber, setReportNumber] = useState('');
  const [completionDate, setCompletionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [technicianName, setTechnicianName] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [customerSignature, setCustomerSignature] = useState('');
  const [notes, setNotes] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [projectRef, setProjectRef] = useState('');
  const [checklistText, setChecklistText] = useState('');
  const [beforeCaptions, setBeforeCaptions] = useState<string[]>([]);
  const [afterCaptions, setAfterCaptions] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [reportStatus, setReportStatus] = useState<'draft' | 'submitted' | 'accepted' | 'rejected'>('draft');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { checkWhatsAppShare } = usePlanGate();

  // PDF Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [logoBase64, setLogoBase64] = useState('');

  useEffect(() => {
    if (profile?.logo_url) {
      imageUrlToBase64(profile.logo_url).then(setLogoBase64);
    }
  }, [profile?.logo_url]);

  useEffect(() => {
    if (!user || !jobId) return;
    async function fetch() {
      const [jobRes, reportRes] = await Promise.all([
        supabase.from('jobs')
          .select('id, job_number, title, category, customer_id, customers(name, phone, email, address)')
          .eq('id', jobId).single(),
        supabase.from('completion_reports')
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
            : (Array.isArray(r.photos) ? r.photos : [])
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
        // Lock fields once it's been sent (submitted/accepted). Allow edit again if rejected.
        setIsSubmitted(status === 'submitted' || status === 'accepted');
      } else {
        // Preview next report number from doc_number_settings
        const { data: profileData } = await supabase
          .from('profiles')
          .select('doc_number_settings')
          .eq('id', user!.id)
          .single();
        const settings = (profileData as any)?.doc_number_settings?.completion_report;
        const merged = { ...DEFAULT_DOC_SETTINGS.completion_report, ...(settings || {}) };
        setReportNumber(generateDocNumber(merged));
        // Pre-fill technician
        if (profile?.company_name) setTechnicianName(profile.company_name);
      }
      setLoading(false);
    }
    fetch();
  }, [user, jobId, profile]);

  // Realtime updates when customer accepts/rejects
  useEffect(() => {
    if (!user || !jobId) return;
    const ch = supabase
      .channel(`completion-report-${jobId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'completion_reports', filter: `job_id=eq.${jobId}` }, (payload: any) => {
        const r = payload.new;
        if (!r) return;
        const status = (r.status as 'draft' | 'submitted' | 'accepted' | 'rejected') || 'draft';
        setReportStatus(status);
        setRejectionReason(r.rejection_reason || null);
        setAcceptedAt(r.accepted_at || null);
        setIsSubmitted(status === 'submitted' || status === 'accepted');
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, jobId]);

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'before' | 'after'
  ) => {
    const files = e.target.files;
    if (!files || !user || !jobId) return;

    const current = kind === 'before' ? beforePhotos : afterPhotos;
    const setter = kind === 'before' ? setBeforePhotos : setAfterPhotos;

    for (let i = 0; i < files.length; i++) {
      if (current.length + i >= 10) break;
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} melebihi 5MB`);
        continue;
      }

      setUploadingPhoto(true);
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/${jobId}/${kind}/${Date.now()}_${i}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('completion-photos')
        .upload(path, file, { upsert: true, contentType: file.type || `image/${ext}` });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Gagal muat naik: ${uploadError.message}`);
        continue;
      }

      const { data: signed, error: signedError } = await supabase.storage
        .from('completion-photos')
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      if (signedError || !signed?.signedUrl) {
        console.error('Signed URL error:', signedError);
        toast.error('Gagal mendapatkan URL gambar');
        continue;
      }

      setter(prev => [...prev, signed.signedUrl]);
    }
    setUploadingPhoto(false);
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
    const arr = kind === 'before' ? beforeCaptions : afterCaptions;
    const next = [...arr];
    next[index] = val;
    setter(next);
  };

  const handleSave = async (status: 'draft' | 'submitted') => {
    if (status === 'submitted') {
      const newErrors: Record<string, string> = {};
      if (!completionDate) newErrors.completionDate = 'Sila pilih tarikh';
      if (!technicianName.trim()) newErrors.technicianName = 'Sila isi nama juruteknik';
      if (!workDescription.trim()) newErrors.workDescription = 'Sila isi penerangan kerja';
      if (afterPhotos.length === 0) newErrors.photos = 'Sila muat naik sekurang-kurangnya 1 gambar selepas';
      if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
    }

    const isSaving = status === 'draft';
    if (isSaving) setSaving(true);
    else setSubmitting(true);

    try {
      const payload: any = {
        user_id: user!.id,
        job_id: jobId,
        report_number: reportNumber,
        completion_date: completionDate || null,
        technician_name: technicianName.trim() || null,
        work_description: workDescription.trim() || null,
        materials_used: materialsUsed.trim() || null,
        customer_signature: customerSignature.trim() || null,
        photos: afterPhotos, // legacy column kept for backwards-compat
        before_photos: beforePhotos,
        after_photos: afterPhotos,
        notes: notes.trim() || null,
        location_label: locationLabel.trim() || null,
        project_ref: projectRef.trim() || null,
        checklist: parseChecklist(checklistText),
        photo_captions: { before: beforeCaptions, after: afterCaptions },
        status,
      };

      if (status === 'submitted') {
        payload.submitted_at = new Date().toISOString();
        // Reset any prior rejection so it goes back into "waiting for customer"
        payload.rejected_at = null;
        payload.rejection_reason = null;
      }

      let savedId = reportId;
      if (reportId) {
        const { error } = await supabase.from('completion_reports').update(payload).eq('id', reportId);
        if (error) throw error;
      } else {
        // Atomically generate and increment doc number for completion report
        const finalNumber = await generateAndIncrement(supabase, user!.id, 'completion_report');
        payload.report_number = finalNumber;
        setReportNumber(finalNumber);

        const { data: inserted, error } = await supabase.from('completion_reports').insert(payload).select('id').single();
        if (error) throw error;
        savedId = inserted?.id || null;
        if (savedId) setReportId(savedId);
      }

      if (status === 'submitted') {
        // Auto-update job status to Completed
        await autoUpdateJobStatus(supabase as any, jobId!, user!.id, 'report_submitted', {
          completed_date: completionDate,
        });
        // Stay on page so user can immediately share the approval link via WhatsApp
        setReportStatus('submitted');
        setRejectionReason(null);
        setIsSubmitted(true);
        if (savedId) setReportId(savedId);
        toast.success('Laporan dihantar! Membuka WhatsApp...');
        // Auto-trigger WhatsApp share with the saved report id (state may not be updated yet)
        if (job?.customers?.phone && savedId) {
          await shareReportViaWhatsApp(savedId);
        }
      } else {
        toast.success('Draf laporan disimpan!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Ralat menyimpan');
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!reportId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('completion_reports').delete().eq('id', reportId);
      if (error) throw error;
      toast.success('Laporan dipadam');
      navigate(`/jobs/${jobId}`);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memadam laporan');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handlePreview = async () => {
    if (!job) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      // Convert photo URLs to base64 for PDF
      const [beforeBase64, afterBase64] = await Promise.all([
        Promise.all(beforePhotos.map(url => imageUrlToBase64(url))),
        Promise.all(afterPhotos.map(url => imageUrlToBase64(url))),
      ]);

      const pdfData = await embedPdfCompanyLogo({
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
          job: job ? { job_number: job.job_number, title: job.title, category: job.category } : null,
          customer: job?.customers ? { name: job.customers.name, phone: job.customers.phone, address: job.customers.address } : null,
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
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      toast.error('Gagal menjana pratonton');
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!reportId) return;
    await shareReportViaWhatsApp(reportId);
  };

  const shareReportViaWhatsApp = async (rid: string) => {
    if (!job || !user) return;
    if (!job.customers?.phone) {
      toast.error('Pelanggan tiada nombor telefon');
      return;
    }
    if (!checkWhatsAppShare()) return;
    setSharing(true);
    try {
      const [beforeBase64, afterBase64] = await Promise.all([
        Promise.all(beforePhotos.map(url => imageUrlToBase64(url).catch(() => ''))),
        Promise.all(afterPhotos.map(url => imageUrlToBase64(url).catch(() => ''))),
      ]);
      const pdfData = await embedPdfCompanyLogo({
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
          job: { job_number: job.job_number, title: job.title, category: job.category },
          customer: { name: job.customers.name, phone: job.customers.phone, address: job.customers.address },
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
        documentId: rid,
        documentNumber: reportNumber,
        blob,
      });

      const token = await getOrCreateApprovalToken({
        userId: user.id,
        documentId: rid,
        documentType: 'completion_report',
        customerName: job.customers.name,
        customerEmail: job.customers.email || null,
        pdfUrl,
        expiresInDays: 30,
      });
      const approvalUrl = buildPublicApprovalUrl(token);
      const shortUrl = await getOrCreateShortLink({ userId: user.id, targetUrl: approvalUrl, kind: 'approval' });
      const phone = formatPhoneIntl(job.customers.phone);
      const companyName = profile?.company_name || '';
      const details = `📋 *No. Laporan:* ${reportNumber}\n🔨 *Kerja:* ${job.title}\n📅 *Tarikh Siap:* ${formatDateMs(completionDate)}\n\n👉 Tekan sini untuk *lihat & sahkan* laporan:\n${shortUrl}`;
      const msg = renderTemplate(
        (profile as any)?.whatsapp_templates,
        'completion_report',
        { customer_name: job.customers.name, company_name: companyName },
        details,
      );
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (e: any) {
      toast.error(e?.message || 'Gagal kongsi laporan');
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p className="text-muted-foreground">Kerja tidak dijumpai.</p>
        <Button variant="outline" onClick={() => navigate('/jobs')} className="mt-4">Kembali</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl pb-28 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/jobs/${jobId}`)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Laporan Siap Kerja</h1>
          <p className="text-sm text-muted-foreground">{reportNumber}</p>
        </div>
      </div>

      {/* Status banners — mirror Work Order */}
      {reportStatus === 'submitted' && (
        <div className="bg-[#DBEAFE] border border-[#93C5FD] rounded-xl p-4 space-y-2">
          <div className="inline-flex items-center gap-2 bg-white/70 text-[#1D4ED8] text-sm font-medium px-3 py-1.5 rounded-full">
            <Loader2 className="h-4 w-4 animate-spin" />
            Menunggu Pengesahan Pelanggan
          </div>
          <p className="text-xs text-[#1D4ED8]/80">
            Pelanggan akan mengesahkan atau menolak melalui pautan WhatsApp yang dikongsi.
          </p>
          {job.customers?.phone && (
            <Button onClick={handleWhatsAppShare} disabled={sharing} className="text-white rounded-lg gap-2" style={{ backgroundColor: '#25D366' }}>
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              Kongsi Semula via WhatsApp
            </Button>
          )}
        </div>
      )}

      {reportStatus === 'accepted' && (
        <div className="bg-[#DCFCE7] border border-[#BBF7D0] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#15803D] text-sm font-semibold">
            <CheckCircle className="h-5 w-5" />
            Laporan Disahkan oleh Pelanggan — Kerja Selesai
          </div>
          {acceptedAt && (
            <p className="text-xs text-[#15803D]/80">Disahkan pada {formatDateTimeMs(acceptedAt)}</p>
          )}
          <Button onClick={() => navigate(`/invoices/new?job_id=${jobId}`)} size="sm" className="rounded-lg gap-2">
            <Receipt className="h-4 w-4" /> Buat Invois
          </Button>
        </div>
      )}

      {reportStatus === 'rejected' && (
        <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#B91C1C] text-sm font-semibold">
            <XCircle className="h-5 w-5" />
            Laporan Ditolak oleh Pelanggan
          </div>
          {rejectionReason && (
            <p className="text-sm text-[#B91C1C]">Sebab: {rejectionReason}</p>
          )}
          <p className="text-xs text-[#B91C1C]/80">Anda boleh mengubah suai laporan dan hantar semula.</p>
        </div>
      )}

      {/* SUBMITTED VIEW — polished WorkTrace-style report */}
      {isSubmitted && (
        <CompletionReportView
          report={{
            report_number: reportNumber,
            completion_date: completionDate,
            technician_name: technicianName,
            work_description: workDescription,
            materials_used: materialsUsed,
            customer_signature: customerSignature,
            notes,
            status: reportStatus,
            accepted_at: acceptedAt,
            before_photos: beforePhotos,
            after_photos: afterPhotos,
            location_label: locationLabel,
            project_ref: projectRef,
            checklist: parseChecklist(checklistText),
            photo_captions: { before: beforeCaptions, after: afterCaptions },
          }}
          job={job ? { job_number: job.job_number, title: job.title, category: job.category } : null}
          customer={job?.customers ? { name: job.customers.name, phone: job.customers.phone, address: job.customers.address } : null}
          company={{ company_name: profile?.company_name || null, logo_url: profile?.logo_url || null }}
        />
      )}

      {/* EDIT MODE — form */}
      {!isSubmitted && (
        <>
          {/* Job Info (read-only) */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Maklumat Kerja</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-xs text-muted-foreground">Nombor Kerja</p><p className="font-medium text-foreground">{job.job_number}</p></div>
              <div><p className="text-xs text-muted-foreground">Tajuk</p><p className="text-foreground">{job.title}</p></div>
              <div><p className="text-xs text-muted-foreground">Pelanggan</p><p className="text-foreground">{job.customers?.name || '-'}</p></div>
              <div><p className="text-xs text-muted-foreground">Kategori</p><p className="text-foreground">{job.category}</p></div>
            </div>
          </div>

          {/* Completion Date */}
          <div className="space-y-1.5">
            <Label>Tarikh Siap Kerja *</Label>
            <Input type="date" value={completionDate} onChange={e => { setCompletionDate(e.target.value); setErrors(p => ({ ...p, completionDate: '' })); }} />
            {errors.completionDate && <p className="text-xs text-destructive">{errors.completionDate}</p>}
          </div>

          {/* Technician Name */}
          <div className="space-y-1.5">
            <Label>Nama Juruteknik *</Label>
            <Input value={technicianName} onChange={e => { setTechnicianName(e.target.value); setErrors(p => ({ ...p, technicianName: '' })); }} placeholder="Nama pekerja/juruteknik" />
            {errors.technicianName && <p className="text-xs text-destructive">{errors.technicianName}</p>}
          </div>

          {/* Location & Project Ref (optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Lokasi / Kawasan <span className="text-xs text-muted-foreground font-normal">(opsional)</span></Label>
              <Input value={locationLabel} onChange={e => setLocationLabel(e.target.value)} placeholder="cth: Tingkat 3, Bilik MEP" />
            </div>
            <div className="space-y-1.5">
              <Label>Rujukan Projek <span className="text-xs text-muted-foreground font-normal">(opsional)</span></Label>
              <Input value={projectRef} onChange={e => setProjectRef(e.target.value)} placeholder="cth: PRJ-2026-001" />
            </div>
          </div>

          {/* Work Description */}
          <div className="space-y-1.5">
            <Label>Penerangan Kerja yang Dilaksanakan *</Label>
            <Textarea value={workDescription} onChange={e => { setWorkDescription(e.target.value); setErrors(p => ({ ...p, workDescription: '' })); }} rows={5} placeholder="Huraikan kerja yang telah dilaksanakan secara terperinci..." />
            {errors.workDescription && <p className="text-xs text-destructive">{errors.workDescription}</p>}
          </div>

          {/* Materials */}
          <div className="space-y-1.5">
            <Label>Bahan/Alatan Digunakan</Label>
            <Textarea value={materialsUsed} onChange={e => setMaterialsUsed(e.target.value)} rows={3} placeholder="Senaraikan bahan atau alatan yang digunakan..." />
          </div>

          {/* Before Photos */}
          <PhotoSection
            kind="before"
            label="📷 Gambar Sebelum Kerja"
            badge={{ text: 'Opsional', className: 'bg-amber-100 text-amber-700' }}
            helper="Gambar keadaan sebelum kerja bermula untuk perbandingan"
            photos={beforePhotos}
            captions={beforeCaptions}
            uploading={uploadingPhoto}
            disabled={false}
            onUpload={(e) => handlePhotoUpload(e, 'before')}
            onRemove={(i) => removePhoto('before', i)}
            onCaption={(i, v) => setCaption('before', i, v)}
          />

          {/* After Photos */}
          <PhotoSection
            kind="after"
            label="📷 Gambar Selepas Kerja"
            badge={{ text: 'Wajib — min 1 gambar', className: 'bg-red-100 text-red-700' }}
            helper="Gambar hasil akhir kerja yang telah disiapkan"
            photos={afterPhotos}
            captions={afterCaptions}
            uploading={uploadingPhoto}
            disabled={false}
            onUpload={(e) => handlePhotoUpload(e, 'after')}
            onRemove={(i) => removePhoto('after', i)}
            onCaption={(i, v) => setCaption('after', i, v)}
            error={errors.photos}
          />

          {/* Checklist (optional) */}
          <div className="space-y-1.5">
            <Label>Senarai Semak Siap Kerja <span className="text-xs text-muted-foreground font-normal">(opsional)</span></Label>
            <Textarea
              value={checklistText}
              onChange={e => setChecklistText(e.target.value)}
              rows={4}
              placeholder={`Satu item setiap baris. Contoh:\n[x] Pemasangan disiapkan\n[x] Ujian tekanan lulus\n[ ] Lukisan as-built (pending)`}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Gunakan <code className="bg-muted px-1 rounded">[x]</code> untuk siap, <code className="bg-muted px-1 rounded">[ ]</code> untuk pending. Teks biasa dikira siap.
            </p>
          </div>

          {/* Customer Signature */}
          <div className="space-y-1.5">
            <Label>Pengesahan Pelanggan (opsional)</Label>
            <Input value={customerSignature} onChange={e => setCustomerSignature(e.target.value)} placeholder="Nama pelanggan sebagai pengesahan" />
            <p className="text-[11px] text-muted-foreground">Minta pelanggan taip nama sebagai tanda pengesahan kerja siap</p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Nota Tambahan / Catatan Tapak</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Sebarang catatan atau nota juruteknik..." />
          </div>
        </>
      )}

      {/* Actions */}
      {!isSubmitted && (
        <div className="flex flex-col gap-2">
          <Button onClick={() => handleSave('submitted')} disabled={submitting} className="rounded-lg">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Menghantar...</> : 'Hantar Laporan'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="flex-1 rounded-lg">
              {saving ? 'Menyimpan...' : 'Simpan Draf'}
            </Button>
            <Button variant="outline" onClick={handlePreview} className="flex-1 rounded-lg gap-2">
              <Eye className="h-4 w-4" /> Pratonton PDF
            </Button>
          </div>
          {reportId && (
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg gap-2"
            >
              <Trash2 className="h-4 w-4" /> Padam Laporan
            </Button>
          )}
        </div>
      )}

      {isSubmitted && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePreview} className="rounded-lg gap-2">
            <Eye className="h-4 w-4" /> Pratonton PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => { setIsSubmitted(false); toast.info('Mod edit dibuka. Hantar semula selepas perubahan.'); }}
            className="rounded-lg gap-2"
          >
            <Edit className="h-4 w-4" /> Edit Laporan
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteOpen(true)}
            className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg gap-2"
          >
            <Trash2 className="h-4 w-4" /> Padam
          </Button>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Padam Laporan Siap Kerja?"
        body="Tindakan ini tidak boleh dibatalkan. Laporan dan semua maklumatnya akan dipadam."
        confirmLabel={deleting ? 'Memadam...' : 'Padam'}
        confirmVariant="danger"
        isLoading={deleting}
      />

      <PDFPreviewModal
        open={previewOpen}
        title={`Pratonton — ${reportNumber}`}
        loading={previewLoading}
        fileUrl={previewUrl}
        onClose={() => { setPreviewOpen(false); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
        onDownload={async () => {
          if (!previewUrl) return;
          const a = document.createElement('a');
          a.href = previewUrl;
          a.download = `Laporan-${reportNumber}.pdf`;
          a.click();
        }}
      />
    </div>
  );
}

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
}

function PhotoSection({ label, badge, helper, photos, captions = [], uploading, disabled, onUpload, onRemove, onCaption, error }: PhotoSectionProps) {
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
              <img src={url} alt={`${label} ${i + 1}`} className="w-full h-[100px] object-cover rounded-lg border border-border" />
              {!disabled && (
                <button type="button" onClick={() => onRemove(i)} className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-white rounded-full flex items-center justify-center text-xs">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {onCaption && !disabled && (
              <Input
                value={captions[i] || ''}
                onChange={e => onCaption(i, e.target.value)}
                placeholder="Caption (opsional)"
                className="h-7 text-[11px] px-2"
              />
            )}
          </div>
        ))}
        {photos.length < 10 && !disabled && (
          uploading ? (
            <div className="h-[100px] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground mt-1">Memuat naik...</span>
            </div>
          ) : (
            <>
              <label className="h-[100px] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors">
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground mt-1">Kamera</span>
                <input type="file" accept="image/*" capture="environment" onChange={onUpload} className="hidden" disabled={disabled} />
              </label>
              <label className="h-[100px] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground mt-1">Galeri</span>
                <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" disabled={disabled} />
              </label>
            </>
          )
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, Edit, Trash2, Eye, MessageCircle, Loader2,
  CalendarDays, MapPin, User as UserIcon, FileText, ClipboardCheck
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import WorkOrderPDF from '@/components/pdf/WorkOrderPDF';
import PDFPreviewModal from '@/components/pdf/PDFPreviewModal';
import { autoUpdateJobStatus } from '@/utils/autoUpdateJobStatus';
import { imageUrlToBase64 } from '@/utils/imageToBase64';
import { usePlanGate } from '@/hooks/usePlanGate';
import { getOrCreateApprovalToken, buildPublicApprovalUrl } from '@/lib/approvals';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-[#F1F5F9] text-[#64748B]',
  Sent: 'bg-[#DBEAFE] text-[#1D4ED8]',
  Accepted: 'bg-[#DCFCE7] text-[#15803D]',
  Rejected: 'bg-[#FEE2E2] text-[#B91C1C]',
};

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string | null) {
  if (!d) return '-';
  const dt = new Date(d);
  return `${dt.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })} ${dt.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '60' + cleaned.slice(1);
  if (!cleaned.startsWith('60')) cleaned = '60' + cleaned;
  return cleaned;
}

export default function WorkOrderDetailPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [wo, setWo] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [quotation, setQuotation] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [acting, setActing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [logoBase64, setLogoBase64] = useState('');
  const [sharing, setSharing] = useState(false);
  const { canShowLogo, checkWhatsAppShare } = usePlanGate();

  useEffect(() => {
    if (profile?.logo_url) imageUrlToBase64(profile.logo_url).then(setLogoBase64);
  }, [profile?.logo_url]);

  const load = async () => {
    if (!user || !jobId) return;
    setLoading(true);
    const [woRes, jobRes, quoRes, reportRes] = await Promise.all([
      supabase.from('work_orders').select('*')
        .eq('job_id', jobId).eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('jobs').select('id, job_number, title, customers(name, phone, email, address)')
        .eq('id', jobId).single(),
      supabase.from('quotations').select('id, quote_number, status')
        .eq('job_id', jobId).eq('user_id', user.id).maybeSingle(),
      supabase.from('completion_reports').select('id, status, report_number')
        .eq('job_id', jobId).eq('user_id', user.id).maybeSingle(),
    ]);
    setWo(woRes.data);
    setJob(jobRes.data);
    setQuotation(quoRes.data);
    setReport(reportRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, jobId]);

  const buildPdfData = () => ({
    wo: {
      wo_number: wo.wo_number,
      title: wo.title,
      scope_of_work: wo.scope_of_work,
      scheduled_start_date: wo.scheduled_start_date,
      scheduled_end_date: wo.scheduled_end_date,
      estimated_duration: wo.estimated_duration,
      location: wo.location,
      technician_name: wo.technician_name,
      special_instructions: wo.special_instructions,
      terms: wo.terms,
      status: wo.status,
      items: Array.isArray(wo.items) ? wo.items : [],
      total: Number(wo.total) || 0,
      created_at: wo.created_at,
    },
    job: job ? { job_number: job.job_number, title: job.title } : null,
    quotation: quotation ? { quote_number: quotation.quote_number } : null,
    customer: job?.customers || null,
    company: {
      company_name: profile?.company_name || null,
      phone: profile?.phone || null,
      address: profile?.address || null,
      logo_url: canShowLogo ? (profile?.logo_url || null) : null,
      logo_base64: canShowLogo ? logoBase64 : '',
      ssm_number_new: profile?.ssm_number_new || null,
      ssm_number_old: profile?.ssm_number_old || null,
    },
  });

  // Customer accept/reject is handled via PublicApprovalPage (WhatsApp link).


  const handleDelete = async () => {
    if (!wo) return;
    setActing(true);
    try {
      await supabase.from('work_orders').delete().eq('id', wo.id);
      toast.success('Work Order dipadam');
      navigate(`/jobs/${jobId}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActing(false);
    }
  };

  const handlePreview = async () => {
    if (!wo) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const blob = await pdf(<WorkOrderPDF {...buildPdfData()} />).toBlob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleShare = async () => {
    if (!wo || !job?.customers?.phone || !user) return;
    if (!checkWhatsAppShare()) return;
    setSharing(true);
    try {
      const blob = await pdf(<WorkOrderPDF {...buildPdfData()} />).toBlob();
      const fileName = `${user.id}/${wo.wo_number}.pdf`;
      await supabase.storage.from('work-order-pdfs').upload(fileName, blob, { contentType: 'application/pdf', upsert: true });
      const { data: signed } = await supabase.storage.from('work-order-pdfs').createSignedUrl(fileName, 60 * 60 * 24 * 365);
      const pdfUrl = signed?.signedUrl ?? '';
      const token = await getOrCreateApprovalToken({
        userId: user.id,
        documentId: wo.id,
        documentType: 'work_order',
        customerName: job.customers.name,
        customerEmail: job.customers.email || null,
        pdfUrl,
        expiresInDays: 30,
      });
      const approvalUrl = buildPublicApprovalUrl(token);
      const phone = formatPhone(job.customers.phone);
      const companyName = profile?.company_name || '';
      const msg =
`Assalamualaikum / Salam Sejahtera ${job.customers.name},

Terima kasih atas kepercayaan anda. 🙏

Berikut adalah Work Order daripada *${companyName}*:

📋 *No. Work Order:* ${wo.wo_number}
🔨 *Tajuk Kerja:* ${wo.title}
📅 *Tarikh Mula:* ${formatDate(wo.scheduled_start_date)}
📍 *Lokasi:* ${wo.location || '-'}

Sila klik pautan di bawah untuk *melihat & mengesahkan* work order:
🔗 ${approvalUrl}

Anda boleh klik *Terima* atau *Tolak* terus dari pautan tersebut.

Terima kasih!
*${companyName}*`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      // Auto-mark as Sent if Draft
      if (wo.status === 'Draft') {
        await supabase.from('work_orders').update({ status: 'Sent' }).eq('id', wo.id);
        await load();
      }
    } catch {
      toast.error('Gagal kongsi');
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return <div className="p-4 md:p-6 space-y-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-48 w-full rounded-xl" /></div>;
  }

  if (!wo) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p className="text-muted-foreground mb-4">Tiada Work Order untuk kerja ini.</p>
        <Button onClick={() => navigate(`/jobs/${jobId}/work-order/new`)} className="rounded-lg">Buat Work Order</Button>
      </div>
    );
  }

  const items = Array.isArray(wo.items) ? wo.items : [];

  return (
    <div className="p-4 md:p-6 space-y-4 pb-28 md:pb-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/jobs/${jobId}`)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{wo.wo_number}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[wo.status]}`}>{wo.status}</span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{wo.title}</p>
        </div>
      </div>

      {/* Status banners */}
      {wo.status === 'Sent' && (
        <div className="bg-[#DBEAFE] border border-[#93C5FD] rounded-xl p-4">
          <div className="inline-flex items-center gap-2 bg-white/70 text-[#1D4ED8] text-sm font-medium px-3 py-1.5 rounded-full">
            <Loader2 className="h-4 w-4 animate-spin" />
            Menunggu Pengesahan Pelanggan
          </div>
          <p className="text-xs text-[#1D4ED8]/80 mt-2">
            Pelanggan akan mengesahkan atau menolak melalui pautan WhatsApp yang dikongsi.
          </p>
        </div>
      )}

      {wo.status === 'Accepted' && (
        <div className="bg-[#DCFCE7] border border-[#BBF7D0] rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-[#15803D]">✓ Work Order Diterima — Kerja boleh dimulakan</p>
          {wo.accepted_at && (
            <p className="text-xs text-[#15803D]/80">Disahkan pada {formatDateTime(wo.accepted_at)}</p>
          )}
          {!report && (
            <Button onClick={() => navigate(`/jobs/${jobId}/completion-report`)} size="sm" className="rounded-lg gap-1.5">
              <ClipboardCheck className="h-4 w-4" /> Buat Laporan Siap Kerja
            </Button>
          )}
        </div>
      )}

      {wo.status === 'Rejected' && (
        <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-[#B91C1C]">✕ Work Order Ditolak</p>
          {wo.rejection_reason && <p className="text-sm text-[#B91C1C]">Sebab: {wo.rejection_reason}</p>}
          <Button onClick={() => navigate(`/jobs/${jobId}/work-order/new`)} size="sm" className="rounded-lg">
            Buat Work Order Baru
          </Button>
        </div>
      )}

      {/* Details */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Maklumat</p>
        {job && (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <button onClick={() => navigate(`/jobs/${jobId}`)} className="text-sm text-primary font-medium hover:underline">
              {job.job_number}
            </button>
          </div>
        )}
        {job?.customers && (
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{job.customers.name}</span>
          </div>
        )}
        {wo.scheduled_start_date && (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Mula: {formatDate(wo.scheduled_start_date)}{wo.scheduled_end_date ? ` — Siap: ${formatDate(wo.scheduled_end_date)}` : ''}</span>
          </div>
        )}
        {wo.location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{wo.location}</span>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Skop Kerja</p>
        <p className="text-sm whitespace-pre-wrap text-foreground">{wo.scope_of_work}</p>
      </div>

      {items.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Item Kerja</p>
          {items.map((it: any, i: number) => (
            <div key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
              <span>{it.description} × {it.qty}</span>
              <span className="font-medium">RM {((Number(it.qty) || 0) * (Number(it.unit_price) || 0)).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="font-bold">Jumlah</span>
            <span className="font-bold text-primary">RM {Number(wo.total || 0).toFixed(2)}</span>
          </div>
        </div>
      )}

      {wo.special_instructions && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Arahan Khas</p>
          <p className="text-sm whitespace-pre-wrap">{wo.special_instructions}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handlePreview} className="rounded-lg gap-2"><Eye className="h-4 w-4" /> Pratonton PDF</Button>
        {job?.customers?.phone && (
          <Button onClick={handleShare} disabled={sharing} className="text-white rounded-lg gap-2" style={{ backgroundColor: '#25D366' }}>
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            Kongsi via WhatsApp
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate(`/jobs/${jobId}/work-order/new?wo_id=${wo.id}`)} className="rounded-lg gap-2">
          <Edit className="h-4 w-4" /> Edit
        </Button>
        <Button variant="outline" onClick={() => setDeleteOpen(true)} className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg gap-2">
          <Trash2 className="h-4 w-4" /> Padam
        </Button>
      </div>


      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Padam Work Order?</DialogTitle>
            <DialogDescription>Tindakan ini tidak boleh dibatalkan.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={acting}>{acting ? 'Memadam...' : 'Padam'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PDFPreviewModal
        open={previewOpen}
        title={`Pratonton — ${wo.wo_number}`}
        loading={previewLoading}
        fileUrl={previewUrl}
        onClose={() => { setPreviewOpen(false); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
        onDownload={() => {
          if (!previewUrl) return;
          const a = document.createElement('a');
          a.href = previewUrl;
          a.download = `WorkOrder-${wo.wo_number}.pdf`;
          a.click();
        }}
      />
    </div>
  );
}

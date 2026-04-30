import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '@/i18n';
import { usePlanGate } from '@/hooks/usePlanGate';
import UpgradeModal from '@/components/UpgradeModal';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ArrowLeft, MoreVertical, Edit, Trash2, User, Briefcase, CalendarDays, MessageCircle, FileText, Download, Loader2, Eye, AlertTriangle, X, ChevronDown } from 'lucide-react';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import QuotationPDF from '@/components/pdf/QuotationPDF';
import PDFPreviewModal from '@/components/pdf/PDFPreviewModal';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { imageUrlToBase64 } from '@/utils/imageToBase64';
import { autoUpdateJobStatus } from '@/utils/autoUpdateJobStatus';
import { generateAndIncrement } from '@/utils/generateDocNumber';
import { getOrCreateApprovalToken, buildPublicApprovalUrl } from '@/lib/approvals';
import { renderTemplate } from '@/lib/whatsappTemplates';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-[#F1F5F9] text-[#64748B]',
  Sent: 'bg-[#DBEAFE] text-[#1D4ED8]',
  Accepted: 'bg-[#DCFCE7] text-[#15803D]',
  Rejected: 'bg-[#FEE2E2] text-[#B91C1C]',
};

interface LineItem {
  description: string;
  qty: number;
  unit_price: number;
}

interface Quotation {
  id: string;
  quote_number: string;
  status: string;
  items: LineItem[];
  subtotal: number;
  discount: number;
  tax_rate: number;
  total: number;
  notes: string | null;
  terms: string | null;
  valid_until: string | null;
  created_at: string;
  job_id: string | null;
  jobs: {
    id: string;
    job_number: string;
    title: string;
    customer_id: string | null;
  } | null;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '60' + cleaned.slice(1);
  if (!cleaned.startsWith('60')) cleaned = '60' + cleaned;
  return cleaned;
}

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [autoShareDone, setAutoShareDone] = useState(false);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [existingInvoiceDialog, setExistingInvoiceDialog] = useState<{ id: string; invoice_number: string; status: string; total: number } | null>(null);
  const [logoBase64, setLogoBase64] = useState<string>('');
  const { checkWhatsAppShare, canShowLogo, upgradeOpen, setUpgradeOpen, upgradeReason } = usePlanGate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!user || !id) return;
    async function fetch() {
      const { data } = await supabase.from('quotations')
        .select('*, jobs(id, job_number, title, customer_id, customers(name, phone, email, address, tin_number))')
        .eq('id', id)
        .single();
      if (data) {
        const q = data as any;
        setQuotation({
          ...q,
          items: Array.isArray(q.items) ? q.items : [],
          subtotal: Number(q.subtotal) || 0,
          discount: Number(q.discount) || 0,
          tax_rate: Number(q.tax_rate) || 0,
          total: Number(q.total) || 0,
        });
      }
      setLoading(false);
    }
    fetch();
  }, [user, id]);

  useEffect(() => {
    if (profile?.logo_url) {
      imageUrlToBase64(profile.logo_url).then(setLogoBase64);
    }
  }, [profile?.logo_url]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!previewOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closePreview(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [previewOpen]);

  const updateStatus = async (newStatus: string) => {
    if (!quotation || !user) return;
    const { error } = await supabase.from('quotations').update({ status: newStatus }).eq('id', quotation.id);
    if (error) { toast.error(error.message); return; }
    setQuotation({ ...quotation, status: newStatus });
    const messages: Record<string, string> = {
      Sent: t('quotationDetail.statusSent'),
      Accepted: t('quotationDetail.statusAccepted'),
      Rejected: t('quotationDetail.statusRejected'),
    };
    toast.success(messages[newStatus] || t('quotationDetail.statusUpdated'));

    // Auto-update job status
    if (quotation.job_id) {
      let trigger: 'quotation_sent' | 'quotation_accepted' | 'quotation_rejected' | undefined;
      if (newStatus === 'Sent') trigger = 'quotation_sent';
      else if (newStatus === 'Accepted') trigger = 'quotation_accepted';
      else if (newStatus === 'Rejected') trigger = 'quotation_rejected';
      if (trigger) {
        const newJobStatus = await autoUpdateJobStatus(supabase, quotation.job_id, user.id, trigger);
        if (newJobStatus) {
          toast.info(t('quotationDetail.jobAutoUpdated', { status: newJobStatus }));
        }
      }
    }
  };

  const handleDelete = async () => {
    if (!quotation) return;
    setDeleting(true);
    const { error } = await supabase.from('quotations').delete().eq('id', quotation.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('quotationDetail.deleted'));
    navigate('/quotations');
  };

  const handleConvertToInvoice = async () => {
    if (!quotation) return;
    if (quotation.job_id) {
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total')
        .eq('job_id', quotation.job_id)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (existingInvoice) {
        setExistingInvoiceDialog({
          id: existingInvoice.id,
          invoice_number: existingInvoice.invoice_number,
          status: existingInvoice.status,
          total: Number(existingInvoice.total) || 0,
        });
        return;
      }
    }
    await createInvoiceFromQuotation();
  };

  const createInvoiceFromQuotation = async () => {
    if (!quotation) return;
    setConverting(true);
    try {
      const invoiceNumber = await generateAndIncrement(supabase, user!.id, 'invoice');
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const { data, error } = await supabase.from('invoices').insert({
        user_id: user!.id,
        job_id: quotation.job_id,
        customer_id: quotation.jobs?.customer_id || null,
        quote_id: quotation.id,
        invoice_number: invoiceNumber,
        items: quotation.items as any,
        subtotal: quotation.subtotal,
        discount: quotation.discount,
        tax_rate: quotation.tax_rate,
        total: quotation.total,
        status: 'Draft',
        due_date: dueDate.toISOString().slice(0, 10),
        notes: quotation.notes,
      }).select('id').single();
      if (error) throw error;
      toast.success(t('quotationDetail.invoiceCreated'));
      navigate(`/invoices/${data.id}`);
    } catch (err: any) {
      toast.error(err.message || t('quotationDetail.invoiceCreateError'));
    } finally {
      setConverting(false);
    }
  };

  const pdfData = quotation ? {
    quotation: {
      quote_number: quotation.quote_number,
      created_at: quotation.created_at,
      valid_until: quotation.valid_until,
      status: quotation.status,
      items: quotation.items.map(item => ({
        description: item.description,
        qty: item.qty,
        unit_price: Number(item.unit_price) || 0,
        amount: (item.qty || 0) * (Number(item.unit_price) || 0),
      })),
      subtotal: quotation.subtotal,
      discount: quotation.discount,
      tax_rate: quotation.tax_rate,
      total: quotation.total,
      notes: quotation.notes,
      terms: quotation.terms || profile?.quotation_terms || null,
    },
    job: quotation.jobs ? { job_number: quotation.jobs.job_number, title: quotation.jobs.title } : null,
    customer: (quotation.jobs as any)?.customers ? {
      name: (quotation.jobs as any).customers.name,
      phone: (quotation.jobs as any).customers.phone,
      email: (quotation.jobs as any).customers.email,
      address: (quotation.jobs as any).customers.address,
    } : null,
    company: {
      company_name: profile?.company_name || null,
      phone: profile?.phone || null,
      address: profile?.address || null,
      logo_url: canShowLogo ? (profile?.logo_url || null) : null,
      logo_base64: canShowLogo ? logoBase64 : '',
      ssm_number_new: profile?.ssm_number_new || null,
      ssm_number_old: profile?.ssm_number_old || null,
    },
  } : null;

  const customerPhone = (quotation?.jobs as any)?.customers?.phone || null;
  const hasPhone = !!customerPhone;

  const buildWhatsAppMessage = (customerName: string, quoteNumber: string, total: number, companyName: string, approvalUrl: string) => {
    const details = t('quotationDetail.waDetails', { number: quoteNumber, total: total.toFixed(2), url: approvalUrl });
    return renderTemplate(
      (profile as any)?.whatsapp_templates,
      'quotation',
      { customer_name: customerName, company_name: companyName },
      details,
    );
  };

  const shareViaWhatsApp = async () => {
    if (!checkWhatsAppShare()) return;
    if (!quotation || !pdfData || !user || !hasPhone) return;
    setIsSharing(true);
    try {
      const blob = await pdf(<QuotationPDF {...pdfData} />).toBlob();
      const fileName = `${user.id}/${quotation.quote_number}.pdf`;
      await supabase.storage.from('quotation-pdfs').upload(fileName, blob, { contentType: 'application/pdf', upsert: true });
      const { data: signed } = await supabase.storage.from('quotation-pdfs').createSignedUrl(fileName, 60 * 60 * 24 * 365);
      const pdfUrl = signed?.signedUrl ?? '';
      const customerName = (quotation.jobs as any)?.customers?.name || '';
      const customerEmail = (quotation.jobs as any)?.customers?.email || null;
      const token = await getOrCreateApprovalToken({
        userId: user.id,
        documentId: quotation.id,
        documentType: 'quotation',
        customerName,
        customerEmail,
        pdfUrl,
        expiresInDays: quotation.valid_until ? undefined : 30,
      });
      const approvalUrl = buildPublicApprovalUrl(token);
      const phone = customerPhone.replace(/\D/g, '').replace(/^0/, '60');
      const companyName = profile?.company_name || '';
      const message = buildWhatsAppMessage(customerName, quotation.quote_number, quotation.total, companyName, approvalUrl);
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      // Auto-mark as Sent if currently Draft
      if (quotation.status === 'Draft') {
        await supabase.from('quotations').update({ status: 'Sent' }).eq('id', quotation.id);
        setQuotation({ ...quotation, status: 'Sent' });
      }
      toast.success('Pautan pengesahan dijana! WhatsApp telah dibuka.');
    } catch {
      toast.error('Gagal menjana pautan. Semak sambungan internet anda.');
    } finally {
      setIsSharing(false);
    }
  };

  // Auto-trigger WhatsApp share when arriving with ?share=1 (e.g. from Sent action in form)
  useEffect(() => {
    if (autoShareDone) return;
    if (searchParams.get('share') !== '1') return;
    if (!quotation || !pdfData || !user || !hasPhone) return;
    setAutoShareDone(true);
    // Clear the param so it doesn't re-trigger on refresh
    const next = new URLSearchParams(searchParams);
    next.delete('share');
    setSearchParams(next, { replace: true });
    shareViaWhatsApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotation, pdfData, user, hasPhone, searchParams, autoShareDone]);

  const handlePreview = async () => {
    if (!pdfData) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const blob = await pdf(<QuotationPDF {...pdfData} />).toBlob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      toast.error('Gagal menjana pratonton PDF');
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
    if (!pdfData || !quotation) return;
    const blob = await pdf(<QuotationPDF {...pdfData} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SebuthHarga-${quotation.quote_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isExpired = quotation?.valid_until && new Date(quotation.valid_until) < new Date();
  const whatsappUrl = hasPhone ? `https://wa.me/${formatPhone(customerPhone)}` : null;
  const canEdit = quotation && quotation.status !== 'Rejected';

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p className="text-muted-foreground">Sebut harga tidak dijumpai.</p>
        <Button variant="outline" onClick={() => navigate('/quotations')} className="mt-4">Kembali</Button>
      </div>
    );
  }

  const afterDiscount = quotation.subtotal - quotation.discount;
  const sstAmount = quotation.tax_rate > 0 ? afterDiscount * (quotation.tax_rate / 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-4 pb-28 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/quotations')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{quotation.quote_number}</h1>
            <div className="relative inline-flex items-center">
              <select
                value={quotation.status}
                onChange={(e) => updateStatus(e.target.value)}
                className={`appearance-none cursor-pointer rounded-full py-1 pl-3 pr-7 text-[13px] font-medium border-0 outline-none ${STATUS_COLORS[quotation.status]}`}
                style={{ WebkitAppearance: 'none' }}
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-2 h-3 w-3 pointer-events-none opacity-60" />
            </div>
            {isExpired && quotation.status !== 'Accepted' && quotation.status !== 'Rejected' && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#B91C1C]">Tamat Tempoh</span>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <DropdownMenuItem onClick={() => navigate(`/quotations/${quotation.id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" /> Edit Sebut Harga
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Padam
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Info */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        {(quotation.jobs as any)?.customers && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{(quotation.jobs as any).customers.name}</span>
          </div>
        )}
        {quotation.jobs && (
          <button onClick={() => navigate(`/jobs/${quotation.jobs!.id}`)} className="flex items-center gap-2 text-sm hover:underline">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span className="text-primary font-medium">{quotation.jobs.job_number}</span>
            <span className="text-muted-foreground">— {quotation.jobs.title}</span>
          </button>
        )}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Dicipta</p>
            <p className="text-foreground">{formatDate(quotation.created_at)}</p>
          </div>
          {quotation.valid_until && (
            <div>
              <p className="text-xs text-muted-foreground">Sah Hingga</p>
              <p className="text-foreground">{formatDate(quotation.valid_until)}</p>
            </div>
          )}
        </div>
        {quotation.notes && (
          <div>
            <p className="text-xs text-muted-foreground">Nota</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{quotation.notes}</p>
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Item Kerja</p>
        <div className="hidden md:block">
          <div className="grid grid-cols-[1fr_60px_100px_100px] gap-2 text-xs font-medium text-muted-foreground mb-1">
            <span>Penerangan</span><span>Qty</span><span>Harga</span><span className="text-right">Jumlah</span>
          </div>
          {quotation.items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_60px_100px_100px] gap-2 py-1.5 border-b border-border last:border-0 text-sm">
              <span className="text-foreground">{item.description}</span>
              <span className="text-foreground">{item.qty}</span>
              <span className="text-foreground">RM {(Number(item.unit_price) || 0).toFixed(2)}</span>
              <span className="text-right font-medium text-foreground">RM {((item.qty || 0) * (Number(item.unit_price) || 0)).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="md:hidden space-y-2">
          {quotation.items.map((item, i) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium text-foreground">{item.description}</p>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{item.qty} × RM {(Number(item.unit_price) || 0).toFixed(2)}</span>
                <span className="font-medium text-foreground">RM {((item.qty || 0) * (Number(item.unit_price) || 0)).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>RM {quotation.subtotal.toFixed(2)}</span></div>
          {quotation.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Diskaun</span><span>− RM {quotation.discount.toFixed(2)}</span></div>}
          {quotation.tax_rate > 0 && <div className="flex justify-between"><span className="text-muted-foreground">SST ({quotation.tax_rate}%)</span><span>+ RM {sstAmount.toFixed(2)}</span></div>}
          <div className="flex justify-between border-t border-border pt-2">
            <span className="font-bold text-foreground">Jumlah Keseluruhan</span>
            <span className="text-lg font-bold text-primary">RM {quotation.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {quotation.status === 'Draft' && (
          <>
            <Button onClick={() => navigate(`/quotations/${quotation.id}/edit`)} variant="outline" className="flex-1 rounded-lg gap-2">
              <Edit className="h-4 w-4" /> Edit
            </Button>
            <Button onClick={() => updateStatus('Sent')} className="flex-1 rounded-lg">Hantar</Button>
          </>
        )}
        {quotation.status === 'Sent' && (
          <>
            <Button onClick={() => navigate(`/quotations/${quotation.id}/edit`)} variant="outline" className="flex-1 rounded-lg gap-2">
              <Edit className="h-4 w-4" /> Edit
            </Button>
            <Button disabled className="flex-1 rounded-lg gap-2 bg-amber-500 text-white opacity-90 cursor-not-allowed hover:bg-amber-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Menunggu Pengesahan Pelanggan
            </Button>
            <Button onClick={() => updateStatus('Rejected')} variant="outline" className="flex-1 rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10">Ditolak</Button>
          </>
        )}
        {quotation.status === 'Accepted' && (
          <>
            <Button onClick={() => navigate(`/quotations/${quotation.id}/edit`)} variant="outline" className="flex-1 rounded-lg gap-2">
              <Edit className="h-4 w-4" /> Edit
            </Button>
            <Button onClick={() => navigate(`/jobs/${quotation.job_id}/completion-report`)} disabled={!quotation.job_id} className="flex-1 rounded-lg gap-2">
              <Briefcase className="h-4 w-4" /> Isi Laporan Siap Kerja
            </Button>
          </>
        )}
        {quotation.status === 'Rejected' && (
          <div className="w-full space-y-3">
            <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-[#B45309] shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-[#B45309]">Sebut harga yang ditolak tidak boleh diedit. Sila buat sebut harga baru.</p>
            </div>
            <Button onClick={() => navigate(`/quotations/new?job_id=${quotation.job_id}`)} variant="outline" className="w-full rounded-lg">Buat Sebut Harga Baru</Button>
          </div>
        )}
      </div>

      {/* WhatsApp Share + PDF Preview + PDF Download */}
      <div className="flex flex-col gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button onClick={shareViaWhatsApp} disabled={isSharing || !hasPhone} className="w-full rounded-lg gap-2 text-white" style={{ backgroundColor: '#25D366' }}>
                  {isSharing ? <><Loader2 className="h-4 w-4 animate-spin" /> Menjana PDF...</> : <><MessageCircle className="h-4 w-4" /> Kongsi via WhatsApp</>}
                </Button>
              </div>
            </TooltipTrigger>
            {!hasPhone && <TooltipContent>Nombor telefon pelanggan tiada dalam rekod</TooltipContent>}
          </Tooltip>
        </TooltipProvider>

        {pdfData && (
          <>
            <Button variant="outline" onClick={handlePreview} className="w-full rounded-lg gap-2 text-primary border-primary/30">
              <Eye className="h-4 w-4" /> Pratonton PDF
            </Button>
            <PDFDownloadLink document={<QuotationPDF {...pdfData} />} fileName={`SebuthHarga-${quotation.quote_number}.pdf`}>
              {({ loading: pdfLoading }) => (
                <Button variant="outline" className="w-full rounded-lg gap-2 text-primary border-primary/30" disabled={pdfLoading}>
                  <Download className="h-4 w-4" /> {pdfLoading ? 'Menjana PDF...' : 'Muat Turun PDF'}
                </Button>
              )}
            </PDFDownloadLink>
          </>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Padam Sebut Harga?</DialogTitle>
            <DialogDescription>Tindakan ini tidak boleh dibatalkan.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? 'Memadam...' : 'Padam'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Existing Invoice Dialog */}
      <Dialog open={!!existingInvoiceDialog} onOpenChange={() => setExistingInvoiceDialog(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Invois Sudah Wujud</DialogTitle>
          </DialogHeader>
          {existingInvoiceDialog && (
            <div className="space-y-4">
              <div className="bg-[#F8FAFC] border border-border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">{existingInvoiceDialog.invoice_number}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1D4ED8]">{existingInvoiceDialog.status}</span>
                </div>
                <p className="text-sm font-semibold mt-1">RM {existingInvoiceDialog.total.toFixed(2)}</p>
              </div>
              <p className="text-sm text-muted-foreground">Kerja ini sudah mempunyai invois. Nak lihat atau buat baru?</p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => { navigate(`/invoices/${existingInvoiceDialog.id}`); setExistingInvoiceDialog(null); }} className="rounded-lg">Lihat Invois</Button>
                <Button variant="outline" onClick={() => { setExistingInvoiceDialog(null); createInvoiceFromQuotation(); }} className="rounded-lg">Buat Invois Baru</Button>
                <Button variant="ghost" onClick={() => setExistingInvoiceDialog(null)} className="rounded-lg">Batal</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PDFPreviewModal
        fileUrl={previewUrl}
        loading={previewLoading}
        onClose={closePreview}
        onDownload={handlePreviewDownload}
        onShare={() => {
          closePreview();
          shareViaWhatsApp();
        }}
        open={previewOpen}
        title={`Pratonton — ${quotation.quote_number}`}
      />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
    </div>
  );
}

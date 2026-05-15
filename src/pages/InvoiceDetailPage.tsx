import { useState, useEffect } from 'react';
import { openWhatsApp, buildWhatsAppUrl } from '@/lib/whatsapp';
import { useTranslation, Trans } from 'react-i18next';
import { getDateLocale } from '@/i18n';
import { usePlanGate } from '@/hooks/usePlanGate';
import UpgradeModal from '@/components/UpgradeModal';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  ArrowLeft, MoreVertical, Edit, Trash2, User, Briefcase, CalendarDays,
  MessageCircle, FileText, Download, Loader2, CheckCircle, Landmark, Eye, X, Copy, ChevronDown, Receipt as ReceiptIcon
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import InvoicePDF from '@/components/pdf/InvoicePDF';
import ReceiptPDF from '@/components/pdf/ReceiptPDF';
import PDFPreviewModal from '@/components/pdf/PDFPreviewModal';
import { embedPdfCompanyLogo, imageUrlToBase64 } from '@/utils/imageToBase64';
import { getOrCreatePaymentProofToken, buildPublicPaymentProofUrl } from '@/lib/approvals';
import { getOrCreateShortLink } from '@/lib/shortLinks';
import { renderTemplate } from '@/lib/whatsappTemplates';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-[#F1F5F9] text-[#64748B]',
  Sent: 'bg-[#DBEAFE] text-[#1D4ED8]',
  Paid: 'bg-[#DCFCE7] text-[#15803D]',
  Overdue: 'bg-[#FEE2E2] text-[#B91C1C]',
};

interface LineItem { description: string; description_detail?: string; qty: number; uom?: string; unit_price: number; }

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  items: LineItem[];
  subtotal: number;
  discount: number;
  tax_rate: number;
  total: number;
  notes: string | null;
  terms: string | null;
  issued_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  created_at: string;
  job_id: string | null;
  quote_id: string | null;
  lhdn_submitted: boolean;
  selected_payment_methods: any[];
  receipt_number: string | null;
  jobs: {
    id: string;
    job_number: string;
    title: string;
    customer_id: string | null;
    customers: { name: string; phone: string | null; email: string | null; address: string | null; tin_number: string | null } | null;
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

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [autoShareDone, setAutoShareDone] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paying, setPaying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [linkedQuote, setLinkedQuote] = useState<{ id: string; quote_number: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [inlinePayDate, setInlinePayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showInlinePayDate, setShowInlinePayDate] = useState(false);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptPreviewLoading, setReceiptPreviewLoading] = useState(false);
  const [isSharingReceipt, setIsSharingReceipt] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockText, setUnlockText] = useState('');
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [proof, setProof] = useState<any>(null);
  const [proofReceiptViewUrl, setProofReceiptViewUrl] = useState<string | null>(null);
  const [requestingProof, setRequestingProof] = useState(false);
  const [verifyingProof, setVerifyingProof] = useState(false);
  const [rejectProofOpen, setRejectProofOpen] = useState(false);
  const [proofRejectReason, setProofRejectReason] = useState('');
  const { checkWhatsAppShare, upgradeOpen, setUpgradeOpen, upgradeReason } = usePlanGate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    async function fetch() {
      const { data } = await supabase.from('invoices')
        .select('*, jobs(id, job_number, title, customer_id, customers(name, phone, email, address, tin_number))')
        .eq('id', id).single();
      if (active && data) {
        const inv = data as any;
        setInvoice({
          ...inv,
          items: Array.isArray(inv.items) ? inv.items : [],
          subtotal: Number(inv.subtotal) || 0,
          discount: Number(inv.discount) || 0,
          tax_rate: Number(inv.tax_rate) || 0,
          total: Number(inv.total) || 0,
          lhdn_submitted: inv.lhdn_submitted || false,
          terms: inv.terms || null,
          selected_payment_methods: Array.isArray(inv.selected_payment_methods) ? inv.selected_payment_methods : [],
          receipt_number: inv.receipt_number || null,
        });
        if (inv.quote_id) {
          supabase.from('quotations').select('id, quote_number').eq('id', inv.quote_id).single()
            .then(({ data: q }) => { if (active && q) setLinkedQuote(q); });
        }
      }
      if (active) setLoading(false);
    }
    fetch();
    const ch = supabase
      .channel(`invoice-detail-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'invoices', filter: `id=eq.${id}` }, () => fetch())
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user, id]);

  useEffect(() => {
    if (profile?.logo_url) {
      imageUrlToBase64(profile.logo_url).then(setLogoBase64);
    } else {
      setLogoBase64('');
    }
  }, [profile?.logo_url]);

  function getPaymentReceiptPath(receiptUrl: string) {
    if (!/^https?:\/\//i.test(receiptUrl)) return receiptUrl;
    try {
      const url = new URL(receiptUrl);
      const marker = '/payment-receipts/';
      const markerIndex = url.pathname.indexOf(marker);
      return markerIndex >= 0 ? decodeURIComponent(url.pathname.slice(markerIndex + marker.length)) : null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data } = await supabase
        .from('payment_proofs')
        .select('*')
        .eq('invoice_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setProof(data);
    })();
  }, [user, id, invoice?.status]);

  useEffect(() => {
    const receiptPath = proof?.receipt_url;
    if (!receiptPath) {
      setProofReceiptViewUrl(null);
      return;
    }

    const storagePath = getPaymentReceiptPath(receiptPath);
    if (!storagePath) {
      setProofReceiptViewUrl(receiptPath);
      return;
    }

    let active = true;
    (async () => {
      const { data, error } = await supabase.storage
        .from('payment-receipts')
        .createSignedUrl(storagePath, 60 * 30);
      if (!active) return;
      if (error) {
        setProofReceiptViewUrl(null);
        return;
      }
      setProofReceiptViewUrl(data.signedUrl);
    })();

    return () => { active = false; };
  }, [proof?.receipt_url]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    };
  }, [previewUrl, receiptPreviewUrl]);

  useEffect(() => {
    if (!previewOpen && !receiptPreviewOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closePreview(); closeReceiptPreview(); }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [previewOpen, receiptPreviewOpen]);

  const customer = (invoice?.jobs as any)?.customers || null;
  const customerPhone = customer?.phone || null;
  const hasPhone = !!customerPhone;
  const isOverdue = invoice?.status === 'Sent' && invoice.due_date && new Date(invoice.due_date) < new Date(new Date().toDateString());
  const displayStatus = isOverdue ? 'Overdue' : (invoice?.status || 'Draft');

  const updateStatus = async (newStatus: string) => {
    if (!invoice) return;
    const { error } = await supabase.from('invoices').update({ status: newStatus }).eq('id', invoice.id);
    if (error) { toast.error(error.message); return; }
    setInvoice({ ...invoice, status: newStatus });
    toast.success(t('invoiceDetail.sentToast'));
  };

  const generateReceiptNumber = async (): Promise<string> => {
    if (!user) return 'RCP-0001';
    const { data } = await supabase.from('profiles').select('receipt_count').eq('id', user.id).single();
    const count = ((data as any)?.receipt_count || 0) + 1;
    await supabase.from('profiles').update({ receipt_count: count } as any).eq('id', user.id);
    return `RCP-${String(count).padStart(4, '0')}`;
  };

  const handleMarkPaid = async () => {
    if (!invoice || !user) return;
    setPaying(true);
    try {
      const receiptNumber = await generateReceiptNumber();
      const { error } = await supabase.from('invoices').update({
        status: 'Paid',
        paid_date: payDate,
        receipt_number: receiptNumber,
      } as any).eq('id', invoice.id);
      if (error) throw error;
      setInvoice({ ...invoice, status: 'Paid', paid_date: payDate, receipt_number: receiptNumber });
      setPayOpen(false);
      toast.success(t('invoiceDetail.paidRecorded'));
    } catch (err: any) {
      toast.error(err.message || t('invoiceDetail.paidFailed'));
    } finally {
      setPaying(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (invoice.status !== 'Draft') {
      toast.error(t('invoiceDetail.deleteOnlyDraft'));
      setDeleteOpen(false);
      return;
    }
    setDeleting(true);
    const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('invoiceDetail.deleted'));
    navigate('/invoices');
  };

  const allPaymentMethods: any[] = Array.isArray(profile?.payment_methods) ? profile!.payment_methods : [];
  const selectedPMs = invoice
    ? (invoice.selected_payment_methods && invoice.selected_payment_methods.length > 0
        ? allPaymentMethods.filter((m: any) => invoice.selected_payment_methods.includes(m.id))
        : allPaymentMethods)
    : [];

  const pdfData = invoice ? {
    invoice: {
      invoice_number: invoice.invoice_number,
      created_at: invoice.created_at,
      issued_date: invoice.issued_date,
      due_date: invoice.due_date,
      paid_date: invoice.paid_date,
      status: invoice.status,
      items: invoice.items.map(item => ({
        description: item.description,
        description_detail: item.description_detail,
        qty: item.qty,
        uom: item.uom,
        unit_price: Number(item.unit_price) || 0,
        amount: (item.qty || 0) * (Number(item.unit_price) || 0),
      })),
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      tax_rate: invoice.tax_rate,
      total: invoice.total,
      notes: invoice.notes,
      terms: invoice.terms || profile?.invoice_terms || null,
    },
    job: invoice.jobs ? { job_number: invoice.jobs.job_number, title: invoice.jobs.title } : null,
    customer: customer ? {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      tin_number: customer.tin_number,
    } : null,
    company: {
      company_name: profile?.company_name || null,
      phone: profile?.phone || null,
      address: profile?.address || null,
      logo_url: profile?.logo_url || null,
      logo_base64: logoBase64,
      lhdn_enabled: profile?.lhdn_enabled,
      tin_number: profile?.tin_number,
      msic_code: profile?.msic_code,
      sst_registered: profile?.sst_registered,
      ssm_number_new: profile?.ssm_number_new || null,
      ssm_number_old: profile?.ssm_number_old || null,
    },
    paymentMethods: selectedPMs,
  } : null;

  const receiptPdfData = invoice && invoice.status === 'Paid' && invoice.receipt_number ? {
    receipt: {
      receipt_number: invoice.receipt_number,
      payment_date: invoice.paid_date || null,
      amount_paid: invoice.total,
    },
    invoice: {
      invoice_number: invoice.invoice_number,
      issued_date: invoice.issued_date || null,
      items: Array.isArray(invoice.items) ? (invoice.items as Array<{ description: string; qty: number; unit_price: number; amount: number }>) : [],
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      tax_rate: invoice.tax_rate,
      total: invoice.total,
    },
    job: invoice.jobs ? { job_number: invoice.jobs.job_number, title: invoice.jobs.title } : null,
    customer: customer ? { name: customer.name, phone: customer.phone, email: customer.email, address: customer.address } : null,
    company: {
      company_name: profile?.company_name || null,
      phone: profile?.phone || null,
      address: profile?.address || null,
      logo_url: profile?.logo_url || null,
      logo_base64: logoBase64,
      ssm_number_new: profile?.ssm_number_new || null,
      ssm_number_old: profile?.ssm_number_old || null,
    },
    paymentMethod: selectedPMs.length > 0 ? selectedPMs.map((pm: any) => pm.label || pm.type).join(', ') : undefined,
  } : null;

  const handlePreview = async () => {
    if (!pdfData) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const pdfWithLogo = await embedPdfCompanyLogo(pdfData);
      const blob = await pdf(<InvoicePDF {...pdfWithLogo} />).toBlob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      toast.error(t('invoiceDetail.previewFailed'));
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
    if (!pdfData || !invoice) return;
    const pdfWithLogo = await embedPdfCompanyLogo(pdfData);
    const blob = await pdf(<InvoicePDF {...pdfWithLogo} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invois-${invoice.invoice_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Receipt preview
  const handleReceiptPreview = async () => {
    if (!receiptPdfData) return;
    setReceiptPreviewOpen(true);
    setReceiptPreviewLoading(true);
    setReceiptPreviewUrl(null);
    try {
      const receiptWithLogo = await embedPdfCompanyLogo(receiptPdfData);
      const blob = await pdf(<ReceiptPDF {...receiptWithLogo} />).toBlob();
      setReceiptPreviewUrl(URL.createObjectURL(blob));
    } catch {
      toast.error(t('invoiceDetail.receiptPreviewFailed'));
      setReceiptPreviewOpen(false);
    } finally {
      setReceiptPreviewLoading(false);
    }
  };

  const closeReceiptPreview = () => {
    setReceiptPreviewOpen(false);
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    setReceiptPreviewUrl(null);
  };

  const handleReceiptDownload = async () => {
    if (!receiptPdfData || !invoice) return;
    const receiptWithLogo = await embedPdfCompanyLogo(receiptPdfData);
    const blob = await pdf(<ReceiptPDF {...receiptWithLogo} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Resit-${invoice.receipt_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareReceiptWhatsAppCore = async (inv: Invoice, receiptData: any) => {
    if (!user || !customerPhone) return;
    const receiptWithLogo = await embedPdfCompanyLogo(receiptData);
    const blob = await pdf(<ReceiptPDF {...receiptWithLogo} />).toBlob();
    const fileName = `${user.id}/${inv.receipt_number}.pdf`;
    await supabase.storage.from('receipts').upload(fileName, blob, { contentType: 'application/pdf', upsert: true });
    const { data: signed } = await supabase.storage.from('receipts').createSignedUrl(fileName, 60 * 60 * 24 * 365);
    const publicUrl = signed?.signedUrl ?? '';
    const shortUrl = await getOrCreateShortLink({ userId: user.id, targetUrl: publicUrl, kind: 'receipt' });
    const phone = formatPhone(customerPhone);
    const details = t('invoiceDetail.waReceiptDetails', {
      receiptNumber: inv.receipt_number,
      invoiceNumber: inv.invoice_number,
      amount: inv.total.toFixed(2),
      date: inv.paid_date ? formatDate(inv.paid_date) : '-',
      url: shortUrl,
    });
    const message = renderTemplate(
      (profile as any)?.whatsapp_templates,
      'receipt',
      { customer_name: customer?.name || '', company_name: profile?.company_name || '' },
      details,
    );
    openWhatsApp(phone, message);
  };

  const shareReceiptWhatsApp = async () => {
    if (!checkWhatsAppShare()) return;
    if (!receiptPdfData || !invoice || !user || !hasPhone) return;
    setIsSharingReceipt(true);
    try {
      await shareReceiptWhatsAppCore(invoice, receiptPdfData);
      toast.success(t('invoiceDetail.receiptShareSuccess'));
    } catch {
      toast.error(t('invoiceDetail.receiptShareFailed'));
    } finally {
      setIsSharingReceipt(false);
    }
  };

  // Unified invoice WhatsApp template — used for Hantar Invois, Kongsi via WhatsApp,
  // Peringatan, dan Mohon Bukti Bayaran. Sentiasa sertakan link PDF + link upload bukti.
  const buildWhatsAppInvoiceMessage = (_pdfUrl?: string, proofUrl?: string, isReminder = false) => {
    const name = customer?.name || '';
    const companyName = profile?.company_name || '';
    const detailLines = [
      t('invoiceDetail.waInvoiceNo', { number: invoice!.invoice_number }),
      t('invoiceDetail.waAmount', { amount: invoice!.total.toFixed(2) }),
      t('invoiceDetail.waPayBefore', { date: invoice!.due_date ? formatDate(invoice!.due_date) : '-' }),
    ];
    if (proofUrl) {
      detailLines.push('', t('invoiceDetail.waProofPrompt'), proofUrl);
    }
    return renderTemplate(
      (profile as any)?.whatsapp_templates,
      isReminder ? 'invoice_reminder' : 'invoice',
      { customer_name: name, company_name: companyName },
      detailLines.join('\n'),
    );
  };

  // Generate (or reuse) the invoice PDF in storage and the proof-upload token.
  // Returns both URLs so any WhatsApp action can include them.
  const prepareInvoiceLinks = async (): Promise<{ pdfUrl: string; proofUrl: string }> => {
    if (!invoice || !user || !pdfData) return { pdfUrl: '', proofUrl: '' };
    const pdfWithLogo = await embedPdfCompanyLogo(pdfData);
    const blob = await pdf(<InvoicePDF {...pdfWithLogo} />).toBlob();
    const fileName = `${user.id}/${invoice.invoice_number}.pdf`;
    await supabase.storage.from('invoice-pdfs').upload(fileName, blob, { contentType: 'application/pdf', upsert: true });
    const { data: signed } = await supabase.storage.from('invoice-pdfs').createSignedUrl(fileName, 60 * 60 * 24 * 365);
    const pdfUrl = signed?.signedUrl ?? '';

    const token = await getOrCreatePaymentProofToken({
      userId: user.id,
      invoiceId: invoice.id,
      customerName: customer?.name || null,
    });
    const fullProofUrl = buildPublicPaymentProofUrl(token);
    const proofUrl = await getOrCreateShortLink({ userId: user.id, targetUrl: fullProofUrl, kind: 'proof' });

    // Persist invoice PDF link on the proof so the public page can show it
    await supabase.from('payment_proofs').update({ invoice_pdf_url: pdfUrl } as any).eq('token', token);
    const { data: proofRow } = await supabase.from('payment_proofs').select('*').eq('token', token).maybeSingle();
    if (proofRow) setProof(proofRow);
    return { pdfUrl, proofUrl };
  };

  const shareViaWhatsApp = async () => {
    if (!checkWhatsAppShare()) return;
    if (!invoice || !pdfData || !user || !hasPhone) return;
    setIsSharing(true);
    try {
      const { pdfUrl, proofUrl } = await prepareInvoiceLinks();
      const phone = formatPhone(customerPhone);
      const message = buildWhatsAppInvoiceMessage(pdfUrl, proofUrl);
      openWhatsApp(phone, message);
      toast.success(t('invoiceDetail.shareSuccess'));
    } catch {
      toast.error(t('invoiceDetail.shareFailed'));
    } finally {
      setIsSharing(false);
    }
  };

  // Auto-trigger WhatsApp share when arriving with ?share=1 (e.g. from Sent action in form)
  useEffect(() => {
    if (autoShareDone) return;
    if (searchParams.get('share') !== '1') return;
    if (!invoice || !pdfData || !user || !hasPhone) return;
    setAutoShareDone(true);
    const next = new URLSearchParams(searchParams);
    next.delete('share');
    setSearchParams(next, { replace: true });
    shareViaWhatsApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice, pdfData, user, hasPhone, searchParams, autoShareDone]);


  const sendPaymentReminder = async () => {
    if (!checkWhatsAppShare()) return;
    if (!invoice || !hasPhone || !pdfData || !user) return;
    setIsSharing(true);
    try {
      const { pdfUrl, proofUrl } = await prepareInvoiceLinks();
      const phone = formatPhone(customerPhone);
      const message = buildWhatsAppInvoiceMessage(pdfUrl, proofUrl, true);
      openWhatsApp(phone, message);
    } catch {
      toast.error(t('invoiceDetail.reminderFailed'));
    } finally {
      setIsSharing(false);
    }
  };

  const requestPaymentProof = async () => {
    if (!checkWhatsAppShare()) return;
    if (!invoice || !user || !hasPhone || !pdfData) return;
    setRequestingProof(true);
    try {
      const { pdfUrl, proofUrl } = await prepareInvoiceLinks();
      const phone = formatPhone(customerPhone);
      const message = buildWhatsAppInvoiceMessage(pdfUrl, proofUrl);
      openWhatsApp(phone, message);
      toast.success(t('invoiceDetail.proofLinkGenerated'));
    } catch (err: any) {
      toast.error(err.message || t('invoiceDetail.proofLinkFailed'));
    } finally {
      setRequestingProof(false);
    }
  };

  const verifyProofAndMarkPaid = async () => {
    if (!proof || !invoice || !user) return;
    setVerifyingProof(true);
    try {
      const receiptNumber = await generateReceiptNumber();
      const paidDate = proof.payment_date || new Date().toISOString().slice(0, 10);
      await supabase.from('payment_proofs').update({
        status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      } as any).eq('id', proof.id);
      const { error } = await supabase.from('invoices').update({
        status: 'Paid',
        paid_date: paidDate,
        receipt_number: receiptNumber,
      } as any).eq('id', invoice.id);
      if (error) throw error;
      const updatedInvoice = { ...invoice, status: 'Paid', paid_date: paidDate, receipt_number: receiptNumber };
      setInvoice(updatedInvoice);
      setProof({ ...proof, status: 'verified', verified_at: new Date().toISOString() });
      toast.success(t('invoiceDetail.proofVerified'));

      // Auto-redirect to WhatsApp with receipt share message
      if (hasPhone && checkWhatsAppShare()) {
        const updatedReceiptData = {
          receipt: {
            receipt_number: receiptNumber,
            payment_date: paidDate,
            amount_paid: updatedInvoice.total,
          },
          invoice: {
            invoice_number: updatedInvoice.invoice_number,
            issued_date: updatedInvoice.issued_date || null,
            items: Array.isArray(updatedInvoice.items) ? (updatedInvoice.items as any) : [],
            subtotal: updatedInvoice.subtotal,
            discount: updatedInvoice.discount,
            tax_rate: updatedInvoice.tax_rate,
            total: updatedInvoice.total,
          },
          job: updatedInvoice.jobs ? { job_number: updatedInvoice.jobs.job_number, title: updatedInvoice.jobs.title } : null,
          customer: customer ? { name: customer.name, phone: customer.phone, email: customer.email, address: customer.address } : null,
          company: {
            company_name: profile?.company_name || null,
            phone: profile?.phone || null,
            address: profile?.address || null,
            logo_url: profile?.logo_url || null,
            logo_base64: logoBase64,
            ssm_number_new: profile?.ssm_number_new || null,
            ssm_number_old: profile?.ssm_number_old || null,
          },
          paymentMethod: selectedPMs.length > 0 ? selectedPMs.map((pm: any) => pm.label || pm.type).join(', ') : undefined,
        };
        try {
          await shareReceiptWhatsAppCore(updatedInvoice, updatedReceiptData);
        } catch {
          toast.error(t('invoiceDetail.receiptShareWaFailed'));
        }
      }
    } catch (err: any) {
      toast.error(err.message || t('invoiceDetail.verifyFailed'));
    } finally {
      setVerifyingProof(false);
    }
  };

  const rejectProof = async () => {
    if (!proof || !proofRejectReason.trim()) {
      toast.error(t('invoiceDetail.rejectReasonRequired'));
      return;
    }
    setVerifyingProof(true);
    try {
      await supabase.from('payment_proofs').update({
        status: 'rejected',
        rejection_reason: proofRejectReason.trim(),
      } as any).eq('id', proof.id);
      setProof({ ...proof, status: 'rejected', rejection_reason: proofRejectReason.trim() });
      setRejectProofOpen(false);
      setProofRejectReason('');
      toast.success(t('invoiceDetail.proofRejected'));
    } catch (err: any) {
      toast.error(err.message || t('invoiceDetail.rejectFailed'));
    } finally {
      setVerifyingProof(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p className="text-muted-foreground">{t('invoiceDetail.notFound')}</p>
        <Button variant="outline" onClick={() => navigate('/invoices')} className="mt-4">{t('invoiceDetail.back')}</Button>
      </div>
    );
  }

  const afterDiscount = invoice.subtotal - invoice.discount;
  const sstAmount = invoice.tax_rate > 0 ? afterDiscount * (invoice.tax_rate / 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-4 pb-28 md:pb-6">
      {/* Paid Banner */}
      {invoice.status === 'Paid' && (
        <div className="bg-[#DCFCE7] border border-[#BBF7D0] rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-[#15803D]" />
          <div>
            <p className="text-sm font-bold text-[#15803D]">{t('invoiceDetail.paid')}</p>
            {invoice.paid_date && <p className="text-xs text-[#15803D]">{t('invoiceDetail.paymentDate')}: {formatDate(invoice.paid_date)}</p>}
          </div>
        </div>
      )}

      {/* Receipt Section */}
      {invoice.status === 'Paid' && invoice.receipt_number && (
        <div className="bg-[#DCFCE7] border border-[#BBF7D0] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[#15803D]" />
              <span className="text-sm font-bold text-[#15803D]">{t('invoiceDetail.receipt')}</span>
            </div>
            <span className="text-xs text-[#15803D] font-medium">{invoice.receipt_number}</span>
          </div>
          <p className="text-sm text-[#15803D]">
            {t('invoiceDetail.receiptReceived', { amount: invoice.total.toFixed(2), date: invoice.paid_date ? formatDate(invoice.paid_date) : '-' })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1 border-[#BBF7D0] text-[#15803D] hover:bg-[#BBF7D0]/30" onClick={handleReceiptPreview}>
              <Eye className="h-3.5 w-3.5" /> {t('invoiceDetail.previewReceipt')}
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1 border-[#BBF7D0] text-[#15803D] hover:bg-[#BBF7D0]/30" onClick={handleReceiptDownload}>
              <Download className="h-3.5 w-3.5" /> {t('invoiceDetail.downloadReceipt')}
            </Button>
            {hasPhone && (
              <Button size="sm" className="text-xs gap-1 text-white" style={{ backgroundColor: '#25D366' }} onClick={shareReceiptWhatsApp} disabled={isSharingReceipt}>
                {isSharingReceipt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                {t('invoiceDetail.shareReceiptWa')}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{invoice.invoice_number}</h1>
            <div className="relative inline-flex items-center">
              <select
                value={displayStatus}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  if (newStatus === displayStatus) return;
                  // Lock: if current status is Paid, require verification before changing.
                  if (invoice.status === 'Paid' && newStatus !== 'Paid') {
                    setPendingStatus(newStatus);
                    setUnlockText('');
                    setUnlockOpen(true);
                    return;
                  }
                  if (newStatus === 'Paid') {
                    setShowInlinePayDate(true);
                    return;
                  }
                  setShowInlinePayDate(false);
                  const { error } = await supabase.from('invoices').update({ status: newStatus }).eq('id', invoice.id).eq('user_id', user!.id);
                  if (!error) {
                    setInvoice({ ...invoice, status: newStatus });
                    toast.success(t('invoiceDetail.statusUpdated'));
                  } else {
                    toast.error(t('invoiceDetail.statusUpdateFailed'));
                  }
                }}
                className={`appearance-none cursor-pointer rounded-full py-1 pl-3 pr-7 text-[13px] font-medium border-0 outline-none ${STATUS_COLORS[displayStatus]}`}
                style={{ WebkitAppearance: 'none' }}
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
              <ChevronDown className="absolute right-2 h-3 w-3 pointer-events-none opacity-60" />
            </div>
            {invoice.lhdn_submitted && profile?.lhdn_enabled && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center gap-1">
                <Landmark className="h-3 w-3" /> e-Invois
              </span>
            )}
          </div>
          {showInlinePayDate && (
            <div className="flex items-center gap-2 mt-2">
              <label className="text-sm text-muted-foreground">{t('invoiceDetail.paidDateLabel')}</label>
              <Input type="date" value={inlinePayDate} onChange={e => setInlinePayDate(e.target.value)} className="h-8 w-40 text-sm rounded-lg" />
              <Button size="sm" className="h-8 rounded-lg bg-green-600 hover:bg-green-700" onClick={async () => {
                try {
                  const receiptNumber = await generateReceiptNumber();
                  const { error } = await supabase.from('invoices').update({ status: 'Paid', paid_date: inlinePayDate, receipt_number: receiptNumber } as any).eq('id', invoice.id).eq('user_id', user!.id);
                  if (!error) {
                    setInvoice({ ...invoice, status: 'Paid', paid_date: inlinePayDate, receipt_number: receiptNumber });
                    setShowInlinePayDate(false);
                    toast.success(t('invoiceDetail.markedPaid'));
                  } else {
                    toast.error(t('invoiceDetail.statusUpdateFailed'));
                  }
                } catch { toast.error(t('invoiceDetail.statusUpdateFailed')); }
              }}>{t('invoiceDetail.confirm')}</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowInlinePayDate(false)}>{t('invoiceDetail.cancel')}</Button>
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {invoice.status === 'Draft' && (
              <DropdownMenuItem onClick={() => navigate(`/invoices/${invoice.id}/edit`)}><Edit className="h-4 w-4 mr-2" /> {t('invoiceDetail.edit')}</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> {t('invoiceDetail.delete')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Info */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        {customer && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{customer.name}</span>
            {hasPhone && (
              <a href={buildWhatsAppUrl(formatPhone(customerPhone))} target="_blank" rel="noopener noreferrer"
                className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full hover:bg-green-100">
                <MessageCircle className="h-3 w-3" /> WhatsApp
              </a>
            )}
          </div>
        )}
        {invoice.jobs && (
          <button onClick={() => navigate(`/jobs/${invoice.jobs!.id}`)} className="flex items-center gap-2 text-sm hover:underline">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span className="text-primary font-medium">{invoice.jobs.job_number}</span>
            <span className="text-muted-foreground">— {invoice.jobs.title}</span>
          </button>
        )}
        {linkedQuote && (
          <button onClick={() => navigate(`/quotations/${linkedQuote.id}`)} className="flex items-center gap-2 text-sm hover:underline">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-primary font-medium">{linkedQuote.quote_number}</span>
          </button>
        )}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><p className="text-xs text-muted-foreground">{t('invoiceDetail.created')}</p><p className="text-foreground">{formatDate(invoice.created_at)}</p></div>
          {invoice.issued_date && <div><p className="text-xs text-muted-foreground">{t('invoiceDetail.issuedDate')}</p><p className="text-foreground">{formatDate(invoice.issued_date)}</p></div>}
          {invoice.due_date && (
            <div>
              <p className="text-xs text-muted-foreground">{t('invoiceDetail.dueDate')}</p>
              <p className={`${isOverdue ? 'text-[#B91C1C] font-medium' : 'text-foreground'}`}>
                {formatDate(invoice.due_date)}
                {isOverdue && <span className="ml-1 text-xs bg-[#FEE2E2] text-[#B91C1C] px-1.5 py-0.5 rounded-full">{t('invoiceDetail.overdue')}</span>}
              </p>
            </div>
          )}
          {invoice.status === 'Paid' && invoice.paid_date && (
            <div><p className="text-xs text-muted-foreground">{t('invoiceDetail.paidDate')}</p><p className="text-[#15803D] font-medium">{formatDate(invoice.paid_date)}</p></div>
          )}
        </div>
        {invoice.notes && (
          <div><p className="text-xs text-muted-foreground">{t('invoiceDetail.notes')}</p><p className="text-sm text-foreground whitespace-pre-wrap">{invoice.notes}</p></div>
        )}
      </div>

      {/* LHDN Section */}
      {profile?.lhdn_enabled && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Landmark className="h-3.5 w-3.5" /> {t('invoiceDetail.lhdnInfo')}
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {profile.tin_number && <div><p className="text-xs text-muted-foreground">{t('invoiceDetail.tinCompany')}</p><p>{profile.tin_number}</p></div>}
            {customer?.tin_number && <div><p className="text-xs text-muted-foreground">{t('invoiceDetail.tinCustomer')}</p><p>{customer.tin_number}</p></div>}
            {profile.msic_code && <div><p className="text-xs text-muted-foreground">{t('invoiceDetail.msicCode')}</p><p>{profile.msic_code}</p></div>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${invoice.lhdn_submitted ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEF3C7] text-[#B45309]'}`}>
              {invoice.lhdn_submitted ? t('invoiceDetail.submitted') : t('invoiceDetail.notSubmitted')}
            </span>
          </div>
        </div>
      )}

      {/* Line Items */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('invoiceDetail.items')}</p>
        <div className="hidden md:block">
          <div className="grid grid-cols-[1fr_60px_100px_100px] gap-2 text-xs font-medium text-muted-foreground mb-1">
            <span>{t('invoiceDetail.description')}</span><span>{t('invoiceDetail.qty')}</span><span>{t('invoiceDetail.price')}</span><span className="text-right">{t('invoiceDetail.amount')}</span>
          </div>
          {invoice.items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_60px_100px_100px] gap-2 py-1.5 border-b border-border last:border-0 text-sm">
              <span className="text-foreground">{item.description}</span>
              <span className="text-foreground">{item.qty}</span>
              <span className="text-foreground">RM {(Number(item.unit_price) || 0).toFixed(2)}</span>
              <span className="text-right font-medium text-foreground">RM {((item.qty || 0) * (Number(item.unit_price) || 0)).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="md:hidden space-y-2">
          {invoice.items.map((item, i) => (
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
          <div className="flex justify-between"><span className="text-muted-foreground">{t('invoiceDetail.subtotal')}</span><span>RM {invoice.subtotal.toFixed(2)}</span></div>
          {invoice.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t('invoiceDetail.discount')}</span><span>− RM {invoice.discount.toFixed(2)}</span></div>}
          {invoice.tax_rate > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t('invoiceDetail.sst', { rate: invoice.tax_rate })}</span><span>+ RM {sstAmount.toFixed(2)}</span></div>}
          <div className="flex justify-between border-t border-border pt-2">
            <span className="font-bold text-foreground">{t('invoiceDetail.grandTotal')}</span>
            <span className="text-lg font-bold text-primary">RM {invoice.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Proof Section */}
      {invoice.status !== 'Paid' && proof && proof.submitted_at && proof.status === 'pending' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-blue-900">{t('invoiceDetail.proofReceivedTitle')}</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-blue-900">
            <div><span className="text-blue-700">{t('invoiceDetail.payer')}</span> {proof.payer_name || '-'}</div>
            <div><span className="text-blue-700">{t('invoiceDetail.amountLabel')}</span> RM {Number(proof.amount_paid || 0).toFixed(2)}</div>
            <div><span className="text-blue-700">{t('invoiceDetail.dateLabel')}</span> {proof.payment_date || '-'}</div>
            <div><span className="text-blue-700">{t('invoiceDetail.method')}</span> {proof.payment_method || '-'}</div>
            {proof.bank_name && <div><span className="text-blue-700">{t('invoiceDetail.bank')}</span> {proof.bank_name}</div>}
            {proof.reference_number && <div><span className="text-blue-700">{t('invoiceDetail.reference')}</span> {proof.reference_number}</div>}
          </div>
          {proof.notes && <p className="text-sm text-blue-900"><span className="text-blue-700">{t('invoiceDetail.notesLabel')}</span> {proof.notes}</p>}
          {proof.receipt_url && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-blue-700">{t('invoiceDetail.proofUploaded')}</p>
              {!proofReceiptViewUrl ? (
                <div className="h-24 rounded-lg border border-blue-200 bg-white flex items-center justify-center text-sm text-blue-700">
                  {t('invoiceDetail.receiptPreviewFailed')}
                </div>
              ) : /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(proof.receipt_url) ? (
                <a href={proofReceiptViewUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={proofReceiptViewUrl}
                    alt="Bukti pembayaran"
                    className="max-h-64 w-auto rounded-lg border border-blue-200 bg-white object-contain"
                  />
                </a>
              ) : (
                <iframe
                  src={proofReceiptViewUrl}
                  title="Bukti pembayaran"
                  className="w-full h-64 rounded-lg border border-blue-200 bg-white"
                />
              )}
              {proofReceiptViewUrl && (
                <a href={proofReceiptViewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-700 underline">
                  <Eye className="h-3.5 w-3.5" /> {t('invoiceDetail.openInNewTab')}
                </a>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={verifyProofAndMarkPaid} disabled={verifyingProof} className="bg-green-600 hover:bg-green-700 text-white rounded-lg gap-2 flex-1">
              <CheckCircle className="h-4 w-4" /> {t('invoiceDetail.verifyAndMark')}
            </Button>
            <Button onClick={() => setRejectProofOpen(true)} variant="outline" disabled={verifyingProof} className="text-destructive border-destructive/30 rounded-lg flex-1">
              {t('invoiceDetail.reject')}
            </Button>
          </div>
        </div>
      )}

      {invoice.status !== 'Paid' && proof && !proof.submitted_at && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900">
          {t('invoiceDetail.waitingProof')}
        </div>
      )}

      {invoice.status !== 'Paid' && proof && proof.status === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-900">
          {t('invoiceDetail.proofRejectedNotice', { reason: proof.rejection_reason || '-' })}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {invoice.status === 'Draft' && (
          <>
            <Button onClick={() => navigate(`/invoices/${invoice.id}/edit`)} variant="outline" className="flex-1 rounded-lg gap-2"><Edit className="h-4 w-4" /> {t('invoiceDetail.edit')}</Button>
            <Button
              onClick={async () => {
                if (!checkWhatsAppShare()) return;
                if (!invoice || !pdfData || !user) return;
                if (!hasPhone) {
                  toast.error(t('invoiceDetail.noPhoneRecord'));
                  return;
                }
                setIsSharing(true);
                try {
                  const { pdfUrl, proofUrl } = await prepareInvoiceLinks();
                  await supabase.from('invoices').update({ status: 'Sent' }).eq('id', invoice.id);
                  setInvoice({ ...invoice, status: 'Sent' });
                  const phone = formatPhone(customerPhone!);
                  const message = buildWhatsAppInvoiceMessage(pdfUrl, proofUrl);
                  openWhatsApp(phone, message);
                  toast.success(t('invoiceDetail.sentWaOpened'));
                } catch {
                  toast.error(t('invoiceDetail.sendFailed'));
                } finally {
                  setIsSharing(false);
                }
              }}
              disabled={isSharing}
              className="flex-1 rounded-lg gap-2 text-white"
              style={{ backgroundColor: '#25D366' }}
            >
              {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              {t('invoiceDetail.sendInvoice')}
            </Button>
          </>
        )}
        {(invoice.status === 'Sent' || isOverdue) && (
          <>
            {hasPhone && (!proof || proof.status === 'rejected') && (
              <Button onClick={requestPaymentProof} disabled={requestingProof} className="flex-1 rounded-lg gap-2 bg-green-600 hover:bg-green-700">
                {requestingProof ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                {t('invoiceDetail.requestProofWa')}
              </Button>
            )}
            {hasPhone && (
              <Button onClick={sendPaymentReminder} variant="outline" className="flex-1 rounded-lg gap-2 text-green-600 border-green-200 hover:bg-green-50">
                <MessageCircle className="h-4 w-4" /> {t('invoiceDetail.reminder')}
              </Button>
            )}
            <Button onClick={() => setPayOpen(true)} variant="outline" className="rounded-lg gap-2">
              <CheckCircle className="h-4 w-4" /> {t('invoiceDetail.markManually')}
            </Button>
          </>
        )}
      </div>

      {/* Payment Info Display */}
      {selectedPMs.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('invoiceDetail.paymentMethods')}</p>
          {selectedPMs.filter((m: any) => m.type === 'bank_transfer').map((b: any) => (
            <div key={b.id} className="border border-border rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium">{t('invoiceDetail.bankTransfer')}</p>
              <div className="grid grid-cols-[80px_1fr] gap-1 text-sm">
                <span className="text-muted-foreground">{t('invoiceDetail.bankLabel')}</span><span>{b.bank_name}</span>
                <span className="text-muted-foreground">{t('invoiceDetail.name')}</span><span>{b.account_name}</span>
                <span className="text-muted-foreground">{t('invoiceDetail.account')}</span>
                <span className="flex items-center gap-1.5">
                  {b.account_number}
                  <button onClick={() => { navigator.clipboard.writeText(b.account_number); toast.success(t('invoiceDetail.accountCopied')); }} className="text-primary hover:text-primary/80">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            </div>
          ))}
          {selectedPMs.filter((m: any) => m.type === 'qr_payment').map((q: any) => (
            <div key={q.id} className="border border-border rounded-lg p-3 flex flex-col items-center gap-2">
              <p className="text-sm font-medium">📱 {q.provider || 'QR Payment'}</p>
              {q.qr_image_url && <img src={q.qr_image_url} alt="QR" className="h-[120px] w-[120px] object-contain" />}
              <p className="text-xs text-muted-foreground">{t('invoiceDetail.scanToPay')}</p>
            </div>
          ))}
        </div>
      )}

      {/* WhatsApp Share + PDF Preview + PDF Download */}
      <div className="flex flex-col gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button onClick={shareViaWhatsApp} disabled={isSharing || !hasPhone} className="w-full rounded-lg gap-2 text-white" style={{ backgroundColor: '#25D366' }}>
                  {isSharing ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('invoiceDetail.generating')}</> : <><MessageCircle className="h-4 w-4" /> {t('invoiceDetail.shareWa')}</>}
                </Button>
              </div>
            </TooltipTrigger>
            {!hasPhone && <TooltipContent>{t('invoiceDetail.noPhoneRecord')}</TooltipContent>}
          </Tooltip>
        </TooltipProvider>

        {pdfData && (
          <>
            <Button variant="outline" onClick={handlePreview} className="w-full rounded-lg gap-2 text-primary border-primary/30">
              <Eye className="h-4 w-4" /> {t('invoiceDetail.previewPdf')}
            </Button>
            <Button variant="outline" onClick={handlePreviewDownload} className="w-full rounded-lg gap-2 text-primary border-primary/30">
              <Download className="h-4 w-4" /> {t('invoiceDetail.downloadPdf')}
            </Button>
          </>
        )}
      </div>

      {/* Mark as Paid Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('invoiceDetail.markPaidTitle')}</DialogTitle>
            <DialogDescription>{t('invoiceDetail.markPaidDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('invoiceDetail.paidDateField')}</label>
            <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayOpen(false)}>{t('invoiceDetail.cancel')}</Button>
            <Button onClick={handleMarkPaid} disabled={paying} className="bg-green-600 hover:bg-green-700">
              {paying ? t('invoiceDetail.saving') : t('invoiceDetail.confirmPayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('invoiceDetail.deleteTitle')}</DialogTitle>
            <DialogDescription>{t('invoiceDetail.deleteDesc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>{t('invoiceDetail.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? t('invoiceDetail.deleting') : t('invoiceDetail.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Paid invoice Dialog */}
      <Dialog open={unlockOpen} onOpenChange={(o) => { if (!o) { setUnlockOpen(false); setUnlockText(''); setPendingStatus(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('invoiceDetail.unlockTitle')}</DialogTitle>
            <DialogDescription>
              <Trans
                i18nKey="invoiceDetail.unlockDesc"
                values={{ status: pendingStatus }}
                components={[<strong key="0" />, <strong key="1" />, <strong key="2" />]}
              />
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('invoiceDetail.unlockPrompt')}</label>
            <Input
              value={unlockText}
              onChange={(e) => setUnlockText(e.target.value)}
              placeholder={t('invoiceDetail.unlockPlaceholder')}
              className={`h-11 rounded-lg ${unlockText === t('invoiceDetail.unlockKeyword') ? 'border-green-500 focus:ring-green-500' : unlockText ? 'border-destructive' : ''}`}
            />
            {unlockText !== '' && unlockText !== t('invoiceDetail.unlockKeyword') && (
              <p className="text-xs text-destructive mt-1">{t('invoiceDetail.unlockHint')}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setUnlockOpen(false); setUnlockText(''); setPendingStatus(null); }} disabled={unlocking}>{t('invoiceDetail.cancel')}</Button>
            <Button
              variant="destructive"
              disabled={unlockText !== t('invoiceDetail.unlockKeyword') || unlocking || !pendingStatus}
              onClick={async () => {
                if (!invoice || !pendingStatus) return;
                setUnlocking(true);
                try {
                  const updates: any = { status: pendingStatus };
                  // Clear paid metadata when moving away from Paid
                  updates.paid_date = null;
                  updates.receipt_number = null;
                  const { error } = await supabase.from('invoices').update(updates).eq('id', invoice.id).eq('user_id', user!.id);
                  if (error) throw error;
                  setInvoice({ ...invoice, status: pendingStatus, paid_date: null, receipt_number: null });
                  toast.success(t('invoiceDetail.statusUpdated'));
                  setUnlockOpen(false);
                  setUnlockText('');
                  setPendingStatus(null);
                } catch (err: any) {
                  toast.error(err.message || t('invoiceDetail.statusUpdateFailed'));
                } finally {
                  setUnlocking(false);
                }
              }}
            >
              {unlocking ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t('invoiceDetail.updating')}</> : t('invoiceDetail.confirmAndChange')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PDFPreviewModal
        fileUrl={previewUrl}
        loading={previewLoading}
        onClose={closePreview}
        onDownload={handlePreviewDownload}
        onShare={() => { closePreview(); shareViaWhatsApp(); }}
        open={previewOpen}
        title={t('invoiceDetail.previewTitle', { number: invoice.invoice_number })}
      />

      <PDFPreviewModal
        fileUrl={receiptPreviewUrl}
        loading={receiptPreviewLoading}
        onClose={closeReceiptPreview}
        onDownload={handleReceiptDownload}
        onShare={() => { closeReceiptPreview(); shareReceiptWhatsApp(); }}
        open={receiptPreviewOpen}
        title={t('invoiceDetail.receiptPreviewTitle', { number: invoice.receipt_number || t('invoiceDetail.receiptDefault') })}
      />

      {/* Reject Proof Dialog */}
      <Dialog open={rejectProofOpen} onOpenChange={setRejectProofOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('invoiceDetail.rejectProofTitle')}</DialogTitle>
            <DialogDescription>{t('invoiceDetail.rejectProofDesc')}</DialogDescription>
          </DialogHeader>
          <Input value={proofRejectReason} onChange={(e) => setProofRejectReason(e.target.value)} placeholder={t('invoiceDetail.rejectPlaceholder')} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectProofOpen(false)}>{t('invoiceDetail.cancel')}</Button>
            <Button variant="destructive" onClick={rejectProof} disabled={verifyingProof}>{verifyingProof ? t('invoiceDetail.processing') : t('invoiceDetail.confirmReject')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
    </div>
  );
}

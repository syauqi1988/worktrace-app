import { useState, useEffect } from 'react';
import { usePlanGate } from '@/hooks/usePlanGate';
import UpgradeModal from '@/components/UpgradeModal';
import { useParams, useNavigate } from 'react-router-dom';
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
  MessageCircle, FileText, Download, Loader2, CheckCircle, Landmark, Eye, X, Copy, ChevronDown
} from 'lucide-react';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import InvoicePDF from '@/components/pdf/InvoicePDF';
import PDFPreviewModal from '@/components/pdf/PDFPreviewModal';
import { imageUrlToBase64 } from '@/utils/imageToBase64';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-[#F1F5F9] text-[#64748B]',
  Sent: 'bg-[#DBEAFE] text-[#1D4ED8]',
  Paid: 'bg-[#DCFCE7] text-[#15803D]',
  Overdue: 'bg-[#FEE2E2] text-[#B91C1C]',
};

interface LineItem { description: string; qty: number; unit_price: number; }

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
  jobs: {
    id: string;
    job_number: string;
    title: string;
    customer_id: string | null;
    customers: { name: string; phone: string | null; email: string | null; address: string | null; tin_number: string | null } | null;
  } | null;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
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
  const { checkWhatsAppShare, canShowLogo, upgradeOpen, setUpgradeOpen, upgradeReason } = usePlanGate();
  useEffect(() => {
    if (!user || !id) return;
    async function fetch() {
      const { data } = await supabase.from('invoices')
        .select('*, jobs(id, job_number, title, customer_id, customers(name, phone, email, address, tin_number))')
        .eq('id', id).single();
      if (data) {
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
        });
        if (inv.quote_id) {
          supabase.from('quotations').select('id, quote_number').eq('id', inv.quote_id).single()
            .then(({ data: q }) => { if (q) setLinkedQuote(q); });
        }
      }
      setLoading(false);
    }
    fetch();
  }, [user, id]);

  // Fetch logo as base64 for PDF
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

  // ESC key to close preview
  useEffect(() => {
    if (!previewOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closePreview(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [previewOpen]);

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
    toast.success('Invois dihantar!');
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;
    setPaying(true);
    const { error } = await supabase.from('invoices').update({ status: 'Paid', paid_date: payDate }).eq('id', invoice.id);
    setPaying(false);
    if (error) { toast.error(error.message); return; }
    setInvoice({ ...invoice, status: 'Paid', paid_date: payDate });
    setPayOpen(false);
    toast.success('Pembayaran berjaya direkodkan!');
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (invoice.status !== 'Draft') {
      toast.error('Invois yang telah dihantar atau dibayar tidak boleh dipadam.');
      setDeleteOpen(false);
      return;
    }
    setDeleting(true);
    const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Invois dipadam');
    navigate('/invoices');
  };

  // Get payment methods for PDF
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
        qty: item.qty,
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
    },
    paymentMethods: selectedPMs,
  } : null;

  // PDF Preview
  const handlePreview = async () => {
    if (!pdfData) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const blob = await pdf(<InvoicePDF {...pdfData} />).toBlob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
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
    if (!pdfData || !invoice) return;
    const blob = await pdf(<InvoicePDF {...pdfData} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invois-${invoice.invoice_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildWhatsAppInvoiceMessage = (pdfUrl?: string) => {
    const name = customer?.name || '';
    const companyName = profile?.company_name || '';
    if (pdfUrl) {
      return `Assalamualaikum ${name},

Terima kasih atas kepercayaan anda kepada *${companyName}*. 🙏

Berikut adalah invois untuk kerja yang telah siap:

🧾 *No. Invois:* ${invoice!.invoice_number}
💰 *Jumlah:* RM ${invoice!.total.toFixed(2)}
📅 *Bayar Sebelum:* ${invoice!.due_date ? formatDate(invoice!.due_date) : '-'}

Sila klik pautan di bawah untuk melihat invois anda:
🔗 ${pdfUrl}

Untuk sebarang pertanyaan, sila hubungi kami.

Terima kasih! 😊
*${companyName}*`;
    }
    // Payment reminder
    return `Assalamualaikum ${name},

Ini adalah peringatan mesra daripada *${companyName}* berkenaan invois yang belum dijelaskan.

🧾 *No. Invois:* ${invoice!.invoice_number}
💰 *Jumlah Perlu Dibayar:* RM ${invoice!.total.toFixed(2)}
📅 *Tarikh Bayaran Akhir:* ${invoice!.due_date ? formatDate(invoice!.due_date) : '-'}

Sila hubungi kami jika ada sebarang pertanyaan atau memerlukan tempoh bayaran lanjutan.

Terima kasih atas kerjasama anda. 🙏
*${companyName}*`;
  };

  const shareViaWhatsApp = async () => {
    if (!invoice || !pdfData || !user || !hasPhone) return;
    setIsSharing(true);
    try {
      const blob = await pdf(<InvoicePDF {...pdfData} />).toBlob();
      const fileName = `${user.id}/${invoice.invoice_number}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('invoice-pdfs')
        .upload(fileName, blob, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('invoice-pdfs').getPublicUrl(fileName);
      const phone = formatPhone(customerPhone);
      const message = buildWhatsAppInvoiceMessage(data.publicUrl);
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      toast.success('PDF berjaya dijana! WhatsApp telah dibuka.');
    } catch (error: any) {
      toast.error('Gagal memuat naik PDF. Semak sambungan internet anda.');
    } finally {
      setIsSharing(false);
    }
  };

  const sendPaymentReminder = () => {
    if (!invoice || !hasPhone) return;
    const phone = formatPhone(customerPhone);
    const message = buildWhatsAppInvoiceMessage();
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
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
        <p className="text-muted-foreground">Invois tidak dijumpai.</p>
        <Button variant="outline" onClick={() => navigate('/invoices')} className="mt-4">Kembali</Button>
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
            <p className="text-sm font-bold text-[#15803D]">✓ Dibayar</p>
            {invoice.paid_date && <p className="text-xs text-[#15803D]">Tarikh Bayaran: {formatDate(invoice.paid_date)}</p>}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices')} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{invoice.invoice_number}</h1>
            <div className="relative inline-flex items-center">
              <select
                value={displayStatus}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  if (newStatus === 'Paid') {
                    setShowInlinePayDate(true);
                    return;
                  }
                  setShowInlinePayDate(false);
                  const { error } = await supabase.from('invoices').update({ status: newStatus }).eq('id', invoice.id).eq('user_id', user!.id);
                  if (!error) {
                    setInvoice({ ...invoice, status: newStatus });
                    toast.success('Status invois dikemaskini!');
                  } else {
                    toast.error('Gagal kemaskini status.');
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
          {/* Inline paid date picker */}
          {showInlinePayDate && (
            <div className="flex items-center gap-2 mt-2">
              <label className="text-sm text-muted-foreground">Tarikh Dibayar:</label>
              <Input type="date" value={inlinePayDate} onChange={e => setInlinePayDate(e.target.value)} className="h-8 w-40 text-sm rounded-lg" />
              <Button size="sm" className="h-8 rounded-lg bg-green-600 hover:bg-green-700" onClick={async () => {
                const { error } = await supabase.from('invoices').update({ status: 'Paid', paid_date: inlinePayDate }).eq('id', invoice.id).eq('user_id', user!.id);
                if (!error) {
                  setInvoice({ ...invoice, status: 'Paid', paid_date: inlinePayDate });
                  setShowInlinePayDate(false);
                  toast.success('Invois ditandakan sebagai Dibayar!');
                } else {
                  toast.error('Gagal kemaskini status.');
                }
              }}>Sahkan</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowInlinePayDate(false)}>Batal</Button>
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {invoice.status === 'Draft' && (
              <DropdownMenuItem onClick={() => navigate(`/invoices/${invoice.id}/edit`)}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Padam</DropdownMenuItem>
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
              <a href={`https://wa.me/${formatPhone(customerPhone)}`} target="_blank" rel="noopener noreferrer"
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
          <div><p className="text-xs text-muted-foreground">Dicipta</p><p className="text-foreground">{formatDate(invoice.created_at)}</p></div>
          {invoice.issued_date && <div><p className="text-xs text-muted-foreground">Tarikh Invois</p><p className="text-foreground">{formatDate(invoice.issued_date)}</p></div>}
          {invoice.due_date && (
            <div>
              <p className="text-xs text-muted-foreground">Bayar Sebelum</p>
              <p className={`${isOverdue ? 'text-[#B91C1C] font-medium' : 'text-foreground'}`}>
                {formatDate(invoice.due_date)}
                {isOverdue && <span className="ml-1 text-xs bg-[#FEE2E2] text-[#B91C1C] px-1.5 py-0.5 rounded-full">TERTUNGGAK</span>}
              </p>
            </div>
          )}
          {invoice.status === 'Paid' && invoice.paid_date && (
            <div><p className="text-xs text-muted-foreground">Tarikh Dibayar</p><p className="text-[#15803D] font-medium">{formatDate(invoice.paid_date)}</p></div>
          )}
        </div>
        {invoice.notes && (
          <div><p className="text-xs text-muted-foreground">Nota</p><p className="text-sm text-foreground whitespace-pre-wrap">{invoice.notes}</p></div>
        )}
      </div>

      {/* LHDN Section */}
      {profile?.lhdn_enabled && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Landmark className="h-3.5 w-3.5" /> Maklumat LHDN
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {profile.tin_number && <div><p className="text-xs text-muted-foreground">TIN Syarikat</p><p>{profile.tin_number}</p></div>}
            {customer?.tin_number && <div><p className="text-xs text-muted-foreground">TIN Pelanggan</p><p>{customer.tin_number}</p></div>}
            {profile.msic_code && <div><p className="text-xs text-muted-foreground">Kod MSIC</p><p>{profile.msic_code}</p></div>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${invoice.lhdn_submitted ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEF3C7] text-[#B45309]'}`}>
              {invoice.lhdn_submitted ? '✓ Dihantar' : 'Belum Dihantar'}
            </span>
          </div>
        </div>
      )}

      {/* Line Items */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Item Kerja</p>
        {/* Desktop */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[1fr_60px_100px_100px] gap-2 text-xs font-medium text-muted-foreground mb-1">
            <span>Penerangan</span><span>Qty</span><span>Harga</span><span className="text-right">Jumlah</span>
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
        {/* Mobile */}
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
        {/* Totals */}
        <div className="border-t border-border pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>RM {invoice.subtotal.toFixed(2)}</span></div>
          {invoice.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Diskaun</span><span>− RM {invoice.discount.toFixed(2)}</span></div>}
          {invoice.tax_rate > 0 && <div className="flex justify-between"><span className="text-muted-foreground">SST ({invoice.tax_rate}%)</span><span>+ RM {sstAmount.toFixed(2)}</span></div>}
          <div className="flex justify-between border-t border-border pt-2">
            <span className="font-bold text-foreground">Jumlah Keseluruhan</span>
            <span className="text-lg font-bold text-primary">RM {invoice.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {invoice.status === 'Draft' && (
          <>
            <Button onClick={() => navigate(`/invoices/${invoice.id}/edit`)} variant="outline" className="flex-1 rounded-lg gap-2"><Edit className="h-4 w-4" /> Edit</Button>
            <Button onClick={() => updateStatus('Sent')} className="flex-1 rounded-lg">Hantar Invois</Button>
          </>
        )}
        {(invoice.status === 'Sent' || isOverdue) && (
          <>
            <Button onClick={() => setPayOpen(true)} className="flex-1 rounded-lg gap-2 bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4" /> Tandakan Dibayar
            </Button>
            {hasPhone && (
              <Button onClick={sendPaymentReminder} variant="outline" className="flex-1 rounded-lg gap-2 text-green-600 border-green-200 hover:bg-green-50">
                <MessageCircle className="h-4 w-4" /> Peringatan via WhatsApp
              </Button>
            )}
          </>
        )}
      </div>

      {/* Payment Info Display */}
      {selectedPMs.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cara Pembayaran</p>
          {selectedPMs.filter((m: any) => m.type === 'bank_transfer').map((b: any) => (
            <div key={b.id} className="border border-border rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium">🏦 Pindahan Bank</p>
              <div className="grid grid-cols-[80px_1fr] gap-1 text-sm">
                <span className="text-muted-foreground">Bank:</span><span>{b.bank_name}</span>
                <span className="text-muted-foreground">Nama:</span><span>{b.account_name}</span>
                <span className="text-muted-foreground">Akaun:</span>
                <span className="flex items-center gap-1.5">
                  {b.account_number}
                  <button onClick={() => { navigator.clipboard.writeText(b.account_number); toast.success('Nombor akaun disalin!'); }} className="text-primary hover:text-primary/80">
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
              <p className="text-xs text-muted-foreground">Imbas untuk membayar</p>
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
            <PDFDownloadLink document={<InvoicePDF {...pdfData} />} fileName={`Invois-${invoice.invoice_number}.pdf`}>
              {({ loading: pdfLoading }) => (
                <Button variant="outline" className="w-full rounded-lg gap-2 text-primary border-primary/30" disabled={pdfLoading}>
                  <Download className="h-4 w-4" /> {pdfLoading ? 'Menjana PDF...' : 'Muat Turun PDF'}
                </Button>
              )}
            </PDFDownloadLink>
          </>
        )}
      </div>

      {/* Mark as Paid Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tandakan sebagai Dibayar?</DialogTitle>
            <DialogDescription>Sahkan bahawa pembayaran telah diterima untuk invois ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tarikh Dibayar</label>
            <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayOpen(false)}>Batal</Button>
            <Button onClick={handleMarkPaid} disabled={paying} className="bg-green-600 hover:bg-green-700">
              {paying ? 'Menyimpan...' : 'Sahkan Bayaran'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Padam Invois?</DialogTitle>
            <DialogDescription>Invois yang dipadam tidak boleh dipulihkan.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? 'Memadam...' : 'Padam'}</Button>
          </DialogFooter>
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
        title={`Pratonton — ${invoice.invoice_number}`}
      />
    </div>
  );
}

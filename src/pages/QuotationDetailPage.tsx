import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ArrowLeft, MoreVertical, Edit, Trash2, User, Briefcase, CalendarDays, MessageCircle, FileText, Download, Loader2 } from 'lucide-react';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import QuotationPDF from '@/components/pdf/QuotationPDF';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

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
  return new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
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
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

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

  const updateStatus = async (newStatus: string) => {
    if (!quotation) return;
    const { error } = await supabase.from('quotations').update({ status: newStatus }).eq('id', quotation.id);
    if (error) { toast.error(error.message); return; }
    setQuotation({ ...quotation, status: newStatus });
    const messages: Record<string, string> = {
      Sent: 'Sebut harga dihantar!',
      Accepted: 'Sebut harga diterima!',
      Rejected: 'Sebut harga ditolak',
    };
    toast.success(messages[newStatus] || 'Status dikemaskini');
  };

  const handleDelete = async () => {
    if (!quotation) return;
    setDeleting(true);
    const { error } = await supabase.from('quotations').delete().eq('id', quotation.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Sebut harga dipadam');
    navigate('/quotations');
  };

  const handleConvertToInvoice = async () => {
    if (!quotation) return;
    setConverting(true);
    try {
      // Generate invoice number
      const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true });
      const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, '0')}`;
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
      toast.success('Invois berjaya dibuat!');
      navigate(`/invoices/${data.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Ralat membuat invois');
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
      logo_url: profile?.logo_url || null,
    },
  } : null;

  const customerPhone = (quotation?.jobs as any)?.customers?.phone || null;
  const hasPhone = !!customerPhone;

  const buildWhatsAppMessage = (customerName: string, quoteNumber: string, total: number, companyName: string, pdfUrl: string) => {
    return `Assalamualaikum / Salam Sejahtera ${customerName},

Terima kasih kerana berminat dengan perkhidmatan kami. 🙏

Berikut adalah sebut harga daripada *${companyName}*:

📋 *No. Sebut Harga:* ${quoteNumber}
💰 *Jumlah:* RM ${total.toFixed(2)}

Sila klik pautan di bawah untuk melihat dan memuat turun sebut harga anda:
🔗 ${pdfUrl}

Jika ada sebarang pertanyaan atau nak buat pengesahan, jangan segan untuk hubungi kami. 😊

Terima kasih!
*${companyName}*`;
  };

  const shareViaWhatsApp = async () => {
    if (!quotation || !pdfData || !user || !hasPhone) return;
    setIsSharing(true);
    try {
      const blob = await pdf(<QuotationPDF {...pdfData} />).toBlob();

      const fileName = `${user.id}/${quotation.quote_number}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('quotation-pdfs')
        .upload(fileName, blob, { contentType: 'application/pdf', upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('quotation-pdfs').getPublicUrl(fileName);
      const pdfUrl = data.publicUrl;

      const phone = customerPhone.replace(/\D/g, '').replace(/^0/, '60');
      const customerName = (quotation.jobs as any)?.customers?.name || '';
      const companyName = profile?.company_name || '';
      const message = buildWhatsAppMessage(customerName, quotation.quote_number, quotation.total, companyName, pdfUrl);

      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      toast.success('PDF berjaya dijana! WhatsApp telah dibuka.');
    } catch (error: any) {
      const msg = error?.message?.includes('bucket') ? 'Ralat sistem. Hubungi sokongan.' : 'Gagal memuat naik PDF. Semak sambungan internet anda.';
      toast.error(msg);
    } finally {
      setIsSharing(false);
    }
  };

  const isExpired = quotation?.valid_until && new Date(quotation.valid_until) < new Date();
  const whatsappUrl = hasPhone ? `https://wa.me/${formatPhone(customerPhone)}` : null;

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
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[quotation.status]}`}>{quotation.status}</span>
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
            {quotation.status === 'Draft' && (
              <DropdownMenuItem onClick={() => navigate(`/quotations/${quotation.id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
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
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full hover:bg-green-100 ml-auto">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
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

        {/* Desktop */}
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

        {/* Mobile */}
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

        {/* Totals */}
        <div className="border-t border-border pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>RM {quotation.subtotal.toFixed(2)}</span>
          </div>
          {quotation.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diskaun</span>
              <span>− RM {quotation.discount.toFixed(2)}</span>
            </div>
          )}
          {quotation.tax_rate > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">SST ({quotation.tax_rate}%)</span>
              <span>+ RM {sstAmount.toFixed(2)}</span>
            </div>
          )}
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
            <Button onClick={() => updateStatus('Accepted')} className="flex-1 rounded-lg bg-green-600 hover:bg-green-700">Diterima</Button>
            <Button onClick={() => updateStatus('Rejected')} variant="outline" className="flex-1 rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10">Ditolak</Button>
          </>
        )}
        {quotation.status === 'Accepted' && (
          <Button onClick={handleConvertToInvoice} disabled={converting} className="flex-1 rounded-lg gap-2">
            <FileText className="h-4 w-4" /> {converting ? 'Membuat invois...' : 'Tukar ke Invois'}
          </Button>
        )}
        {quotation.status === 'Rejected' && (
          <Button onClick={() => navigate(`/quotations/new?job_id=${quotation.job_id}`)} variant="outline" className="flex-1 rounded-lg">Buat Semula</Button>
        )}
      </div>

      {/* PDF Download */}
      <div>
        <PDFDownloadLink
          document={
            <QuotationPDF
              quotation={{
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
              }}
              job={quotation.jobs ? { job_number: quotation.jobs.job_number, title: quotation.jobs.title } : null}
              customer={(quotation.jobs as any)?.customers ? {
                name: (quotation.jobs as any).customers.name,
                phone: (quotation.jobs as any).customers.phone,
                email: (quotation.jobs as any).customers.email,
                address: (quotation.jobs as any).customers.address,
              } : null}
              company={{
                company_name: profile?.company_name || null,
                phone: profile?.phone || null,
                address: profile?.address || null,
                logo_url: profile?.logo_url || null,
              }}
            />
          }
          fileName={`SebuthHarga-${quotation.quote_number}.pdf`}
        >
          {({ loading: pdfLoading }) => (
            <Button variant="outline" className="w-full rounded-lg gap-2 text-primary border-primary/30" disabled={pdfLoading}>
              <Download className="h-4 w-4" />
              {pdfLoading ? 'Menjana PDF...' : 'Muat Turun PDF'}
            </Button>
          )}
        </PDFDownloadLink>
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
    </div>
  );
}

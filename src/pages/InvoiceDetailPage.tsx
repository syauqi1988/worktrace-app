import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { pdf } from '@react-pdf/renderer';
import { toast } from 'sonner';
import { User, Briefcase, Download, ChevronDown, Receipt as ReceiptIcon, Share2, Printer, Loader2, CheckCircle } from 'lucide-react';
import { openWhatsApp } from '@/lib/whatsapp';
import { getDateLocale } from '@/i18n';
import { useL } from '@/i18n/dual';
import { usePlanGate } from '@/hooks/usePlanGate';
import UpgradeModal from '@/components/UpgradeModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import DataFormPage from '@/components/form/DataFormPage';
import DocActionsBar from '@/components/form/DocActionsBar';
import InvoicePDF from '@/components/pdf/InvoicePDF';
import ReceiptPDF from '@/components/pdf/ReceiptPDF';
import PDFPreviewModal from '@/components/pdf/PDFPreviewModal';
import { embedPdfCompanyLogo, imageUrlToBase64 } from '@/utils/imageToBase64';
import { generateAndIncrement } from '@/utils/generateDocNumber';
import { getOrCreateShortLink } from '@/lib/shortLinks';
import { renderTemplate } from '@/lib/whatsappTemplates';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-[#F1F5F9] text-[#64748B]',
  Created: 'bg-[#E0E7FF] text-[#4338CA]',
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
  deductions: Array<{ id?: string; name: string; type: 'fixed' | 'percentage'; value: number }>;
  notes: string | null;
  terms: string | null;
  issued_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  created_at: string;
  job_id: string | null;
  quote_id: string | null;
  selected_payment_methods: any[];
  receipt_number: string | null;
  jobs: {
    id: string; job_number: string; title: string; customer_id: string | null;
    customers: { name: string; phone: string | null; email: string | null; address: string | null; tin_number: string | null } | null;
  } | null;
}

const fmt = (d: string) => new Date(d).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
const waPhone = (p: string | null) => {
  if (!p) return '';
  let c = p.replace(/\D/g, '');
  if (c.startsWith('0')) c = '60' + c.slice(1);
  if (!c.startsWith('60')) c = '60' + c;
  return c;
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const l = useL();
  const { checkWhatsAppShare, upgradeOpen, setUpgradeOpen, upgradeReason } = usePlanGate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoBase64, setLogoBase64] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paying, setPaying] = useState(false);
  const [unpayTo, setUnpayTo] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [sharingReceipt, setSharingReceipt] = useState(false);
  const [preview, setPreview] = useState<{ kind: 'invoice' | 'receipt'; url: string | null; loading: boolean } | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    async function load() {
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
          deductions: Array.isArray(inv.deductions) ? inv.deductions : [],
          selected_payment_methods: Array.isArray(inv.selected_payment_methods) ? inv.selected_payment_methods : [],
        });
      }
      if (active) setLoading(false);
    }
    load();
    const ch = supabase
      .channel(`invoice-detail-${id}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'invoices', filter: `id=eq.${id}` }, () => load())
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user, id]);

  useEffect(() => {
    if (profile?.logo_url) imageUrlToBase64(profile.logo_url).then(setLogoBase64);
    else setLogoBase64('');
  }, [profile?.logo_url]);

  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview?.url]);

  const customer = invoice?.jobs?.customers || null;
  const isOverdue = invoice?.status === 'Sent' && invoice.due_date && new Date(invoice.due_date) < new Date(new Date().toDateString());
  const displayStatus = isOverdue ? 'Overdue' : (invoice?.status || 'Created');

  const company = {
    company_name: profile?.company_name || null,
    phone: profile?.phone || null,
    address: profile?.address || null,
    logo_url: profile?.logo_url || null,
    logo_base64: logoBase64,
    ssm_number_new: profile?.ssm_number_new || null,
    ssm_number_old: profile?.ssm_number_old || null,
  };
  const allPMs: any[] = Array.isArray(profile?.payment_methods) ? profile!.payment_methods : [];
  const selectedPMs = invoice?.selected_payment_methods?.length
    ? allPMs.filter((m: any) => invoice.selected_payment_methods.includes(m.id))
    : allPMs;

  const pdfData = invoice ? {
    invoice: {
      invoice_number: invoice.invoice_number,
      created_at: invoice.created_at,
      issued_date: invoice.issued_date,
      due_date: invoice.due_date,
      paid_date: invoice.paid_date,
      status: invoice.status,
      items: invoice.items.map(i => ({
        description: i.description, description_detail: i.description_detail, qty: i.qty, uom: i.uom,
        unit_price: Number(i.unit_price) || 0, amount: (i.qty || 0) * (Number(i.unit_price) || 0),
      })),
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      tax_rate: invoice.tax_rate,
      total: invoice.total,
      deductions: invoice.deductions,
      notes: invoice.notes,
      terms: invoice.terms || profile?.invoice_terms || null,
    },
    job: invoice.jobs ? { job_number: invoice.jobs.job_number, title: invoice.jobs.title } : null,
    customer: customer ? { ...customer } : null,
    company: {
      ...company,
      lhdn_enabled: profile?.lhdn_enabled, tin_number: profile?.tin_number,
      msic_code: profile?.msic_code, sst_registered: profile?.sst_registered,
    },
    paymentMethods: selectedPMs,
  } : null;

  const receiptData = invoice && invoice.status === 'Paid' && invoice.receipt_number ? {
    receipt: { receipt_number: invoice.receipt_number, payment_date: invoice.paid_date, amount_paid: invoice.total },
    invoice: {
      invoice_number: invoice.invoice_number,
      issued_date: invoice.issued_date,
      items: invoice.items.map(i => ({ description: i.description, qty: i.qty, unit_price: Number(i.unit_price) || 0, amount: (i.qty || 0) * (Number(i.unit_price) || 0) })),
      subtotal: invoice.subtotal, discount: invoice.discount, tax_rate: invoice.tax_rate, total: invoice.total,
    },
    job: invoice.jobs ? { job_number: invoice.jobs.job_number, title: invoice.jobs.title } : null,
    customer: customer ? { name: customer.name, phone: customer.phone, email: customer.email, address: customer.address } : null,
    company,
    paymentMethod: selectedPMs.length ? selectedPMs.map((pm: any) => pm.label || pm.type).join(', ') : undefined,
  } : null;

  const makeBlob = async (kind: 'invoice' | 'receipt') => {
    if (kind === 'invoice') {
      const d = await embedPdfCompanyLogo(pdfData!);
      return pdf(<InvoicePDF {...d} />).toBlob();
    }
    const d = await embedPdfCompanyLogo(receiptData!);
    return pdf(<ReceiptPDF {...d} />).toBlob();
  };

  const openPreview = async (kind: 'invoice' | 'receipt') => {
    setPreview({ kind, url: null, loading: true });
    try {
      const blob = await makeBlob(kind);
      setPreview({ kind, url: URL.createObjectURL(blob), loading: false });
    } catch {
      toast.error(l('Failed to load PDF', 'Gagal memuatkan PDF'));
      setPreview(null);
    }
  };

  const download = async (kind: 'invoice' | 'receipt') => {
    if (!invoice) return;
    const blob = await makeBlob(kind);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = kind === 'invoice' ? `Invois-${invoice.invoice_number}.pdf` : `Resit-${invoice.receipt_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // QuickShare: user-triggered only. Uploads PDF, builds short link, opens share sheet.
  const share = async (kind: 'invoice' | 'receipt') => {
    if (!checkWhatsAppShare() || !invoice || !user) return;
    if (kind === 'receipt' && !receiptData) return;
    const setBusy = kind === 'invoice' ? setSharing : setSharingReceipt;
    setBusy(true);
    try {
      const blob = await makeBlob(kind);
      const bucket = kind === 'invoice' ? 'invoice-pdfs' : 'receipts';
      const fileName = `${user.id}/${kind === 'invoice' ? invoice.invoice_number : invoice.receipt_number}.pdf`;
      await supabase.storage.from(bucket).upload(fileName, blob, { contentType: 'application/pdf', upsert: true });
      const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(fileName, 60 * 60 * 24 * 365);
      const url = await getOrCreateShortLink({ userId: user.id, targetUrl: signed?.signedUrl ?? '', kind });
      const vars = { customer_name: customer?.name || '', company_name: profile?.company_name || '' };
      const details = kind === 'invoice'
        ? [
            t('invoiceDetail.waInvoiceNo', { number: invoice.invoice_number }),
            t('invoiceDetail.waAmount', { amount: invoice.total.toFixed(2) }),
            t('invoiceDetail.waPayBefore', { date: invoice.due_date ? fmt(invoice.due_date) : '-' }),
            '', url,
          ].join('\n')
        : t('invoiceDetail.waReceiptDetails', {
            receiptNumber: invoice.receipt_number, invoiceNumber: invoice.invoice_number,
            amount: invoice.total.toFixed(2), date: invoice.paid_date ? fmt(invoice.paid_date) : '-', url,
          });
      openWhatsApp(waPhone(customer?.phone || null), renderTemplate((profile as any)?.whatsapp_templates, kind, vars, details));
    } catch {
      toast.error(l('Share failed', 'Gagal berkongsi'));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: string) => {
    if (!invoice) return;
    const { error } = await supabase.from('invoices').update({ status }).eq('id', invoice.id);
    if (error) { toast.error(error.message); return; }
    setInvoice({ ...invoice, status });
    toast.success(l('Status updated', 'Status dikemaskini'));
  };

  const onStatusChange = (next: string) => {
    if (!invoice || next === displayStatus) return;
    if (next === 'Paid') { setPayOpen(true); return; }
    if (invoice.status === 'Paid') { setUnpayTo(next); return; }
    setStatus(next === 'Overdue' ? 'Sent' : next);
  };

  const markPaid = async () => {
    if (!invoice || !user) return;
    setPaying(true);
    try {
      const receiptNumber = invoice.receipt_number || await generateAndIncrement(supabase, user.id, 'receipt');
      const { error } = await supabase.from('invoices')
        .update({ status: 'Paid', paid_date: payDate, receipt_number: receiptNumber } as any).eq('id', invoice.id);
      if (error) throw error;
      setInvoice({ ...invoice, status: 'Paid', paid_date: payDate, receipt_number: receiptNumber });
      setPayOpen(false);
      toast.success(l(`Paid — receipt ${receiptNumber} created`, `Dibayar — resit ${receiptNumber} dijana`));
    } catch (e: any) {
      toast.error(e.message || l('Failed to update', 'Gagal dikemaskini'));
    } finally {
      setPaying(false);
    }
  };

  const unmarkPaid = async () => {
    if (!invoice || !unpayTo) return;
    const status = unpayTo === 'Overdue' ? 'Sent' : unpayTo;
    const { error } = await supabase.from('invoices').update({ status, paid_date: null } as any).eq('id', invoice.id);
    setUnpayTo(null);
    if (error) { toast.error(error.message); return; }
    setInvoice({ ...invoice, status, paid_date: null });
    toast.success(l('Status updated — receipt removed from Receipts', 'Status dikemaskini — resit dikeluarkan dari Resit'));
  };

  const handleDelete = async () => {
    if (!invoice) return;
    setDeleting(true);
    const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(l('Invoice deleted', 'Invois dipadam'));
    navigate('/invoices');
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
        <p className="text-muted-foreground">{l('Invoice not found', 'Invois tidak dijumpai')}</p>
        <Button variant="outline" onClick={() => navigate('/invoices')} className="mt-4">{l('Back', 'Kembali')}</Button>
      </div>
    );
  }

  const afterDiscount = invoice.subtotal - invoice.discount;
  const sstAmount = invoice.tax_rate > 0 ? afterDiscount * (invoice.tax_rate / 100) : 0;
  const isPaid = invoice.status === 'Paid';
  const statusLabel: Record<string, string> = {
    Created: l('Created', 'Dicipta'), Sent: l('Sent', 'Dihantar'), Overdue: l('Overdue', 'Tertunggak'), Paid: l('Paid', 'Dibayar'),
  };

  return (
    <>
      <DataFormPage
        breadcrumb={l('Home / Invoices', 'Utama / Invois')}
        title={invoice.invoice_number}
        titleBadge={
          <div className="relative inline-flex items-center">
            <select
              value={displayStatus}
              onChange={e => onStatusChange(e.target.value)}
              className={`appearance-none cursor-pointer rounded-full py-1 pl-3 pr-7 text-[13px] font-medium border-0 outline-none ${STATUS_COLORS[displayStatus] || STATUS_COLORS.Created}`}
              style={{ WebkitAppearance: 'none' }}
            >
              {['Created', 'Sent', 'Overdue', 'Paid'].map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
            </select>
            <ChevronDown className="absolute right-2 h-3 w-3 pointer-events-none opacity-60" />
          </div>
        }
        headerActions={<DocActionsBar
          transfers={[
            { label: l('Mark as Paid (create receipt)', 'Tanda Dibayar (jana resit)'), onClick: () => setPayOpen(true), hidden: isPaid },
          ]}
          onEdit={!isPaid ? () => navigate(`/invoices/${invoice.id}/edit`) : undefined}
          actions={[
            { label: l('Download PDF', 'Muat Turun PDF'), onClick: () => download('invoice'), icon: <Download className="h-4 w-4" /> },
            { label: l('Download Receipt', 'Muat Turun Resit'), onClick: () => download('receipt'), icon: <ReceiptIcon className="h-4 w-4" />, hidden: !receiptData },
          ]}
          onDelete={() => setDeleteOpen(true)}
          onDuplicate={() => navigate(`/invoices/new?duplicate=${invoice.id}`)}
          onPrint={() => openPreview('invoice')}
          onShare={() => share('invoice')}
          sharing={sharing}
        />}
        onBack={() => navigate(-1)}
        onSave={() => navigate(`/invoices/${invoice.id}/edit`)}
        saveDisabled={isPaid}
        saveLabel={l('Edit', 'Edit')}
        sections={[
          ...(receiptData ? [{
            id: 'receipt', title: l('Receipt', 'Resit'), content: (
              <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-[#15803D] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#15803D]">{invoice.receipt_number}</p>
                    <p className="text-xs text-[#15803D]">
                      RM {invoice.total.toFixed(2)} · {invoice.paid_date ? fmt(invoice.paid_date) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openPreview('receipt')}>
                    <Printer className="h-4 w-4" /> {l('View Receipt', 'Lihat Resit')}
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={() => share('receipt')} disabled={sharingReceipt}>
                    {sharingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} {l('QuickShare Receipt', 'Kongsi Pantas Resit')}
                  </Button>
                </div>
              </div>
            ),
          }] : []),
          {
            id: 'info', title: l('General Info', 'Maklumat Am'), content: (
              <div className="bg-card rounded-xl border border-border p-4 space-y-3 min-w-0 overflow-hidden">
                {customer && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{customer.name}</span>
                  </div>
                )}
                {invoice.jobs && (
                  <button onClick={() => navigate(`/jobs/${invoice.jobs!.id}`)} className="flex items-center gap-2 text-sm hover:underline">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-primary font-medium">{invoice.jobs.job_number}</span>
                    <span className="text-muted-foreground">— {invoice.jobs.title}</span>
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{l('Created', 'Dicipta')}</p>
                    <p className="text-foreground">{fmt(invoice.issued_date || invoice.created_at)}</p>
                  </div>
                  {invoice.due_date && (
                    <div>
                      <p className="text-xs text-muted-foreground">{l('Due Date', 'Tarikh Akhir')}</p>
                      <p className={isOverdue ? 'text-[#B91C1C] font-medium' : 'text-foreground'}>{fmt(invoice.due_date)}</p>
                    </div>
                  )}
                </div>
                {invoice.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">{l('Notes', 'Nota')}</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                )}
              </div>
            ),
          },
          {
            id: 'items', title: l('Items', 'Item'), content: (
              <div className="bg-card rounded-xl border border-border p-4 space-y-3 min-w-0 overflow-hidden">
                <div className="hidden lg:block">
                  <div className="grid grid-cols-[minmax(0,1fr)_48px_96px_104px] gap-2 text-xs font-medium text-muted-foreground mb-1">
                    <span>{l('Description', 'Penerangan')}</span><span>{l('Qty', 'Kuantiti')}</span><span>{l('Price', 'Harga')}</span><span className="text-right">{l('Amount', 'Jumlah')}</span>
                  </div>
                  {invoice.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-[minmax(0,1fr)_48px_96px_104px] gap-2 py-1.5 border-b border-border last:border-0 text-sm">
                      <span className="text-foreground break-words min-w-0">{item.description}</span>
                      <span className="text-foreground">{item.qty}</span>
                      <span className="text-foreground">RM {(Number(item.unit_price) || 0).toFixed(2)}</span>
                      <span className="text-right font-medium text-foreground">RM {((item.qty || 0) * (Number(item.unit_price) || 0)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="lg:hidden space-y-2">
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
                  <div className="flex justify-between"><span className="text-muted-foreground">{l('Subtotal', 'Jumlah Kecil')}</span><span>RM {invoice.subtotal.toFixed(2)}</span></div>
                  {invoice.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{l('Discount', 'Diskaun')}</span><span>− RM {invoice.discount.toFixed(2)}</span></div>}
                  {invoice.deductions.map((d, i) => {
                    const amt = d.type === 'percentage' ? (invoice.subtotal * (Number(d.value) || 0)) / 100 : (Number(d.value) || 0);
                    if (amt <= 0 && !d.name) return null;
                    return (
                      <div key={d.id || i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{d.name || l('Deduction', 'Potongan')}{d.type === 'percentage' ? ` (${d.value}%)` : ''}</span>
                        <span className="text-muted-foreground">− RM {amt.toFixed(2)}</span>
                      </div>
                    );
                  })}
                  {invoice.tax_rate > 0 && <div className="flex justify-between"><span className="text-muted-foreground">SST ({invoice.tax_rate}%)</span><span>+ RM {sstAmount.toFixed(2)}</span></div>}
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="font-bold text-foreground">{l('Grand Total', 'Jumlah Besar')}</span>
                    <span className="text-lg font-bold text-primary">RM {invoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{l('Mark as Paid', 'Tanda Dibayar')}</DialogTitle>
            <DialogDescription>{l('A receipt will be created and shown in Sales → Receipts.', 'Resit akan dijana dan dipaparkan di Jualan → Resit.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{l('Payment date', 'Tarikh bayaran')}</p>
            <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayOpen(false)}>{l('Cancel', 'Batal')}</Button>
            <Button onClick={markPaid} disabled={paying}>{paying ? l('Saving...', 'Menyimpan...') : l('Confirm', 'Sahkan')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!unpayTo} onOpenChange={o => !o && setUnpayTo(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{l('Change status from Paid?', 'Tukar status dari Dibayar?')}</DialogTitle>
            <DialogDescription>{l('The receipt will be removed from the Receipts page.', 'Resit akan dikeluarkan dari halaman Resit.')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUnpayTo(null)}>{l('Cancel', 'Batal')}</Button>
            <Button onClick={unmarkPaid}>{l('Confirm', 'Sahkan')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{l('Delete invoice?', 'Padam invois?')}</DialogTitle>
            <DialogDescription>{l('This cannot be undone.', 'Tindakan ini tidak boleh dibatalkan.')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>{l('Cancel', 'Batal')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? l('Deleting...', 'Memadam...') : l('Delete', 'Padam')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PDFPreviewModal
        open={!!preview}
        fileUrl={preview?.url || null}
        loading={!!preview?.loading}
        onClose={() => setPreview(null)}
        onDownload={() => preview && download(preview.kind)}
        onShare={() => { const k = preview?.kind; setPreview(null); if (k) share(k); }}
        title={preview?.kind === 'receipt' ? `${l('Receipt', 'Resit')} ${invoice.receipt_number}` : `${l('Invoice', 'Invois')} ${invoice.invoice_number}`}
      />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
    </>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Loader2, MessageCircle, Eye } from 'lucide-react';
import { ProductPicker } from '@/components/ProductPicker';
import { openWhatsApp } from '@/lib/whatsapp';
import { generateAndIncrement, generateDocNumber, DEFAULT_DOC_SETTINGS } from '@/utils/generateDocNumber';
import { pdf } from '@react-pdf/renderer';
import VariationOrderPDF from '@/components/pdf/VariationOrderPDF';
import PDFPreviewModal from '@/components/pdf/PDFPreviewModal';
import { embedPdfCompanyLogo, imageUrlToBase64 } from '@/utils/imageToBase64';
import { getOrCreateApprovalToken, buildPublicApprovalUrl, uploadApprovalPdf } from '@/lib/approvals';
import { getOrCreateShortLink } from '@/lib/shortLinks';

interface LineItem {
  description: string;
  description_detail?: string;
  qty: number;
  uom?: string;
  unit_price: number;
}

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '60' + cleaned.slice(1);
  if (!cleaned.startsWith('60')) cleaned = '60' + cleaned;
  return cleaned;
}

export default function VoFormPage() {
  const { t } = useTranslation();
  const { jobId, voId } = useParams<{ jobId: string; voId?: string }>();
  const isEdit = !!voId;
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as 'addition' | 'deduction') || 'addition';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<any>(null);
  const [quotation, setQuotation] = useState<any>(null);
  const [logoBase64, setLogoBase64] = useState('');

  const [voNumber, setVoNumber] = useState('');
  const [type, setType] = useState<'addition' | 'deduction'>(initialType);
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ description: '', qty: 1, unit_price: 0 }]);
  const [discountValue, setDiscountValue] = useState(0);
  const [sstEnabled, setSstEnabled] = useState(false);
  const [sstRate, setSstRate] = useState(8);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('Draft');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Load job + quotation
  useEffect(() => {
    if (!user || !jobId) return;
    (async () => {
      const [jobRes, quoRes] = await Promise.all([
        supabase.from('jobs').select('*, customers(id, name, phone, email, address)').eq('id', jobId).single(),
        supabase.from('quotations').select('id, quote_number, total').eq('job_id', jobId).eq('user_id', user.id).maybeSingle(),
      ]);
      setJob(jobRes.data);
      setQuotation(quoRes.data);
    })();
  }, [user, jobId]);

  // Logo
  useEffect(() => {
    if (profile?.logo_url) imageUrlToBase64(profile.logo_url).then(setLogoBase64);
  }, [profile?.logo_url]);

  // Preview number for new
  useEffect(() => {
    if (!user || isEdit) return;
    supabase.from('profiles').select('doc_number_settings').eq('id', user.id).single()
      .then(({ data }) => {
        const s = (data as any)?.doc_number_settings?.vo;
        const merged = { ...DEFAULT_DOC_SETTINGS.vo, ...(s || {}) };
        setVoNumber(generateDocNumber(merged));
        setLoading(false);
      });
  }, [user, isEdit]);

  // Load existing VO
  useEffect(() => {
    if (!isEdit || !user || !voId) return;
    (async () => {
      const { data } = await (supabase as any).from('variation_orders').select('*').eq('id', voId).single();
      if (data) {
        setVoNumber(data.vo_number);
        setType(data.type);
        setReason(data.reason || '');
        setItems(Array.isArray(data.items) && data.items.length ? data.items : [{ description: '', qty: 1, unit_price: 0 }]);
        setDiscountValue(Number(data.discount) || 0);
        const tr = Number(data.sst_rate) || 0;
        if ((Number(data.sst) || 0) > 0) { setSstEnabled(true); setSstRate(tr || 8); }
        setNotes(data.notes || '');
        setStatus(data.status);
      }
      setLoading(false);
    })();
  }, [isEdit, user, voId]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + (i.qty || 0) * (i.unit_price || 0), 0), [items]);
  const afterDiscount = Math.max(0, subtotal - discountValue);
  const sstAmount = sstEnabled ? afterDiscount * ((sstRate || 0) / 100) : 0;
  const total = afterDiscount + sstAmount;

  const updateItem = (idx: number, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };
  const addItem = () => setItems(prev => [...prev, { description: '', qty: 1, unit_price: 0 }]);
  const removeItem = (idx: number) => { if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== idx)); };
  const applyProduct = (idx: number, p: { description: string; description_detail: string; unit_price: number; uom: string }) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, description: p.description, description_detail: p.description_detail, unit_price: p.unit_price, uom: p.uom } : it));
  };

  const buildPdfProps = () => ({
    vo: {
      vo_number: voNumber,
      type,
      reason,
      items: items.filter(i => i.description.trim()).map(i => ({ ...i, amount: (i.qty || 0) * (i.unit_price || 0) })),
      subtotal,
      discount: discountValue,
      tax_rate: sstEnabled ? sstRate : 0,
      total,
      notes,
      created_at: new Date().toISOString(),
    },
    job: job ? { job_number: job.job_number, title: job.title } : null,
    quotation: quotation ? { quote_number: quotation.quote_number, total: Number(quotation.total) } : null,
    customer: job?.customers ? { name: job.customers.name, phone: job.customers.phone, email: job.customers.email, address: job.customers.address } : null,
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

  const handlePreview = async () => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const blob = await pdf(<VariationOrderPDF {...buildPdfProps()} />).toBlob();
      setPreviewUrl(URL.createObjectURL(blob));
    } finally {
      setPreviewLoading(false);
    }
  };

  const validate = () => {
    if (!reason.trim()) { toast.error(t('vo.errReason')); return false; }
    if (!items.some(i => i.description.trim())) { toast.error(t('vo.errItems')); return false; }
    return true;
  };

  const saveVo = async (newStatus: 'Draft' | 'Sent') => {
    if (!validate() || !user || !jobId) return null;
    let finalNumber = voNumber;
    if (!isEdit) finalNumber = await generateAndIncrement(supabase, user.id, 'vo');

    const payload: any = {
      user_id: user.id,
      job_id: jobId,
      vo_number: finalNumber,
      type,
      reason: reason.trim(),
      items: items.filter(i => i.description.trim()).map(i => ({ ...i, amount: (i.qty || 0) * (i.unit_price || 0) })),
      subtotal,
      discount: discountValue,
      discount_type: 'fixed',
      sst: sstAmount,
      sst_rate: sstEnabled ? sstRate : 0,
      total,
      notes: notes.trim() || null,
      status: newStatus,
    };

    if (isEdit) {
      const { error } = await (supabase as any).from('variation_orders').update(payload).eq('id', voId);
      if (error) throw error;
      return voId!;
    } else {
      const { data, error } = await (supabase as any).from('variation_orders').insert(payload).select('id').single();
      if (error) throw error;
      return data.id as string;
    }
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      await saveVo('Draft');
      toast.success('Draf disimpan');
      navigate(`/jobs/${jobId}`);
    } catch (e: any) {
      toast.error(e.message || 'Gagal simpan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateAndSend = async () => {
    if (!validate() || !user || !job) return;
    setSubmitting(true);
    const popup = window.open('', '_blank');
    try {
      const id = await saveVo('Sent');
      if (!id) throw new Error('Save failed');

      const pdfData = await embedPdfCompanyLogo(buildPdfProps());
      const blob = await pdf(<VariationOrderPDF {...pdfData} />).toBlob();
      const pdfUrl = await uploadApprovalPdf({
        bucket: 'vo-pdfs',
        userId: user.id,
        documentId: id,
        documentNumber: voNumber,
        blob,
      });
      await (supabase as any).from('variation_orders').update({ pdf_url: pdfUrl }).eq('id', id);

      const token = await getOrCreateApprovalToken({
        userId: user.id,
        documentId: id,
        documentType: 'variation_order',
        customerName: job.customers?.name || null,
        customerEmail: job.customers?.email || null,
        pdfUrl,
        expiresInDays: 30,
      });
      const approvalUrl = buildPublicApprovalUrl(token);
      const shortUrl = await getOrCreateShortLink({ userId: user.id, targetUrl: approvalUrl, kind: 'approval' });

      const isDed = type === 'deduction';
      const docLabel = isDed ? 'Borang Potongan' : 'Variation Order';
      const amount = `${isDed ? '-' : '+'}RM ${total.toFixed(2)}`;
      const message = `Assalamualaikum ${job.customers?.name || 'Pelanggan'},

Sila semak ${docLabel} berkaitan kerja anda:

📋 *No.:* ${voNumber}
🔧 *Kerja:* ${job.title}
📝 *Sebab:* ${reason}
💰 *${isDed ? 'Potongan' : 'Tambahan Kos'}:* ${amount}

✅ Untuk Lihat PDF dan TERIMA atau TOLAK, klik:
🔗 ${shortUrl}

Pautan sah selama 30 hari.

*${profile?.company_name || ''}*`;

      const phone = job.customers?.phone ? formatPhone(job.customers.phone) : '';
      openWhatsApp(phone || undefined, message, popup);

      toast.success('VO dihantar');
      navigate(`/jobs/${jobId}`);
    } catch (e: any) {
      if (popup) popup.close();
      toast.error(e.message || 'Gagal hantar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-4 md:p-6 space-y-3"><Skeleton className="h-8 w-40" /><Skeleton className="h-32 w-full" /></div>;
  }

  const isDed = type === 'deduction';

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl pb-28 md:pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">
          {isEdit ? 'Edit ' : ''}{isDed ? 'Borang Potongan' : 'Variation Order'}
        </h1>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          isDed ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {isDed ? '➖ Potongan' : '➕ Tambahan Kerja'}
        </span>
      </div>

      {/* Header info */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>No. VO</Label>
            <Input value={voNumber} onChange={e => setVoNumber(e.target.value)} className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label>Jenis</Label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setType('addition')}
                className={`flex-1 h-10 rounded-md border text-sm font-medium ${type === 'addition' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-input bg-background'}`}>
                ➕ Tambahan
              </button>
              <button type="button" onClick={() => setType('deduction')}
                className={`flex-1 h-10 rounded-md border text-sm font-medium ${type === 'deduction' ? 'bg-red-50 border-red-500 text-red-700' : 'border-input bg-background'}`}>
                ➖ Potongan
              </button>
            </div>
          </div>
        </div>

        {job?.customers && (
          <div className="text-sm">
            <p className="text-xs text-muted-foreground">Pelanggan</p>
            <p className="font-medium">{job.customers.name}</p>
            {job && <p className="text-xs text-muted-foreground">{job.job_number} — {job.title}</p>}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Sebab / Alasan *</Label>
          <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder={isDed
              ? 'cth: Potongan kerana cat di ruang tamu tidak siap mengikut spesifikasi'
              : 'cth: Kerja tambahan ditemui semasa kerja asal — pendawaian tambahan diperlukan di bilik stor'} />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        <Label>Item</Label>
        <div className="hidden md:block">
          <div className="grid grid-cols-[40px_1fr_70px_70px_110px_110px_36px] gap-2 text-xs font-medium text-muted-foreground mb-1 px-1">
            <span></span><span>Keterangan</span><span>Qty</span><span>UOM</span><span>Harga</span><span>Jumlah</span><span></span>
          </div>
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-[40px_1fr_70px_70px_110px_110px_36px] gap-2 mb-2 items-start">
              <ProductPicker onPick={(p) => applyProduct(i, p)} />
              <div className="space-y-1">
                <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Nama item" className="text-sm" />
                <Textarea value={item.description_detail || ''} onChange={e => updateItem(i, 'description_detail' as any, e.target.value)} placeholder="Butiran (pilihan)" rows={2} className="text-xs" />
              </div>
              <Input type="number" min={0} value={item.qty || ''} onChange={e => updateItem(i, 'qty', e.target.value === '' ? 0 : Number(e.target.value))} className="text-sm" />
              <Input value={item.uom || ''} onChange={e => updateItem(i, 'uom' as any, e.target.value)} placeholder="unit" className="text-sm" />
              <Input type="number" min={0} step="0.01" value={item.unit_price || ''} onChange={e => updateItem(i, 'unit_price', Number(e.target.value) || 0)} className="text-sm" />
              <div className={`flex items-center px-3 text-sm font-medium rounded-md h-10 ${isDed ? 'bg-red-50 text-red-700' : 'bg-muted text-foreground'}`}>
                {isDed ? '-' : ''}RM {((item.qty || 0) * (item.unit_price || 0)).toFixed(2)}
              </div>
              <button onClick={() => removeItem(i)} disabled={items.length <= 1}
                className="flex items-center justify-center h-10 text-muted-foreground hover:text-destructive disabled:opacity-30">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Mobile */}
        <div className="md:hidden space-y-3">
          {items.map((item, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-3 space-y-2 relative">
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <div className="flex gap-2">
                <ProductPicker onPick={(p) => applyProduct(i, p)} />
                <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Nama item" className="text-sm flex-1" />
              </div>
              <Textarea value={item.description_detail || ''} onChange={e => updateItem(i, 'description_detail' as any, e.target.value)} placeholder="Butiran" rows={2} className="text-xs" />
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" min={0} value={item.qty || ''} onChange={e => updateItem(i, 'qty', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="Qty" className="text-sm" />
                <Input value={item.uom || ''} onChange={e => updateItem(i, 'uom' as any, e.target.value)} placeholder="UOM" className="text-sm" />
                <Input type="number" min={0} step="0.01" value={item.unit_price || ''} onChange={e => updateItem(i, 'unit_price', Number(e.target.value) || 0)} placeholder="Harga" className="text-sm" />
              </div>
              <div className={`text-sm font-semibold ${isDed ? 'text-red-700' : 'text-foreground'}`}>
                {isDed ? '-' : ''}RM {((item.qty || 0) * (item.unit_price || 0)).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addItem} className="gap-1.5">
          <Plus className="h-4 w-4" /> Tambah Item
        </Button>
      </div>

      {/* Totals */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span className="font-medium">RM {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span>Diskaun (RM)</span>
          <Input type="number" min={0} step="0.01" value={discountValue || ''} onChange={e => setDiscountValue(Number(e.target.value) || 0)} className="w-32 h-8 text-sm text-right" />
        </div>
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <Switch checked={sstEnabled} onCheckedChange={setSstEnabled} />
            <span>SST {sstEnabled && `(${sstRate}%)`}</span>
          </div>
          {sstEnabled && (
            <Input type="number" min={0} max={20} step="0.01" value={sstRate} onChange={e => setSstRate(Number(e.target.value) || 0)} className="w-20 h-8 text-sm text-right" />
          )}
        </div>
        <div className={`flex justify-between text-base font-bold pt-3 border-t border-border ${isDed ? 'text-red-700' : 'text-foreground'}`}>
          <span>{isDed ? 'Potongan' : 'Jumlah'}</span>
          <span>{isDed ? '-' : ''}RM {total.toFixed(2)}</span>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Nota Tambahan (pilihan)</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handlePreview} className="gap-2">
          <Eye className="h-4 w-4" /> Pratonton PDF
        </Button>
        <Button variant="outline" onClick={handleSaveDraft} disabled={submitting} className="gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Simpan Draf
        </Button>
        <Button onClick={handleGenerateAndSend} disabled={submitting} className="gap-2 text-white" style={{ backgroundColor: '#25D366' }}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          Jana PDF & Hantar WhatsApp
        </Button>
      </div>

      <PDFPreviewModal
        fileUrl={previewUrl}
        loading={previewLoading}
        onClose={() => { setPreviewOpen(false); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
        onDownload={async () => {
          if (previewUrl) {
            const a = document.createElement('a');
            a.href = previewUrl;
            a.download = `${voNumber}.pdf`;
            a.click();
          }
        }}
        open={previewOpen}
        title={`Pratonton ${voNumber}`}
      />
    </div>
  );
}

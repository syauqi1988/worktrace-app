import { useState, useEffect, useMemo } from 'react';
import { openWhatsApp, buildWhatsAppUrl } from '@/lib/whatsapp';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, AlertCircle, Loader2, Eye, MessageCircle } from 'lucide-react';
import { generateAndIncrement } from '@/utils/generateDocNumber';
import { pdf } from '@react-pdf/renderer';
import WorkOrderPDF from '@/components/pdf/WorkOrderPDF';
import PDFPreviewModal from '@/components/pdf/PDFPreviewModal';
import { embedPdfCompanyLogo, imageUrlToBase64 } from '@/utils/imageToBase64';
import { usePlanGate } from '@/hooks/usePlanGate';
import { getOrCreateApprovalToken, buildPublicApprovalUrl, uploadApprovalPdf } from '@/lib/approvals';
import { getOrCreateShortLink } from '@/lib/shortLinks';
import { renderTemplate } from '@/lib/whatsappTemplates';

interface JobRow {
  id: string;
  job_number: string;
  title: string;
  customer_id: string | null;
  customers: { name: string; phone: string | null; email: string | null; address: string | null } | null;
}

interface QuotationRow {
  id: string;
  quote_number: string;
  status: string;
  items: any;
  total: number;
}

interface LineItem {
  description: string;
  qty: number;
  unit_price: number;
}

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '60' + cleaned.slice(1);
  if (!cleaned.startsWith('60')) cleaned = '60' + cleaned;
  return cleaned;
}

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

const DEFAULT_TERMS = `1. Kerja dilaksanakan mengikut spesifikasi dipersetujui.
2. Perubahan skop memerlukan kelulusan bertulis.
3. Pembayaran dalam 14 hari dari tarikh invois.`;

export default function WorkOrderFormPage() {
  const { t } = useTranslation();
  const { id: jobId } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const editWoId = search.get('wo_id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [job, setJob] = useState<JobRow | null>(null);
  const [quotation, setQuotation] = useState<QuotationRow | null>(null);
  const [woNumber, setWoNumber] = useState('');
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('');
  const [location, setLocation] = useState('');
  const [technician, setTechnician] = useState('');
  const [instructions, setInstructions] = useState('');
  const [terms, setTerms] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ description: '', qty: 1, unit_price: 0 }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [logoBase64, setLogoBase64] = useState('');
  const [sharing, setSharing] = useState(false);
  const [existingWo, setExistingWo] = useState<{ id: string; status: string } | null>(null);
  const { checkWhatsAppShare } = usePlanGate();

  const total = useMemo(
    () => items.reduce((sum, i) => sum + (i.qty || 0) * (i.unit_price || 0), 0),
    [items]
  );

  useEffect(() => {
    if (profile?.logo_url) imageUrlToBase64(profile.logo_url).then(setLogoBase64);
    else setLogoBase64('');
  }, [profile?.logo_url]);

  useEffect(() => {
    if (!user || !jobId) return;
    async function load() {
      // Fetch job + quotation
      const [jobRes, quoRes, woRes] = await Promise.all([
        supabase.from('jobs')
          .select('id, job_number, title, customer_id, customers(name, phone, email, address)')
          .eq('id', jobId).single(),
        supabase.from('quotations')
          .select('id, quote_number, status, items, total')
          .eq('job_id', jobId).eq('user_id', user!.id).eq('status', 'Accepted').maybeSingle(),
        supabase.from('work_orders')
          .select('id, status')
          .eq('job_id', jobId).eq('user_id', user!.id)
          .in('status', ['Draft', 'Sent', 'Accepted'])
          .order('created_at', { ascending: false })
          .limit(1).maybeSingle(),
      ]);

      const j = jobRes.data as unknown as JobRow;
      setJob(j);
      const q = quoRes.data as unknown as QuotationRow | null;
      setQuotation(q);

      // Load existing WO if editing
      if (editWoId) {
        const { data: woData } = await supabase.from('work_orders')
          .select('*')
          .eq('id', editWoId).eq('user_id', user!.id).single();
        if (woData) {
          const w = woData as any;
          setWoNumber(w.wo_number);
          setTitle(w.title || '');
          setScope(w.scope_of_work || '');
          setStartDate(w.scheduled_start_date || '');
          setEndDate(w.scheduled_end_date || '');
          setDuration(w.estimated_duration || '');
          setLocation(w.location || '');
          setTechnician(w.technician_name || '');
          setInstructions(w.special_instructions || '');
          setTerms(w.terms || DEFAULT_TERMS);
          setItems(Array.isArray(w.items) && w.items.length ? w.items : [{ description: '', qty: 1, unit_price: 0 }]);
          setLoading(false);
          return;
        }
      } else {
        // New WO — block if active WO exists
        if (woRes.data) {
          setExistingWo(woRes.data as any);
          setLoading(false);
          return;
        }
      }

      // Pre-fill defaults for new WO
      setTitle(j?.title || '');
      setLocation(j?.customers?.address || '');
      setTechnician(profile?.company_name || '');
      setTerms(profile?.quotation_terms || DEFAULT_TERMS);

      if (q && Array.isArray(q.items) && q.items.length) {
        setItems(q.items as LineItem[]);
        // Build scope from quotation items
        const scopeText = (q.items as LineItem[])
          .map((it, i) => `${i + 1}. ${it.description} (Qty: ${it.qty})`)
          .join('\n');
        setScope(scopeText);
      }

      // Generate WO number
      if (!editWoId) {
        const num = await generateAndIncrement(supabase, user!.id, 'work_order');
        setWoNumber(num);
        // Note: this increments the counter. If user cancels, they lose this number — accepted tradeoff.
      }
      setLoading(false);
    }
    load();
  }, [user, jobId, editWoId, profile?.company_name, profile?.quotation_terms]);

  const updateItem = (i: number, field: keyof LineItem, val: string | number) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  };
  const addItem = () => items.length < 20 && setItems(prev => [...prev, { description: '', qty: 1, unit_price: 0 }]);
  const removeItem = (i: number) => items.length > 1 && setItems(prev => prev.filter((_, idx) => idx !== i));

  const buildPdfData = () => ({
    wo: {
      wo_number: woNumber,
      title,
      scope_of_work: scope,
      scheduled_start_date: startDate || null,
      scheduled_end_date: endDate || null,
      estimated_duration: duration || null,
      location: location || null,
      technician_name: technician || null,
      special_instructions: instructions || null,
      terms: terms || null,
      status: 'Sent',
      items: items.filter(i => i.description.trim()),
      total,
      created_at: new Date().toISOString(),
    },
    job: job ? { job_number: job.job_number, title: job.title } : null,
    quotation: quotation ? { quote_number: quotation.quote_number } : null,
    customer: job?.customers || null,
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

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = t('workOrderForm.errTitle');
    if (!scope.trim()) e.scope = t('workOrderForm.errScope');
    return e;
  };

  const handleSave = async (status: 'Draft' | 'Sent', share = false) => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (!user || !jobId) return;

    setSaving(true);
    try {
      const payload: any = {
        user_id: user.id,
        job_id: jobId,
        quotation_id: quotation?.id || null,
        wo_number: woNumber,
        title: title.trim(),
        scope_of_work: scope.trim(),
        scheduled_start_date: startDate || null,
        scheduled_end_date: endDate || null,
        estimated_duration: duration.trim() || null,
        location: location.trim() || null,
        technician_name: technician.trim() || null,
        special_instructions: instructions.trim() || null,
        terms: terms.trim() || null,
        status: editWoId ? status : (status === 'Draft' ? 'Created' : status),
        items: items.filter(i => i.description.trim()) as any,
        total,
      };

      let savedId: string;
      if (editWoId) {
        const { error } = await supabase.from('work_orders').update(payload).eq('id', editWoId);
        if (error) throw error;
        savedId = editWoId;
      } else {
        const { data, error } = await supabase.from('work_orders').insert(payload).select('id').single();
        if (error) throw error;
        savedId = data.id;
      }

      if (share && status === 'Sent' && job?.customers?.phone) {
        if (!checkWhatsAppShare()) { setSaving(false); return; }
        await shareViaWhatsApp(savedId);
      }

      toast.success(t('workOrderForm.savedDraft'));
      navigate(`/jobs/${jobId}/work-order`);
    } catch (err: any) {
      toast.error(err.message || t('forms.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  const shareViaWhatsApp = async (woId: string) => {
    if (!job?.customers?.phone) return;
    setSharing(true);
    try {
      const pdfData = await embedPdfCompanyLogo(buildPdfData());
      const blob = await pdf(<WorkOrderPDF {...pdfData} />).toBlob();
      const pdfUrl = await uploadApprovalPdf({
        bucket: 'work-order-pdfs',
        userId: user!.id,
        documentId: woId,
        documentNumber: woNumber,
        blob,
      });

      const token = await getOrCreateApprovalToken({
        userId: user!.id,
        documentId: woId,
        documentType: 'work_order',
        customerName: job.customers.name,
        customerEmail: job.customers.email || null,
        pdfUrl,
        expiresInDays: 30,
      });
      const fullUrl = buildPublicApprovalUrl(token);
      const approvalUrl = await getOrCreateShortLink({ userId: user!.id, targetUrl: fullUrl, kind: 'approval' });

      const phone = formatPhone(job.customers.phone);
      const companyName = profile?.company_name || '';
      const details = t('workOrderForm.waDetails', {
        number: woNumber,
        title,
        startDate: formatDate(startDate),
        location: location || '-',
        url: approvalUrl,
      });
      const msg = renderTemplate(
        (profile as any)?.whatsapp_templates,
        'work_order',
        { customer_name: job.customers.name, company_name: companyName },
        details,
      );
      openWhatsApp(phone, msg);
    } catch {
      toast.error(t('workOrderForm.shareFailed'));
    } finally {
      setSharing(false);
    }
  };

  const handlePreview = async () => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const pdfData = await embedPdfCompanyLogo(buildPdfData());
      const blob = await pdf(<WorkOrderPDF {...pdfData} />).toBlob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      toast.error(t('workOrderForm.previewFailed'));
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
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
        <p className="text-muted-foreground">{t('workOrderForm.jobNotFound')}</p>
        <Button variant="outline" onClick={() => navigate('/jobs')} className="mt-4">{t('forms.back')}</Button>
      </div>
    );
  }

  if (existingWo && !editWoId) {
    return (
      <div className="p-4 md:p-6 space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">{t('workOrderForm.new')}</h1>
        </div>
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[#B45309]" />
            <h2 className="text-base font-bold text-[#B45309]">{t('workOrderForm.activeExistsTitle')}</h2>
          </div>
          <p className="text-sm text-[#B45309]">{t('workOrderForm.activeExistsBody')}</p>
          <Button onClick={() => navigate(`/jobs/${jobId}`)} className="rounded-lg">{t('workOrderForm.backToJob')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl pb-28 md:pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{editWoId ? t('workOrderForm.edit') : t('workOrderForm.new')}</h1>
          <p className="text-sm text-muted-foreground">{woNumber}</p>
        </div>
      </div>

      {/* Job context */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('workOrderForm.jobInfo')}</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><p className="text-xs text-muted-foreground">{t('workOrderForm.jobNumber')}</p><p className="font-medium text-foreground">{job.job_number}</p></div>
          <div><p className="text-xs text-muted-foreground">{t('workOrderForm.customer')}</p><p className="text-foreground">{job.customers?.name || '-'}</p></div>
          {quotation && (
            <div className="col-span-2"><p className="text-xs text-muted-foreground">{t('workOrderForm.quoteNumber')}</p><p className="text-primary font-medium">{quotation.quote_number}</p></div>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t('workOrderForm.title')}</Label>
        <Input value={title} onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }} />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>{t('workOrderForm.scope')}</Label>
        <Textarea rows={6} value={scope} onChange={e => { setScope(e.target.value); setErrors(p => ({ ...p, scope: '' })); }}
          placeholder={t('workOrderForm.scopePlaceholder')} />
        {errors.scope && <p className="text-xs text-destructive">{errors.scope}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t('workOrderForm.startDate')}</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t('workOrderForm.endDate')}</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t('workOrderForm.duration')}</Label>
        <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder={t('workOrderForm.durationPlaceholder')} />
      </div>

      <div className="space-y-1.5">
        <Label>{t('workOrderForm.location')}</Label>
        <Input value={location} onChange={e => setLocation(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>{t('workOrderForm.technician')}</Label>
        <Input value={technician} onChange={e => setTechnician(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>{t('workOrderForm.instructions')}</Label>
        <Textarea rows={3} value={instructions} onChange={e => setInstructions(e.target.value)} />
      </div>

      {/* Items */}
      <div className="space-y-3">
        <Label>{t('workOrderForm.items')}</Label>
        {items.map((item, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder={t('forms.itemPlaceholder')} className="flex-1 text-sm" />
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive p-2"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><p className="text-xs text-muted-foreground mb-1">{t('forms.itemQty')}</p><Input type="number" min={1} value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value) || 0)} className="text-sm" /></div>
              <div><p className="text-xs text-muted-foreground mb-1">{t('forms.itemUnitPriceRm')}</p><Input type="number" min={0} step="0.01" value={item.unit_price || ''} onChange={e => updateItem(i, 'unit_price', Number(e.target.value) || 0)} className="text-sm" /></div>
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={addItem} disabled={items.length >= 20} className="gap-1.5 rounded-lg text-sm"><Plus className="h-4 w-4" /> {t('forms.addItem')}</Button>
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-sm font-medium">{t('workOrderForm.itemsTotal')}</span>
          <span className="text-base font-bold text-primary">RM {total.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t('workOrderForm.termsLabel')}</Label>
        <Textarea rows={5} value={terms} onChange={e => setTerms(e.target.value)} />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button onClick={() => handleSave('Draft')} disabled={saving} className="rounded-lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2 inline" /> : null}
          {t('workOrderForm.saveDraft')}
        </Button>
        <Button variant="outline" onClick={handlePreview} className="rounded-lg gap-2">
          <Eye className="h-4 w-4" /> {t('workOrderForm.previewPdf')}
        </Button>
      </div>

      <PDFPreviewModal
        open={previewOpen}
        title={t('workOrderForm.previewTitle', { number: woNumber })}
        loading={previewLoading}
        fileUrl={previewUrl}
        onClose={() => { setPreviewOpen(false); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
        onDownload={() => {
          if (!previewUrl) return;
          const a = document.createElement('a');
          a.href = previewUrl;
          a.download = `WorkOrder-${woNumber}.pdf`;
          a.click();
        }}
      />
    </div>
  );
}

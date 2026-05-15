import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Search, Plus, X, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { autoUpdateJobStatus } from '@/utils/autoUpdateJobStatus';
import { generateAndIncrement, generateDocNumber, DEFAULT_DOC_SETTINGS } from '@/utils/generateDocNumber';
import { ProductPicker } from '@/components/ProductPicker';

interface Job {
  id: string;
  job_number: string;
  title: string;
  customer_id: string | null;
  products?: any[] | null;
  customers: { name: string; phone: string | null } | null;
}

interface LineItem {
  description: string;
  description_detail?: string;
  qty: number;
  uom?: string;
  unit_price: number;
}

export default function QuotationFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobSearch, setJobSearch] = useState('');
  const [jobDropdownOpen, setJobDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [quoteNumber, setQuoteNumber] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ description: '', qty: 1, unit_price: 0 }]);
  const [discountMode, setDiscountMode] = useState<'rm' | 'pct'>('rm');
  const [discountValue, setDiscountValue] = useState(0);
  const [sstEnabled, setSstEnabled] = useState(false);
  const [sstRate, setSstRate] = useState(8);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingQuotation, setExistingQuotation] = useState<{ id: string } | null>(null);
  const [jobWarning, setJobWarning] = useState<{ message: string; link: string } | null>(null);
  const [saveDisabled, setSaveDisabled] = useState(false);
  const [blockedJobId, setBlockedJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('jobs').select('id, job_number, title, customer_id, products, customers(name, phone)').order('created_at', { ascending: false })
      .then(({ data }) => setJobs((data as unknown as Job[]) || []));
  }, [user]);

  // Helper: auto-fill items from job.products if current items are empty/default
  const tryAutoFillFromJob = (j: any) => {
    const jobProducts = Array.isArray(j?.products) ? j.products : [];
    if (!jobProducts.length) return;
    const isDefaultEmpty = items.length === 1 && !items[0].description.trim() && !items[0].unit_price;
    if (!isDefaultEmpty) return;
    setItems(jobProducts.map((p: any) => ({
      description: p.description || '',
      description_detail: p.description_detail || '',
      qty: Number(p.qty) || 1,
      uom: p.uom || '',
      unit_price: Number(p.unit_price) || 0,
    })));
    toast.success('Produk dari kerja diisi automatik');
  };

  // Preview the next quote number from user's doc_number_settings (no increment)
  useEffect(() => {
    if (!user || isEdit) return;
    supabase.from('profiles').select('doc_number_settings').eq('id', user.id).single()
      .then(({ data }) => {
        const settings = (data as any)?.doc_number_settings?.quotation;
        const merged = { ...DEFAULT_DOC_SETTINGS.quotation, ...(settings || {}) };
        setQuoteNumber(generateDocNumber(merged));
      });
  }, [user, isEdit]);

  useEffect(() => {
    const jobId = searchParams.get('job_id');
    if (jobId && jobs.length > 0 && !selectedJob) {
      const found = jobs.find(j => j.id === jobId);
      if (found) {
        setSelectedJob(found);
        if (!isEdit) tryAutoFillFromJob(found);
      }
      if (user && !isEdit) {
        supabase.from('quotations').select('id').eq('job_id', jobId).eq('user_id', user.id).maybeSingle()
          .then(({ data }) => {
            if (data) { setExistingQuotation(data); setBlockedJobId(jobId); }
          });
      }
    }
  }, [searchParams, jobs, selectedJob, user, isEdit]);

  useEffect(() => {
    if (!isEdit || !user || !id) return;
    async function fetchQuotation() {
      const { data } = await supabase.from('quotations')
        .select('*, jobs(id, job_number, title, customer_id, customers(name, phone))')
        .eq('id', id).single();
      if (data) {
        const q = data as any;
        if (q.status === 'Rejected') {
          toast.error(t('quotationForm.rejectedNoEdit'));
          navigate(`/quotations/${id}`, { replace: true });
          return;
        }
        setSelectedJob(q.jobs);
        setQuoteNumber(q.quote_number);
        setItems(Array.isArray(q.items) ? q.items : [{ description: '', qty: 1, unit_price: 0 }]);
        setNotes(q.notes || '');
        setValidUntil(q.valid_until || '');
        setTerms(q.terms || '');
        const storedDiscount = Number(q.discount) || 0;
        setDiscountMode('rm');
        setDiscountValue(storedDiscount);
        const storedTaxRate = Number(q.tax_rate) || 0;
        if (storedTaxRate > 0) { setSstEnabled(true); setSstRate(storedTaxRate); }
        setEditStatus(q.status);
      }
      setLoading(false);
    }
    fetchQuotation();
  }, [isEdit, user, id, navigate]);

  useEffect(() => {
    if (!isEdit && profile?.quotation_terms && !terms) {
      setTerms(profile.quotation_terms);
    }
  }, [isEdit, profile]);

  useEffect(() => {
    if (!isEdit && jobs.length >= 0) setLoading(false);
  }, [isEdit, jobs]);

  const filteredJobs = jobSearch.trim()
    ? jobs.filter(j =>
        j.job_number.toLowerCase().includes(jobSearch.toLowerCase()) ||
        j.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
        (j.customers?.name || '').toLowerCase().includes(jobSearch.toLowerCase())
      )
    : jobs;

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.qty || 0) * (item.unit_price || 0), 0), [items]);
  const discountAmount = useMemo(() => {
    if (discountMode === 'pct') return subtotal * ((discountValue || 0) / 100);
    return discountValue || 0;
  }, [subtotal, discountMode, discountValue]);
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const sstAmount = sstEnabled ? afterDiscount * ((sstRate || 0) / 100) : 0;
  const grandTotal = afterDiscount + sstAmount;

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };
  const addItem = () => { if (items.length >= 20) return; setItems(prev => [...prev, { description: '', description_detail: '', qty: 1, uom: '', unit_price: 0 }]); };
  const removeItem = (index: number) => { if (items.length <= 1) return; setItems(prev => prev.filter((_, i) => i !== index)); };
  const applyProduct = (index: number, p: { description: string; description_detail: string; unit_price: number; uom: string }) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, description: p.description, description_detail: p.description_detail, unit_price: p.unit_price, uom: p.uom } : it));
  };

  const handleSave = async (status: 'Draft' | 'Sent') => {
    const newErrors: Record<string, string> = {};
    if (!selectedJob) newErrors.job = t('quotationForm.errJob');
    if (!items.some(i => i.description.trim())) newErrors.items = t('quotationForm.errItems');
    if (items.some(i => i.unit_price < 0)) newErrors.items = t('quotationForm.errPriceNeg');
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setSubmitting(true);
    try {
      const saveStatus = isEdit && editStatus && editStatus !== 'Draft' ? editStatus : status;
      // For new quotations, atomically generate-and-increment to avoid duplicates
      let finalNumber = quoteNumber;
      if (!isEdit) {
        finalNumber = await generateAndIncrement(supabase, user!.id, 'quotation');
      }
      const payload = {
        user_id: user!.id,
        job_id: selectedJob!.id,
        quote_number: finalNumber,
        items: items.filter(i => i.description.trim()) as any,
        subtotal,
        discount: discountAmount,
        tax_rate: sstEnabled ? sstRate : 0,
        total: grandTotal,
        status: saveStatus,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        valid_until: validUntil || null,
      };

      if (isEdit) {
        const { error } = await supabase.from('quotations').update(payload).eq('id', id);
        if (error) throw error;
        toast.success(t('quotationForm.savedEdit'));
        navigate(`/quotations/${id}`);
      } else {
        const { data, error } = await supabase.from('quotations').insert(payload).select('id').single();
        if (error) throw error;

        // Auto-update job status
        const trigger = status === 'Sent' ? 'quotation_sent' : 'quotation_created';
        const newJobStatus = await autoUpdateJobStatus(supabase, selectedJob!.id, user!.id, trigger);
        if (newJobStatus) {
          toast.info(t('quotationForm.autoStatus', { status: newJobStatus }));
        }

        toast.success(status === 'Draft' ? t('quotationForm.savedDraft') : t('quotationForm.savedSent'));
        navigate(`/quotations/${data.id}${status === 'Sent' ? '?share=1' : ''}`);
      }
    } catch (err: any) {
      toast.error(err.message || t('forms.errorSaving'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isEdit && existingQuotation && blockedJobId) {
    return (
      <div className="p-4 md:p-6 space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">{t('quotationForm.new')}</h1>
        </div>
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[#B45309]" />
            <h2 className="text-base font-bold text-[#B45309]">{t('quotationForm.alreadyExistsTitle')}</h2>
          </div>
          <p className="text-sm text-[#B45309]">{t('quotationForm.alreadyExistsBody')}</p>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => navigate(`/quotations/${existingQuotation.id}`)} className="rounded-lg">{t('quotationForm.viewQuotation')}</Button>
            <Button variant="outline" onClick={() => navigate(`/jobs/${blockedJobId}`)} className="rounded-lg">{t('quotationForm.backToJob')}</Button>
          </div>
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
        <h1 className="text-xl font-bold text-foreground">{isEdit ? t('quotationForm.edit') : t('quotationForm.new')}</h1>
      </div>

      <div className="space-y-1.5">
        <Label>{t('quotationForm.quoteNumber')}</Label>
        <Input value={quoteNumber} readOnly className="bg-muted" />
      </div>

      <div className="space-y-1.5">
        <Label>{t('quotationForm.jobLabel')}</Label>
        <div className="relative">
          <button type="button" onClick={() => setJobDropdownOpen(!jobDropdownOpen)}
            className={cn("w-full flex items-center h-10 rounded-md border bg-background px-3 text-sm text-left", errors.job ? 'border-destructive' : 'border-input')}>
            {selectedJob ? <span>{selectedJob.job_number} — {selectedJob.title}</span> : <span className="text-muted-foreground">{t('forms.selectJob')}</span>}
          </button>
          {jobDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setJobDropdownOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-60 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={jobSearch} onChange={e => setJobSearch(e.target.value)} placeholder={t('forms.searchJob')} className="pl-8 h-8 text-sm" autoFocus />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-40">
                  {filteredJobs.map(j => (
                    <button key={j.id} onClick={async () => {
                      setSelectedJob(j); setJobDropdownOpen(false); setJobSearch(''); setErrors(p => ({ ...p, job: '' }));
                      if (!isEdit) tryAutoFillFromJob(j);
                      if (!isEdit && user) {
                        const { data: existing } = await supabase.from('quotations').select('id').eq('job_id', j.id).eq('user_id', user.id).maybeSingle();
                        if (existing) {
                          setJobWarning({ message: t('quotationForm.jobHasQuote'), link: `/quotations/${existing.id}` });
                          setSaveDisabled(true);
                        } else {
                          setJobWarning(null);
                          setSaveDisabled(false);
                        }
                      }
                    }} className="w-full px-3 py-2 text-left hover:bg-accent text-sm">
                      <span className="font-medium text-primary">{j.job_number}</span>
                      <span className="text-foreground ml-1.5">— {j.title}</span>
                      {j.customers?.name && <span className="block text-xs text-muted-foreground mt-0.5">{j.customers.name}</span>}
                    </button>
                  ))}
                  {filteredJobs.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">{t('forms.noJobsFound')}</p>}
                </div>
              </div>
            </>
          )}
        </div>
        {errors.job && <p className="text-xs text-destructive">{errors.job}</p>}
        {jobWarning && (
          <div className="flex items-start gap-2 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg p-3 mt-1.5">
            <AlertCircle className="h-4 w-4 text-[#B45309] shrink-0 mt-0.5" />
            <div className="text-sm text-[#B45309]">
              {jobWarning.message}{' '}
              <Link to={jobWarning.link} className="underline font-medium hover:text-[#92400E]">{t('quotationForm.viewQuote')}</Link>
            </div>
          </div>
        )}
      </div>

      {selectedJob?.customers && (
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">{t('forms.customer')}</p>
          <p className="text-sm font-medium text-foreground">{selectedJob.customers.name}</p>
          {selectedJob.customers.phone && <p className="text-xs text-muted-foreground">{selectedJob.customers.phone}</p>}
        </div>
      )}

      <div className="space-y-3">
        <Label>{t('quotationForm.items')}</Label>
        {errors.items && <p className="text-xs text-destructive">{errors.items}</p>}
        <div className="hidden md:block">
          <div className="grid grid-cols-[40px_1fr_70px_70px_110px_110px_36px] gap-2 text-xs font-medium text-muted-foreground mb-1 px-1">
            <span></span><span>{t('forms.itemDescription')}</span><span>{t('forms.itemQty')}</span><span>UOM</span><span>{t('forms.itemUnitPrice')}</span><span>{t('forms.itemTotal')}</span><span></span>
          </div>
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-[40px_1fr_70px_70px_110px_110px_36px] gap-2 mb-2 items-start">
              <ProductPicker onPick={(p) => applyProduct(i, p)} />
              <div className="space-y-1">
                <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder={t('forms.itemDescPlaceholder')} className="text-sm" />
                <Textarea value={item.description_detail || ''} onChange={e => updateItem(i, 'description_detail' as any, e.target.value)} placeholder="Butiran tambahan (pilihan)" rows={2} className="text-xs" />
              </div>
              <Input type="number" min={0} value={item.qty || ''} onChange={e => updateItem(i, 'qty', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="0" className="text-sm" />
              <Input value={item.uom || ''} onChange={e => updateItem(i, 'uom' as any, e.target.value)} placeholder="unit" className="text-sm" />
              <Input type="number" min={0} step="0.01" value={item.unit_price || ''} onChange={e => updateItem(i, 'unit_price', Number(e.target.value) || 0)} placeholder="0.00" className="text-sm" />
              <div className="flex items-center px-3 text-sm font-medium text-foreground bg-muted rounded-md h-10">RM {((item.qty || 0) * (item.unit_price || 0)).toFixed(2)}</div>
              <button onClick={() => removeItem(i)} disabled={items.length <= 1} className="flex items-center justify-center h-10 text-muted-foreground hover:text-destructive disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div className="md:hidden space-y-3">
          {items.map((item, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-3 space-y-2 relative">
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
              )}
              <div className="flex gap-2">
                <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Penerangan item" className="text-sm" />
                <ProductPicker onPick={(p) => applyProduct(i, p)} />
              </div>
              <Textarea value={item.description_detail || ''} onChange={e => updateItem(i, 'description_detail' as any, e.target.value)} placeholder="Butiran tambahan (pilihan)" rows={2} className="text-xs" />
              <div className="grid grid-cols-3 gap-2">
                <div><p className="text-xs text-muted-foreground mb-1">Qty</p><Input type="number" min={0} value={item.qty || ''} onChange={e => updateItem(i, 'qty', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="0" className="text-sm" /></div>
                <div><p className="text-xs text-muted-foreground mb-1">UOM</p><Input value={item.uom || ''} onChange={e => updateItem(i, 'uom' as any, e.target.value)} placeholder="unit" className="text-sm" /></div>
                <div><p className="text-xs text-muted-foreground mb-1">Harga (RM)</p><Input type="number" min={0} step="0.01" value={item.unit_price || ''} onChange={e => updateItem(i, 'unit_price', Number(e.target.value) || 0)} placeholder="0.00" className="text-sm" /></div>
              </div>
              <div className="text-right text-sm font-medium text-foreground">Jumlah: RM {((item.qty || 0) * (item.unit_price || 0)).toFixed(2)}</div>
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={addItem} disabled={items.length >= 20} className="gap-1.5 rounded-lg text-sm"><Plus className="h-4 w-4" /> Tambah Item</Button>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('forms.subtotal')}</span><span className="font-medium">RM {subtotal.toFixed(2)}</span></div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('forms.discount')}</span>
            <div className="flex bg-muted rounded-md overflow-hidden text-xs ml-auto">
              <button onClick={() => setDiscountMode('rm')} className={cn("px-2.5 py-1 font-medium", discountMode === 'rm' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>RM</button>
              <button onClick={() => setDiscountMode('pct')} className={cn("px-2.5 py-1 font-medium", discountMode === 'pct' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>%</button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Input type="number" min={0} step="0.01" value={discountValue || ''} onChange={e => setDiscountValue(Number(e.target.value) || 0)} placeholder="0" className="w-32 text-sm" />
            <span className="text-sm text-muted-foreground">− RM {discountAmount.toFixed(2)}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('forms.sstApply')}</span>
            <Switch checked={sstEnabled} onCheckedChange={setSstEnabled} />
          </div>
          {sstEnabled && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <Input type="number" min={0} max={100} value={sstRate} onChange={e => setSstRate(Number(e.target.value) || 0)} className="w-20 text-sm" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <span className="text-sm text-muted-foreground">+ RM {sstAmount.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="border-t border-border pt-3 flex justify-between items-center">
          <span className="text-base font-bold text-foreground">{t('forms.grandTotal')}</span>
          <span className="text-lg font-bold text-primary">RM {grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t('quotationForm.validUntil')}</Label>
        <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="rounded-lg" />
      </div>

      <div className="space-y-1.5">
        <Label>{t('forms.notes')}</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder={t('forms.notesPlaceholder')} />
      </div>

      <div className="space-y-1.5">
        <Label>{t('forms.termsConditions')}</Label>
        <Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={5} placeholder={t('quotationForm.termsPlaceholder')} />
        <p className="text-xs text-muted-foreground">{t('forms.termsHint')}</p>
      </div>

      {isEdit ? (
        <Button onClick={() => handleSave('Draft')} disabled={submitting || saveDisabled} className="w-full rounded-lg h-11">
          {submitting ? t('forms.saving') : t('quotationForm.saveEdit')}
        </Button>
      ) : (
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleSave('Draft')} disabled={submitting || saveDisabled} className="flex-1 rounded-lg h-11">
            {submitting ? t('forms.saving') : t('quotationForm.saveDraft')}
          </Button>
          <Button onClick={() => handleSave('Sent')} disabled={submitting || saveDisabled} className="flex-1 rounded-lg h-11">
            {submitting ? t('forms.sending') : t('quotationForm.send')}
          </Button>
        </div>
      )}
    </div>
  );
}

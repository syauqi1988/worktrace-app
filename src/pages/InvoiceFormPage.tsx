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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeft, Search, Plus, X, Trash2, AlertCircle, ChevronDown, Info, Landmark, ClipboardCheck, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateAndIncrement, generateDocNumber, DEFAULT_DOC_SETTINGS } from '@/utils/generateDocNumber';
import { ProductPicker } from '@/components/ProductPicker';

interface Job {
  id: string;
  job_number: string;
  title: string;
  customer_id: string | null;
  customers: { name: string; phone: string | null; tin_number: string | null } | null;
}

interface LineItem {
  description: string;
  description_detail?: string;
  qty: number;
  uom?: string;
  unit_price: number;
}

export default function InvoiceFormPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobSearch, setJobSearch] = useState('');
  const [jobDropdownOpen, setJobDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ description: '', qty: 1, unit_price: 0 }]);
  const [discountMode, setDiscountMode] = useState<'rm' | 'pct'>('rm');
  const [discountValue, setDiscountValue] = useState(0);
  const [sstEnabled, setSstEnabled] = useState(false);
  const [sstRate, setSstRate] = useState(8);
  const [issuedDate, setIssuedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingInvoice, setExistingInvoice] = useState<{ id: string } | null>(null);
  const [jobWarning, setJobWarning] = useState<{ message: string; link: string } | null>(null);
  const [saveDisabled, setSaveDisabled] = useState(false);
  const [blockedJobId, setBlockedJobId] = useState<string | null>(null);
  const [linkedQuoteId, setLinkedQuoteId] = useState<string | null>(null);

  // Completion report gate
  const [reportStatus, setReportStatus] = useState<'checking' | 'none' | 'draft' | 'submitted'>('checking');
  const [reportJobId, setReportJobId] = useState<string | null>(null);

  // LHDN fields
  const [lhdnOpen, setLhdnOpen] = useState(false);
  const [customerTin, setCustomerTin] = useState('');
  const [msicCode, setMsicCode] = useState('');
  const [sstNumber, setSstNumber] = useState('');
  const [lhdnSubmitted, setLhdnSubmitted] = useState(false);

  // Quotation import
  const [availableQuote, setAvailableQuote] = useState<{ id: string; quote_number: string; items: LineItem[]; subtotal: number; discount: number; tax_rate: number; total: number } | null>(null);
  const [importDismissed, setImportDismissed] = useState(false);

  // Check completion report for job
  const checkCompletionReport = async (jobId: string) => {
    if (!user) return;
    const { data } = await supabase.from('completion_reports')
      .select('id, status')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!data) {
      setReportStatus('none');
      setReportJobId(jobId);
    } else if (data.status === 'draft') {
      setReportStatus('draft');
      setReportJobId(jobId);
    } else {
      setReportStatus('submitted');
      setReportJobId(jobId);
    }
  };

  // Fetch jobs
  useEffect(() => {
    if (!user) return;
    supabase.from('jobs').select('id, job_number, title, customer_id, customers(name, phone, tin_number)').order('created_at', { ascending: false })
      .then(({ data }) => setJobs((data as unknown as Job[]) || []));
  }, [user]);

  // Preview next invoice number from doc_number_settings (no increment)
  useEffect(() => {
    if (!user || isEdit) return;
    supabase.from('profiles').select('doc_number_settings').eq('id', user.id).single()
      .then(({ data }) => {
        const settings = (data as any)?.doc_number_settings?.invoice;
        const merged = { ...DEFAULT_DOC_SETTINGS.invoice, ...(settings || {}) };
        setInvoiceNumber(generateDocNumber(merged));
      });
  }, [user, isEdit]);

  // Auto-select job from query param + check existing
  useEffect(() => {
    const jobId = searchParams.get('job_id');
    if (jobId && jobs.length > 0 && !selectedJob) {
      const found = jobs.find(j => j.id === jobId);
      if (found) {
        setSelectedJob(found);
        if (found.customers?.tin_number) setCustomerTin(found.customers.tin_number);
      }
      if (user && !isEdit) {
        supabase.from('invoices').select('id').eq('job_id', jobId).eq('user_id', user.id).maybeSingle()
          .then(({ data }) => {
            if (data) { setExistingInvoice(data); setBlockedJobId(jobId); }
          });
        // Check for accepted quotation
        supabase.from('quotations').select('id, quote_number, items, subtotal, discount, tax_rate, total')
          .eq('job_id', jobId).eq('user_id', user.id).eq('status', 'Accepted').maybeSingle()
          .then(({ data }) => {
            if (data) setAvailableQuote(data as any);
          });
        // Check completion report
        checkCompletionReport(jobId);
      }
    }
  }, [searchParams, jobs, selectedJob, user, isEdit]);

  // Populate LHDN defaults from profile
  useEffect(() => {
    if (profile?.msic_code) setMsicCode(profile.msic_code);
    if (!isEdit && profile?.invoice_terms && !terms) setTerms(profile.invoice_terms);
    if (!isEdit && profile?.payment_methods) {
      const methods = Array.isArray(profile.payment_methods) ? profile.payment_methods : [];
      setSelectedPaymentMethods(methods.map((m: any) => m.id));
    }
  }, [profile, isEdit]);

  // Fetch existing invoice for edit
  useEffect(() => {
    if (!isEdit || !user || !id) return;
    async function fetchInvoice() {
      const { data } = await supabase.from('invoices')
        .select('*, jobs(id, job_number, title, customer_id, customers(name, phone, tin_number))')
        .eq('id', id).single();
      if (data) {
        const inv = data as any;
        if (inv.status !== 'Draft') { navigate(`/invoices/${id}`, { replace: true }); return; }
        setSelectedJob(inv.jobs);
        setInvoiceNumber(inv.invoice_number);
        setItems(Array.isArray(inv.items) ? inv.items : [{ description: '', qty: 1, unit_price: 0 }]);
        setNotes(inv.notes || '');
        setTerms(inv.terms || '');
        setIssuedDate(inv.issued_date || new Date().toISOString().slice(0, 10));
        setDueDate(inv.due_date || '');
        setLinkedQuoteId(inv.quote_id);
        setLhdnSubmitted(inv.lhdn_submitted || false);
        if (inv.jobs?.customers?.tin_number) setCustomerTin(inv.jobs.customers.tin_number);
        const storedDiscount = Number(inv.discount) || 0;
        setDiscountMode('rm');
        setDiscountValue(storedDiscount);
        const storedTaxRate = Number(inv.tax_rate) || 0;
        if (storedTaxRate > 0) { setSstEnabled(true); setSstRate(storedTaxRate); }
        const savedPMs = Array.isArray(inv.selected_payment_methods) ? inv.selected_payment_methods : [];
        if (savedPMs.length > 0) {
          setSelectedPaymentMethods(savedPMs);
        } else if (profile?.payment_methods) {
          const methods = Array.isArray(profile.payment_methods) ? profile.payment_methods : [];
          setSelectedPaymentMethods(methods.map((m: any) => m.id));
        }
        // For edit, set report as submitted (since invoice already exists)
        setReportStatus('submitted');
      }
      setLoading(false);
    }
    fetchInvoice();
  }, [isEdit, user, id, navigate]);

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

  // Calculations
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

  const handleImportQuote = () => {
    if (!availableQuote) return;
    setItems(Array.isArray(availableQuote.items) ? availableQuote.items : []);
    const d = Number(availableQuote.discount) || 0;
    setDiscountMode('rm');
    setDiscountValue(d);
    const t = Number(availableQuote.tax_rate) || 0;
    if (t > 0) { setSstEnabled(true); setSstRate(t); }
    setLinkedQuoteId(availableQuote.id);
    setImportDismissed(true);
  };

  const handleSelectJob = async (j: Job) => {
    setSelectedJob(j);
    setJobDropdownOpen(false);
    setJobSearch('');
    setErrors(p => ({ ...p, job: '' }));
    if (j.customers?.tin_number) setCustomerTin(j.customers.tin_number);

    if (!isEdit && user) {
      const { data: existing } = await supabase.from('invoices').select('id').eq('job_id', j.id).eq('user_id', user.id).maybeSingle();
      if (existing) {
        setJobWarning({ message: t('invoiceForm.jobHasInvoice'), link: `/invoices/${existing.id}` });
        setSaveDisabled(true);
      } else {
        setJobWarning(null);
        setSaveDisabled(false);
      }
      // Check for accepted quotation
      const { data: quote } = await supabase.from('quotations').select('id, quote_number, items, subtotal, discount, tax_rate, total')
        .eq('job_id', j.id).eq('user_id', user.id).eq('status', 'Accepted').maybeSingle();
      if (quote) { setAvailableQuote(quote as any); setImportDismissed(false); }
      else { setAvailableQuote(null); }
      // Check completion report
      await checkCompletionReport(j.id);
    }
  };

  const handleSave = async (status: 'Draft' | 'Sent') => {
    const newErrors: Record<string, string> = {};
    if (!selectedJob) newErrors.job = t('invoiceForm.errJob');
    if (!items.some(i => i.description.trim())) newErrors.items = t('invoiceForm.errItems');
    if (items.some(i => i.unit_price < 0)) newErrors.items = t('invoiceForm.errPriceNeg');
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setSubmitting(true);
    try {
      let finalNumber = invoiceNumber;
      if (!isEdit) {
        finalNumber = await generateAndIncrement(supabase, user!.id, 'invoice');
      }
      const payload: any = {
        user_id: user!.id,
        job_id: selectedJob!.id,
        customer_id: selectedJob!.customer_id || null,
        quote_id: linkedQuoteId,
        invoice_number: finalNumber,
        items: items.filter(i => i.description.trim()),
        subtotal,
        discount: discountAmount,
        tax_rate: sstEnabled ? sstRate : 0,
        total: grandTotal,
        status,
        issued_date: issuedDate || null,
        due_date: dueDate || null,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        selected_payment_methods: selectedPaymentMethods as any,
        lhdn_submitted: lhdnSubmitted,
      };

      if (isEdit) {
        const { error } = await supabase.from('invoices').update(payload).eq('id', id);
        if (error) throw error;
        toast.success(t('invoiceForm.savedEdit'));
        navigate(`/invoices/${id}`);
      } else {
        const { data, error } = await supabase.from('invoices').insert(payload).select('id').single();
        if (error) throw error;
        toast.success(status === 'Draft' ? t('invoiceForm.savedDraft') : t('invoiceForm.savedSent'));
        navigate(`/invoices/${data.id}${status === 'Sent' ? '?share=1' : ''}`);
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

  // Blocked by existing invoice
  if (!isEdit && existingInvoice && blockedJobId) {
    return (
      <div className="p-4 md:p-6 space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold text-foreground">{t('invoiceForm.new')}</h1>
        </div>
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[#B45309]" />
            <h2 className="text-base font-bold text-[#B45309]">{t('invoiceForm.alreadyExistsTitle')}</h2>
          </div>
          <p className="text-sm text-[#B45309]">{t('invoiceForm.alreadyExistsBody')}</p>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => navigate(`/invoices/${existingInvoice.id}`)} className="rounded-lg">{t('invoiceForm.viewInvoiceBtn')}</Button>
            <Button variant="outline" onClick={() => navigate(`/jobs/${blockedJobId}`)} className="rounded-lg">{t('invoiceForm.backToJob')}</Button>
          </div>
        </div>
      </div>
    );
  }

  // Blocked by missing completion report (only for new invoices with job_id)
  if (!isEdit && selectedJob && reportStatus !== 'checking' && reportStatus !== 'submitted' && reportJobId) {
    return (
      <div className="p-4 md:p-6 space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold text-foreground">{t('invoiceForm.new')}</h1>
        </div>
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[#B45309]" />
            <h2 className="text-base font-bold text-[#B45309]">{t('invoiceForm.reportRequiredTitle')}</h2>
          </div>
          <p className="text-sm text-[#B45309]">{t('invoiceForm.reportRequiredBody')}</p>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => navigate(`/jobs/${reportJobId}/completion-report`)} className="rounded-lg gap-1.5">
              <ClipboardCheck className="h-4 w-4" /> {t('invoiceForm.fillReport')}
            </Button>
            <Button variant="outline" onClick={() => navigate(`/jobs/${reportJobId}`)} className="rounded-lg">{t('invoiceForm.backToJob')}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl pb-28 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(isEdit ? `/invoices/${id}` : '/invoices')} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold text-foreground">{isEdit ? t('invoiceForm.edit') : t('invoiceForm.new')}</h1>
      </div>

      {/* Report submitted banner */}
      {!isEdit && reportStatus === 'submitted' && (
        <div className="bg-[#DCFCE7] border border-[#BBF7D0] rounded-xl p-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-[#15803D]" />
          <span className="text-sm font-medium text-[#15803D]">{t('invoiceForm.reportSubmitted')}</span>
        </div>
      )}

      {/* Invoice Number */}
      <div className="space-y-1.5">
        <Label>{t('invoiceForm.invoiceNumber')}</Label>
        <Input value={invoiceNumber} readOnly className="bg-muted" />
      </div>

      {/* Job Selector */}
      <div className="space-y-1.5">
        <Label>{t('invoiceForm.jobLabel')}</Label>
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
                    <button key={j.id} onClick={() => handleSelectJob(j)} className="w-full px-3 py-2 text-left hover:bg-accent text-sm">
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
              <Link to={jobWarning.link} className="underline font-medium hover:text-[#92400E]">{t('invoiceForm.viewInvoice')}</Link>
            </div>
          </div>
        )}
      </div>

      {/* Customer display */}
      {selectedJob?.customers && (
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">{t('workOrderForm.customer')}</p>
          <p className="text-sm font-medium text-foreground">{selectedJob.customers.name}</p>
          {selectedJob.customers.phone && <p className="text-xs text-muted-foreground">{selectedJob.customers.phone}</p>}
        </div>
      )}

      {/* Import from Quotation */}
      {availableQuote && !importDismissed && !isEdit && (
        <div className="bg-[#DBEAFE] border border-[#93C5FD] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-[#1D4ED8]" />
            <p className="text-sm font-medium text-[#1D4ED8]">
              {t('invoiceForm.importQuoteAvailable', { number: availableQuote.quote_number })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleImportQuote} className="rounded-lg text-xs">{t('invoiceForm.importYes')}</Button>
            <Button size="sm" variant="outline" onClick={() => setImportDismissed(true)} className="rounded-lg text-xs">{t('invoiceForm.importNo')}</Button>
          </div>
        </div>
      )}

      {/* Line Items */}
      <div className="space-y-3">
        <Label>{t('workOrderForm.items')} *</Label>
        {errors.items && <p className="text-xs text-destructive">{errors.items}</p>}
        {/* Desktop table */}
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
        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {items.map((item, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-3 space-y-2 relative">
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
              )}
              <div className="flex gap-2">
                <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder={t('forms.itemPlaceholder')} className="text-sm" />
                <ProductPicker onPick={(p) => applyProduct(i, p)} />
              </div>
              <Textarea value={item.description_detail || ''} onChange={e => updateItem(i, 'description_detail' as any, e.target.value)} placeholder="Butiran tambahan (pilihan)" rows={2} className="text-xs" />
              <div className="grid grid-cols-3 gap-2">
                <div><p className="text-xs text-muted-foreground mb-1">{t('forms.itemQty')}</p><Input type="number" min={0} value={item.qty || ''} onChange={e => updateItem(i, 'qty', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="0" className="text-sm" /></div>
                <div><p className="text-xs text-muted-foreground mb-1">UOM</p><Input value={item.uom || ''} onChange={e => updateItem(i, 'uom' as any, e.target.value)} placeholder="unit" className="text-sm" /></div>
                <div><p className="text-xs text-muted-foreground mb-1">{t('forms.itemUnitPriceRm')}</p><Input type="number" min={0} step="0.01" value={item.unit_price || ''} onChange={e => updateItem(i, 'unit_price', Number(e.target.value) || 0)} placeholder="0.00" className="text-sm" /></div>
              </div>
              <div className="text-right text-sm font-medium text-foreground">{t('forms.itemTotalLabel', { amount: ((item.qty || 0) * (item.unit_price || 0)).toFixed(2) })}</div>
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={addItem} disabled={items.length >= 20} className="gap-1.5 rounded-lg text-sm"><Plus className="h-4 w-4" /> {t('forms.addItem')}</Button>
      </div>

      {/* Summary */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('forms.subtotal')}</span>
          <span className="font-medium">RM {subtotal.toFixed(2)}</span>
        </div>
        {/* Discount */}
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
        {/* SST */}
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

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t('invoiceForm.issuedDate')}</Label>
          <Input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} className="rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Label>{t('invoiceForm.dueDate')}</Label>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="rounded-lg" />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>{t('forms.notes')}</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder={t('forms.notesPlaceholder')} />
      </div>

      {/* Terms & Conditions */}
      <div className="space-y-1.5">
        <Label>{t('forms.termsConditions')}</Label>
        <Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={5} placeholder={t('invoiceForm.termsPlaceholder')} />
        <p className="text-xs text-muted-foreground">{t('forms.termsHint')}</p>
      </div>

      {/* Payment Methods Selection */}
      {(() => {
        const allMethods: any[] = Array.isArray(profile?.payment_methods) ? profile!.payment_methods : [];
        if (allMethods.length === 0) return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            {t('invoiceForm.noPaymentMethods')} <button onClick={() => navigate('/settings')} className="underline font-medium">{t('invoiceForm.addInSettings')}</button>
          </div>
        );
        return (
          <div className="space-y-2">
            <Label>{t('invoiceForm.paymentMethodsLabel')}</Label>
            <p className="text-xs text-muted-foreground">{t('invoiceForm.paymentMethodsHint')}</p>
            {allMethods.map((m: any) => (
              <div key={m.id} className="flex items-center gap-2">
                <Checkbox
                  id={`pm-${m.id}`}
                  checked={selectedPaymentMethods.includes(m.id)}
                  onCheckedChange={(v) => {
                    if (v) setSelectedPaymentMethods(prev => [...prev, m.id]);
                    else setSelectedPaymentMethods(prev => prev.filter(id => id !== m.id));
                  }}
                />
                <label htmlFor={`pm-${m.id}`} className="text-sm cursor-pointer">
                  {m.type === 'bank_transfer' ? `🏦 ${m.bank_name} — ${m.account_number}` : `📱 ${m.provider || 'QR'}`}
                  {m.is_primary && <span className="text-xs text-primary ml-1">{t('invoiceForm.primaryTag')}</span>}
                </label>
              </div>
            ))}
          </div>
        );
      })()}

      {/* LHDN Section */}
      {profile?.lhdn_enabled && (
        <Collapsible open={lhdnOpen} onOpenChange={setLhdnOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between bg-card rounded-xl border border-border p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{t('invoiceForm.lhdnTitle')}</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", lhdnOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-card rounded-b-xl border border-t-0 border-border p-4 space-y-3">
            <div className="space-y-1.5">
              <Label>{t('invoiceForm.lhdnYourTin')}</Label>
              <Input value={profile.tin_number || ''} readOnly className="bg-muted text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('invoiceForm.lhdnCustTin')}</Label>
              <Input value={customerTin} onChange={e => setCustomerTin(e.target.value)} placeholder="e.g. C12345678900" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('invoiceForm.lhdnMsic')}</Label>
              <Input value={msicCode} onChange={e => setMsicCode(e.target.value)} placeholder="e.g. 43211" className="text-sm" />
            </div>
            {profile.sst_registered && (
              <div className="space-y-1.5">
                <Label>{t('invoiceForm.lhdnSstNo')}</Label>
                <Input value={sstNumber} onChange={e => setSstNumber(e.target.value)} className="text-sm" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox id="lhdn-submitted" checked={lhdnSubmitted} onCheckedChange={(v) => setLhdnSubmitted(!!v)} />
              <label htmlFor="lhdn-submitted" className="text-sm text-foreground cursor-pointer">{t('invoiceForm.lhdnSubmitted')}</label>
            </div>
            <div className="bg-[#DBEAFE] border border-[#93C5FD] rounded-lg p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-0.5" />
              <p className="text-xs text-[#1D4ED8]">
                {t('invoiceForm.lhdnInfo')}
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Save Buttons */}
      {isEdit ? (
        <Button onClick={() => handleSave('Draft')} disabled={submitting || saveDisabled} className="w-full rounded-lg h-11">
          {submitting ? t('forms.saving') : t('invoiceForm.saveEdit')}
        </Button>
      ) : (
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleSave('Draft')} disabled={submitting || saveDisabled} className="flex-1 rounded-lg h-11">
            {submitting ? t('forms.saving') : t('invoiceForm.saveDraft')}
          </Button>
          <Button onClick={() => handleSave('Sent')} disabled={submitting || saveDisabled} className="flex-1 rounded-lg h-11">
            {submitting ? t('forms.sending') : t('invoiceForm.send')}
          </Button>
        </div>
      )}
    </div>
  );
}

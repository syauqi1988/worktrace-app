import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
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

interface Job {
  id: string;
  job_number: string;
  title: string;
  customer_id: string | null;
  customers: { name: string; phone: string | null } | null;
}

interface LineItem {
  description: string;
  qty: number;
  unit_price: number;
}

export default function QuotationFormPage() {
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
  const [quoteNumber, setQuoteNumber] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ description: '', qty: 1, unit_price: 0 }]);
  const [discountMode, setDiscountMode] = useState<'rm' | 'pct'>('rm');
  const [discountValue, setDiscountValue] = useState(0);
  const [sstEnabled, setSstEnabled] = useState(false);
  const [sstRate, setSstRate] = useState(8);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
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

  // Fetch jobs
  useEffect(() => {
    if (!user) return;
    supabase.from('jobs').select('id, job_number, title, customer_id, customers(name, phone)').order('created_at', { ascending: false })
      .then(({ data }) => setJobs((data as unknown as Job[]) || []));
  }, [user]);

  // Generate quote number
  useEffect(() => {
    if (!user || isEdit) return;
    supabase.from('quotations').select('id', { count: 'exact', head: true })
      .then(({ count }) => {
        setQuoteNumber(`QUO-${String((count ?? 0) + 1).padStart(4, '0')}`);
      });
  }, [user, isEdit]);

  // Auto-select job from query param + check for existing quotation
  useEffect(() => {
    const jobId = searchParams.get('job_id');
    if (jobId && jobs.length > 0 && !selectedJob) {
      const found = jobs.find(j => j.id === jobId);
      if (found) setSelectedJob(found);
      // Check if quotation already exists for this job
      if (user && !isEdit) {
        supabase.from('quotations').select('id').eq('job_id', jobId).eq('user_id', user.id).maybeSingle()
          .then(({ data }) => {
            if (data) {
              setExistingQuotation(data);
              setBlockedJobId(jobId);
            }
          });
      }
    }
  }, [searchParams, jobs, selectedJob, user, isEdit]);

  // Fetch existing quotation for edit
  useEffect(() => {
    if (!isEdit || !user || !id) return;
    async function fetchQuotation() {
      const { data } = await supabase.from('quotations')
        .select('*, jobs(id, job_number, title, customer_id, customers(name, phone))')
        .eq('id', id)
        .single();
      if (data) {
        const q = data as any;
        // Block only Rejected
        if (q.status === 'Rejected') {
          toast.error('Sebut harga yang ditolak tidak boleh diedit.');
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
        if (storedTaxRate > 0) {
          setSstEnabled(true);
          setSstRate(storedTaxRate);
        }
        setEditStatus(q.status);
      }
      setLoading(false);
    }
    fetchQuotation();
  }, [isEdit, user, id, navigate]);

  // If not editing, stop loading once jobs are fetched
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

  const addItem = () => {
    if (items.length >= 20) return;
    setItems(prev => [...prev, { description: '', qty: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (status: 'Draft' | 'Sent') => {
    const newErrors: Record<string, string> = {};
    if (!selectedJob) newErrors.job = 'Sila pilih kerja';
    if (!items.some(i => i.description.trim())) newErrors.items = 'Sila isi sekurang-kurangnya satu item';
    if (items.some(i => i.unit_price < 0)) newErrors.items = 'Harga tidak boleh negatif';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setSubmitting(true);
    try {
      const saveStatus = isEdit && editStatus && editStatus !== 'Draft' ? editStatus : status;
      const payload = {
        user_id: user!.id,
        job_id: selectedJob!.id,
        quote_number: quoteNumber,
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
        toast.success('Sebut harga berjaya dikemaskini!');
        navigate(`/quotations/${id}`);
      } else {
        const { data, error } = await supabase.from('quotations').insert(payload).select('id').single();
        if (error) throw error;
        toast.success(status === 'Draft' ? 'Draf disimpan!' : 'Sebut harga dihantar!');
        navigate(`/quotations/${data.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Ralat menyimpan');
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

  // If blocked by existing quotation from job_id param
  if (!isEdit && existingQuotation && blockedJobId) {
    return (
      <div className="p-4 md:p-6 space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/quotations')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Sebut Harga Baru</h1>
        </div>
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[#B45309]" />
            <h2 className="text-base font-bold text-[#B45309]">Sebut harga sudah wujud</h2>
          </div>
          <p className="text-sm text-[#B45309]">
            Kerja ini sudah mempunyai sebut harga. Setiap kerja hanya boleh ada 1 sebut harga.
          </p>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => navigate(`/quotations/${existingQuotation.id}`)} className="rounded-lg">
              Lihat Sebut Harga
            </Button>
            <Button variant="outline" onClick={() => navigate(`/jobs/${blockedJobId}`)} className="rounded-lg">
              Kembali ke Kerja
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl pb-28 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(isEdit ? `/quotations/${id}` : '/quotations')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">{isEdit ? 'Edit Sebut Harga' : 'Sebut Harga Baru'}</h1>
      </div>

      {/* Quote Number */}
      <div className="space-y-1.5">
        <Label>Nombor Sebut Harga</Label>
        <Input value={quoteNumber} readOnly className="bg-muted" />
      </div>

      {/* Job Selector */}
      <div className="space-y-1.5">
        <Label>Kerja *</Label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setJobDropdownOpen(!jobDropdownOpen)}
            className={cn(
              "w-full flex items-center h-10 rounded-md border bg-background px-3 text-sm text-left",
              errors.job ? 'border-destructive' : 'border-input'
            )}
          >
            {selectedJob
              ? <span>{selectedJob.job_number} — {selectedJob.title}</span>
              : <span className="text-muted-foreground">Pilih kerja...</span>}
          </button>
          {jobDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setJobDropdownOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-60 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={jobSearch} onChange={e => setJobSearch(e.target.value)} placeholder="Cari kerja..." className="pl-8 h-8 text-sm" autoFocus />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-40">
                  {filteredJobs.map(j => (
                    <button key={j.id} onClick={async () => {
                      setSelectedJob(j); setJobDropdownOpen(false); setJobSearch(''); setErrors(p => ({ ...p, job: '' }));
                      // Check for existing quotation on this job
                      if (!isEdit && user) {
                        const { data: existing } = await supabase.from('quotations').select('id').eq('job_id', j.id).eq('user_id', user.id).maybeSingle();
                        if (existing) {
                          setJobWarning({ message: `Kerja ini sudah ada sebut harga.`, link: `/quotations/${existing.id}` });
                          setSaveDisabled(true);
                        } else {
                          setJobWarning(null);
                          setSaveDisabled(false);
                        }
                      }
                    }}
                      className="w-full px-3 py-2 text-left hover:bg-accent text-sm">
                      <span className="font-medium text-primary">{j.job_number}</span>
                      <span className="text-foreground ml-1.5">— {j.title}</span>
                      {j.customers?.name && <span className="block text-xs text-muted-foreground mt-0.5">{j.customers.name}</span>}
                    </button>
                  ))}
                  {filteredJobs.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Tiada kerja dijumpai</p>}
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
              <Link to={jobWarning.link} className="underline font-medium hover:text-[#92400E]">Lihat sebut harga →</Link>
            </div>
          </div>
        )}
      </div>

      {/* Customer display */}
      {selectedJob?.customers && (
        <div className="bg-card rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Pelanggan</p>
          <p className="text-sm font-medium text-foreground">{selectedJob.customers.name}</p>
          {selectedJob.customers.phone && <p className="text-xs text-muted-foreground">{selectedJob.customers.phone}</p>}
        </div>
      )}

      {/* Line Items */}
      <div className="space-y-3">
        <Label>Item Kerja *</Label>
        {errors.items && <p className="text-xs text-destructive">{errors.items}</p>}

        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[1fr_80px_120px_120px_40px] gap-2 text-xs font-medium text-muted-foreground mb-1 px-1">
            <span>Penerangan</span><span>Qty</span><span>Harga Seunit</span><span>Jumlah</span><span></span>
          </div>
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_120px_120px_40px] gap-2 mb-2">
              <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="e.g. Pasang aircond 1.0HP" className="text-sm" />
              <Input type="number" min={1} value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value) || 0)} className="text-sm" />
              <Input type="number" min={0} step="0.01" value={item.unit_price || ''} onChange={e => updateItem(i, 'unit_price', Number(e.target.value) || 0)} placeholder="0.00" className="text-sm" />
              <div className="flex items-center px-3 text-sm font-medium text-foreground bg-muted rounded-md">
                RM {((item.qty || 0) * (item.unit_price || 0)).toFixed(2)}
              </div>
              <button onClick={() => removeItem(i)} disabled={items.length <= 1} className="flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-30">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {items.map((item, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-3 space-y-2 relative">
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              )}
              <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Penerangan item" className="text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Qty</p>
                  <Input type="number" min={1} value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value) || 0)} className="text-sm" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Harga Seunit (RM)</p>
                  <Input type="number" min={0} step="0.01" value={item.unit_price || ''} onChange={e => updateItem(i, 'unit_price', Number(e.target.value) || 0)} placeholder="0.00" className="text-sm" />
                </div>
              </div>
              <div className="text-right text-sm font-medium text-foreground">
                Jumlah: RM {((item.qty || 0) * (item.unit_price || 0)).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" onClick={addItem} disabled={items.length >= 20} className="gap-1.5 rounded-lg text-sm">
          <Plus className="h-4 w-4" /> Tambah Item
        </Button>
      </div>

      {/* Summary */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">RM {subtotal.toFixed(2)}</span>
        </div>

        {/* Discount */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Diskaun</span>
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
            <span className="text-sm text-muted-foreground">SST Dikenakan?</span>
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
          <span className="text-base font-bold text-foreground">Jumlah Keseluruhan</span>
          <span className="text-lg font-bold text-primary">RM {grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Valid Until */}
      <div className="space-y-1.5">
        <Label>Sebut harga sah hingga</Label>
        <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="rounded-lg" />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Nota</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Nota tambahan untuk pelanggan..." />
      </div>

      {/* Terms & Conditions */}
      <div className="space-y-1.5">
        <Label>Terma & Syarat</Label>
        <Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={5} placeholder="Terma & syarat sebut harga..." />
        <p className="text-xs text-muted-foreground">Terma ini akan dipaparkan dalam PDF sebut harga</p>
      </div>

      {/* Edit warning banner */}
      {isEdit && editStatus && editStatus !== 'Draft' && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-[#B45309] shrink-0 mt-0.5" />
          <div className="text-sm text-[#B45309]">
            <p className="font-medium">Sebut harga ini telah dihantar/diterima.</p>
            <p>Sebarang perubahan akan mengekalkan status semasa. Pastikan pelanggan dimaklumkan.</p>
          </div>
        </div>
      )}

      {/* Save Buttons */}
      {isEdit ? (
        <Button onClick={() => handleSave('Draft')} disabled={submitting || saveDisabled} className="w-full rounded-lg h-11">
          {submitting ? 'Menyimpan...' : 'Kemaskini Sebut Harga'}
        </Button>
      ) : (
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleSave('Draft')} disabled={submitting || saveDisabled} className="flex-1 rounded-lg h-11">
            {submitting ? 'Menyimpan...' : 'Simpan Draft'}
          </Button>
          <Button onClick={() => handleSave('Sent')} disabled={submitting || saveDisabled} className="flex-1 rounded-lg h-11">
            {submitting ? 'Menghantar...' : 'Hantar Sebut Harga'}
          </Button>
        </div>
      )}
    </div>
  );
}

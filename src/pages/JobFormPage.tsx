import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlanGate } from '@/hooks/usePlanGate';
import UpgradeModal from '@/components/UpgradeModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, CalendarDays, Search, Plus, Package, Bookmark } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { JobPresetPicker } from '@/components/JobPresetPicker';
import { JobProductsEditor, type JobProductItem } from '@/components/JobProductsEditor';

const CATEGORIES = ['Renovation', 'Aircond', 'Electrical', 'Plumbing', 'Maintenance', 'Welding', 'Other'];
const STATUSES = ['Lead', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'];

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

export default function JobFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customer_id');
  const isEdit = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { checkJobLimit, upgradeOpen, setUpgradeOpen, upgradeReason } = usePlanGate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Other');
  const [status, setStatus] = useState('Lead');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [products, setProducts] = useState<JobProductItem[]>([]);
  const [savingPreset, setSavingPreset] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from('customers').select('id, name, phone').order('name').then(({ data }) => {
      const list = (data as Customer[]) || [];
      setCustomers(list);
      if (!isEdit && preselectedCustomerId && !customerId) {
        const c = list.find(x => x.id === preselectedCustomerId);
        if (c) {
          setCustomerId(c.id);
          setCustomerName(c.name);
        }
      }
    });
  }, [user, isEdit, preselectedCustomerId]);

  useEffect(() => {
    if (!isEdit || !user || !id) return;
    async function fetchJob() {
      const { data } = await supabase.from('jobs')
        .select('*, customers(id, name, phone)')
        .eq('id', id)
        .single();
      if (data) {
        const job = data as any;
        setCustomerId(job.customer_id || '');
        setCustomerName(job.customers?.name || '');
        setTitle(job.title);
        setCategory(job.category);
        setStatus(job.status);
        setScheduledDate(job.scheduled_date ? new Date(job.scheduled_date) : undefined);
        setDescription(job.description || '');
        setNotes(job.notes || '');
      }
      setLoading(false);
    }
    fetchJob();
  }, [isEdit, user, id]);

  const filteredCustomers = customerSearch.trim()
    ? customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone || '').includes(customerSearch)
      )
    : customers;

  const selectCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerSearch('');
    setCustomerDropdownOpen(false);
    setErrors(prev => ({ ...prev, customer: '' }));
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!customerId) newErrors.customer = t('jobForm.errCustomer');
    if (!title.trim()) newErrors.title = t('jobForm.errTitle');
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    if (!isEdit && user) {
      const allowed = await checkJobLimit(user.id);
      if (!allowed) return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        const { error } = await supabase.from('jobs').update({
          customer_id: customerId,
          title: title.trim(),
          category,
          status,
          scheduled_date: scheduledDate ? scheduledDate.toISOString().slice(0, 10) : null,
          description: description.trim() || null,
          notes: notes.trim() || null,
          completed_date: status === 'Completed' ? new Date().toISOString().slice(0, 10) : null,
        }).eq('id', id);
        if (error) throw error;
        toast({ title: t('jobForm.savedEdit') });
        navigate(`/jobs/${id}`);
      } else {
        const { count } = await supabase.from('jobs').select('id', { count: 'exact', head: true });
        const jobNumber = `JOB-${String((count ?? 0) + 1).padStart(4, '0')}`;

        const { data, error } = await supabase.from('jobs').insert({
          user_id: user!.id,
          customer_id: customerId,
          job_number: jobNumber,
          title: title.trim(),
          category,
          status,
          scheduled_date: scheduledDate ? scheduledDate.toISOString().slice(0, 10) : null,
          description: description.trim() || null,
          notes: notes.trim() || null,
        }).select('id').single();
        if (error) throw error;
        toast({ title: t('jobForm.savedNew') });
        navigate(`/jobs/${data.id}`);
      }
    } catch (err: any) {
      toast({ title: t('forms.errorLabel'), description: err.message, variant: 'destructive' });
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
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-xl pb-28 md:pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(isEdit ? `/jobs/${id}` : '/jobs')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">{isEdit ? t('jobForm.edit') : t('jobForm.new')}</h1>
      </div>

      <div className="space-y-1.5">
        <Label>{t('jobForm.customerLabel')}</Label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
            className={cn(
              "w-full flex items-center h-10 rounded-md border bg-background px-3 text-sm text-left",
              errors.customer ? 'border-destructive' : 'border-input'
            )}
          >
            {customerName || <span className="text-muted-foreground">{t('forms.selectCustomer')}</span>}
          </button>
          {customerDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCustomerDropdownOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-60 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      placeholder={t('forms.searchCustomer')}
                      className="pl-8 h-8 text-sm"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-40">
                  {filteredCustomers.map(c => (
                    <button key={c.id} onClick={() => selectCustomer(c)}
                      className="w-full px-3 py-2 text-left hover:bg-accent text-sm flex items-center justify-between">
                      <span className="font-medium text-foreground">{c.name}</span>
                      {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">{t('forms.noCustomersFound')}</p>
                  )}
                </div>
                <button
                  onClick={() => { setCustomerDropdownOpen(false); navigate('/customers/new'); }}
                  className="border-t border-border px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> {t('forms.addNewCustomer')}
                </button>
              </div>
            </>
          )}
        </div>
        {errors.customer && <p className="text-xs text-destructive">{errors.customer}</p>}
      </div>

      {!isEdit && (
        <div className="space-y-1.5">
          <Label>Preset Kerja (opsional)</Label>
          <JobPresetPicker
            onPick={(p) => {
              setTitle(p.title);
              setCategory(CATEGORIES.includes(p.category) ? p.category : 'Other');
              if (p.description) setDescription(p.description);
              if (p.notes) setNotes(p.notes);
              setErrors((prev) => ({ ...prev, title: '' }));
              toast({ title: `Preset "${p.name}" digunakan` });
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            Pilih untuk auto-isi tajuk, kategori, keterangan & nota
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>{t('jobForm.titleLabel')}</Label>
        <Input
          value={title}
          onChange={e => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: '' })); }}
          placeholder={t('jobForm.titlePlaceholder')}
          className={errors.title ? 'border-destructive' : ''}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t('jobForm.category')}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t('jobForm.status')}</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t('jobForm.scheduledDate')}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !scheduledDate && "text-muted-foreground")}>
              <CalendarDays className="mr-2 h-4 w-4" />
              {scheduledDate ? format(scheduledDate, 'dd MMM yyyy') : t('jobForm.selectDate')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-1.5">
        <Label>{t('jobForm.description')}</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder={t('jobForm.descriptionPlaceholder')} />
      </div>

      <div className="space-y-1.5">
        <Label>{t('jobForm.internalNotes')}</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={t('jobForm.internalNotesPlaceholder')} />
      </div>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full rounded-lg h-11">
        {submitting ? t('forms.saving') : isEdit ? t('jobForm.saveEdit') : t('jobForm.saveNew')}
      </Button>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
    </div>
  );
}

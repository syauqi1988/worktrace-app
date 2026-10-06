import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useL } from '@/i18n/dual';
import { usePlanGate } from '@/hooks/usePlanGate';
import UpgradeModal from '@/components/UpgradeModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

const CATEGORIES = ['Renovation', 'Aircond', 'Electrical', 'Plumbing', 'Maintenance', 'Welding', 'Other'];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Columns to return for the created job (should match the caller's job list select). */
  selectColumns: string;
  onCreated: (job: any) => void;
}

/** Reusable quick "add new job" popup used from document forms. */
export default function QuickJobDialog({ open, onOpenChange, selectColumns, onCreated }: Props) {
  const { user } = useAuth();
  const l = useL();
  const { checkJobLimit, upgradeOpen, setUpgradeOpen, upgradeReason } = usePlanGate();
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Other');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setCustomerId(''); setTitle(''); setCategory('Other'); setDescription('');
    supabase.from('customers').select('id, name').order('name').then(({ data }) => setCustomers((data as any) || []));
  }, [open, user]);

  const save = async () => {
    if (!user) return;
    if (!customerId || !title.trim()) {
      toast({ title: l('Please select a customer and enter a job title.', 'Sila pilih pelanggan dan isi tajuk kerja.'), variant: 'destructive' });
      return;
    }
    if (!(await checkJobLimit(user.id))) return;
    setSaving(true);
    try {
      const { count } = await supabase.from('jobs').select('id', { count: 'exact', head: true });
      const jobNumber = `JOB-${String((count ?? 0) + 1).padStart(4, '0')}`;
      const { data, error } = await supabase.from('jobs').insert({
        user_id: user.id, customer_id: customerId, job_number: jobNumber,
        title: title.trim(), category, status: 'Lead',
        description: description.trim() || null, products: [] as any, job_type: 'standard',
      } as any).select(selectColumns).single();
      if (error) throw error;
      toast({ title: l('Job created', 'Kerja dicipta') });
      onCreated(data);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: l('Error', 'Ralat'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{l('Add New Job', 'Tambah Kerja Baru')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{l('Customer', 'Pelanggan')} *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder={l('Select customer', 'Pilih pelanggan')} /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {customers.length === 0 && (
                <p className="text-xs text-muted-foreground">{l('No customers yet — add one in Customers first.', 'Tiada pelanggan lagi — tambah di Pelanggan dahulu.')}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{l('Job Title', 'Tajuk Kerja')} *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={l('e.g. Aircond servicing', 'cth. Servis aircond')} />
            </div>
            <div className="space-y-1.5">
              <Label>{l('Category', 'Kategori')}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{l('Description', 'Penerangan')}</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{l('Cancel', 'Batal')}</Button>
            <Button onClick={save} disabled={saving}>{saving ? l('Saving...', 'Menyimpan...') : l('Create Job', 'Cipta Kerja')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
    </>
  );
}

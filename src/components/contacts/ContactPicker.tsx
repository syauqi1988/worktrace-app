import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export type ContactKind = 'suppliers' | 'customers' | 'employees';

export type Contact = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

type Props = {
  kind: ContactKind;
  label: string;
  value: string;
  onChange: (name: string, contact?: Contact) => void;
};

/**
 * Select a contact (supplier / customer / employee) or add a new one,
 * which is saved straight into Contacts.
 */
export default function ContactPicker({ kind, label, value, onChange }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });

  const load = async () => {
    const { data } = await (supabase as any).from(kind).select('id, name, phone, email, address').order('name');
    setRows((data as Contact[]) || []);
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user, kind]);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    const { data, error } = await (supabase as any)
      .from(kind)
      .insert({ user_id: user?.id, ...form })
      .select('id, name, phone, email, address')
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setRows(prev => [...prev, data as Contact].sort((a, b) => a.name.localeCompare(b.name)));
    onChange(data.name, data as Contact);
    setForm({ name: '', phone: '', email: '', address: '' });
    setOpen(false);
    toast.success('Saved to Contacts');
  };

  return (
    <>
      <div className="flex gap-2">
        <Select
          value={value || undefined}
          onValueChange={v => {
            const c = rows.find(r => r.name === v);
            onChange(v, c);
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {rows.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No contacts yet</div>}
            {rows.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" className="gap-1 shrink-0" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New {label}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Textarea rows={3} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

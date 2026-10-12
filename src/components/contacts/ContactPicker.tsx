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
import { useTx } from '@/i18n/dual';

export type ContactKind = 'suppliers' | 'customers' | 'employees';

export type Contact = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  contact_persons?: { id: string; name: string; position?: string; phone?: string; email?: string; is_default?: boolean }[];
  addresses?: { id: string; label?: string; attention?: string; address: string; is_billing?: boolean; is_shipping?: boolean }[];
};
export type PickedAddress = NonNullable<Contact['addresses']>[number];
export type PickedPerson = NonNullable<Contact['contact_persons']>[number];

type Props = {
  kind: ContactKind;
  label: string;
  value: string;
  onChange: (name: string, contact?: Contact) => void;
  /** Called when the user picks a contact person / billing / shipping address of the chosen contact. */
  onPerson?: (p: PickedPerson) => void;
  onBilling?: (a: PickedAddress) => void;
  onShipping?: (a: PickedAddress) => void;
};

/**
 * Select a contact (supplier / customer / employee) or add a new one,
 * which is saved straight into Contacts.
 */
export default function ContactPicker({ kind, label, value, onChange, onPerson, onBilling, onShipping }: Props) {
  const { user } = useAuth();
  const tx = useTx();
  const [rows, setRows] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });

  const load = async () => {
    const { data } = await (supabase as any).from(kind).select('*').order('name');
    setRows((data as Contact[]) || []);
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user, kind]);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error(tx('Name is required')); return; }
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
    toast.success(tx('Saved to Contacts'));
  };

  return (
    <>
      <div className="flex gap-2">
        <Select
          value={value || undefined}
          onValueChange={v => {
            const c = rows.find(r => r.name === v);
            onChange(v, c);
            const ps = c?.contact_persons || [], as = c?.addresses || [];
            const dp = ps.find(p => p.is_default) || ps[0];
            if (dp) onPerson?.(dp);
            const b = as.find(a => a.is_billing) || as[0]; if (b) onBilling?.(b);
            const sh = as.find(a => a.is_shipping) || as[0]; if (sh) onShipping?.(sh);
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={`${tx('Select')} ${tx(label)}`} />
          </SelectTrigger>
          <SelectContent>
            {rows.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">{tx('No contacts yet')}</div>}
            {rows.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" className="gap-1 shrink-0" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> {tx('New')}
        </Button>
      </div>

      {(() => {
        const c = rows.find(r => r.name === value);
        const ps = c?.contact_persons || [], as = c?.addresses || [];
        if (!c || (!ps.length && as.length < 2)) return null;
        const sel = (lbl: string, items: { id: string; text: string }[], pick: (id: string) => void) => (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{lbl}</p>
            <Select onValueChange={pick}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={tx('Select')} /></SelectTrigger>
              <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.text}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        );
        const at = (a: PickedAddress) => `${a.label ? a.label + ' — ' : ''}${a.address.split('\n')[0]}`;
        return (
          <div className="grid gap-2 mt-2">
            {ps.length > 0 && onPerson && sel(tx('Contact Person'), ps.map(p => ({ id: p.id, text: `${p.name}${p.position ? ` (${p.position})` : ''}` })), id => { const p = ps.find(x => x.id === id); if (p) onPerson(p); })}
            {as.length > 1 && onBilling && sel(tx('Billing Address'), as.map(a => ({ id: a.id, text: at(a) })), id => { const a = as.find(x => x.id === id); if (a) onBilling(a); })}
            {as.length > 1 && onShipping && sel(tx('Shipping Address'), as.map(a => ({ id: a.id, text: at(a) })), id => { const a = as.find(x => x.id === id); if (a) onShipping(a); })}
          </div>
        );
      })()}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{tx('New')} {tx(label)}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{tx('Name')} *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{tx('Phone')}</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{tx('Email')}</Label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{tx('Address')}</Label>
              <Textarea rows={3} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{tx('Cancel')}</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? tx('Saving...') : tx('Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

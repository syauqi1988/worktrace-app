import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useL } from '@/i18n/dual';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (c: { id: string; name: string; phone: string | null }) => void;
}

/** Reusable "add new customer" popup. */
export default function QuickCustomerDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const l = useL();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [tin, setTin] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setName(''); setPhone(''); setEmail(''); setAddress(''); setTin(''); setNotes(''); }
  }, [open]);

  const save = async () => {
    if (!user) return;
    if (!name.trim()) { toast.error(l('Customer name is required', 'Nama pelanggan diperlukan')); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('customers').insert({
        user_id: user.id, name: name.trim(), phone: phone.trim() || null, email: email.trim() || null,
        address: address.trim() || null, tin_number: tin.trim() || null, notes: notes.trim() || null,
      } as any).select('id, name, phone').single();
      if (error) throw error;
      toast.success(l('Customer added', 'Pelanggan ditambah'));
      onCreated(data as any);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || l('Failed to add customer', 'Gagal tambah pelanggan'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{l('Add New Customer', 'Tambah Pelanggan Baru')}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{l('Name', 'Nama')} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} maxLength={120} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{l('Phone', 'Telefon')}</Label>
              <Input type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={30} />
            </div>
            <div className="space-y-1.5">
              <Label>{l('Email', 'Emel')}</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={120} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{l('Address', 'Alamat')}</Label>
            <Textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} maxLength={300} />
          </div>
          <div className="space-y-1.5">
            <Label>{l('TIN Number', 'No. TIN')}</Label>
            <Input value={tin} onChange={e => setTin(e.target.value)} placeholder={l('Optional', 'Pilihan')} maxLength={30} />
          </div>
          <div className="space-y-1.5">
            <Label>{l('Notes', 'Nota')}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{l('Cancel', 'Batal')}</Button>
          <Button onClick={save} disabled={saving}>{saving ? l('Saving...', 'Menyimpan...') : l('Add Customer', 'Tambah Pelanggan')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

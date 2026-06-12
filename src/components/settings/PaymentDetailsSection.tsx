import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { PaymentDetails } from '@/components/PaymentDetailsCard';

const PAYMENT_TYPES = ['Bank Transfer', 'DuitNow', 'TNG eWallet', 'Baucar', 'Tunai'];

export default function PaymentDetailsSection() {
  const { profile, updateProfile } = useAuth();
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const d = ((profile as any)?.payment_details ?? {}) as PaymentDetails;
    setBankName(d.bank_name || '');
    setAccountNumber(d.account_number || '');
    setAccountHolder(d.account_holder || '');
    setTypes(Array.isArray(d.payment_types) ? d.payment_types : []);
    setNote(d.note || '');
  }, [profile]);

  const toggleType = (t: string) => {
    setTypes(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: PaymentDetails = {
      bank_name: bankName.trim() || undefined,
      account_number: accountNumber.trim() || undefined,
      account_holder: accountHolder.trim() || undefined,
      payment_types: types,
      note: note.trim() || undefined,
    };
    await updateProfile({ payment_details: payload as any } as any);
    setSaving(false);
    toast.success('Payment details saved');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Will be displayed in the Quotation so customers know how to pay.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Bank Name</Label>
          <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Maybank" />
        </div>
        <div className="space-y-1.5">
          <Label>Account No.</Label>
          <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="e.g. 1234-5678-9012" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Account Holder Name</Label>
        <Input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} placeholder="e.g. ABC Company Sdn Bhd" />
      </div>

      <div className="space-y-1.5">
        <Label>Payment Types Accepted</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PAYMENT_TYPES.map(t => (
            <label key={t} className="flex items-center gap-2 text-sm rounded-md border border-input p-2 cursor-pointer hover:bg-accent">
              <Checkbox checked={types.includes(t)} onCheckedChange={() => toggleType(t)} />
              <span>{t}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Payment Note (optional)</Label>
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          placeholder="e.g. Please use company name as reference"
          maxLength={300}
        />
      </div>

      <Button onClick={handleSave} disabled={saving} className="rounded-lg">
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}

import { useTx } from '@/i18n/dual';
import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import DataFormPage, { Field, FormSection } from '@/components/form/DataFormPage';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import ContactPicker from '@/components/contacts/ContactPicker';

export type PurchaseFormProps = {
  breadcrumb?: string;
  title: string;
  partyLabel?: string;
  numberPlaceholder: string;
  referenceLabel?: string;
  statuses?: string[];
};

type Line = { id: string; item: string; account: string; qty: number; price: number; discount: number; tax: number };
type Term = { id: string; term: string; dueOn: string; amount: number; description: string };

const money = (n: number) => n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const uid = () => Math.random().toString(36).slice(2, 9);

export default function PurchaseFormPage({
  breadcrumb = 'Purchases',
  title,
  partyLabel = 'Supplier',
  numberPlaceholder,
  referenceLabel = 'Reference No.',
  statuses = ['Draft', 'Pending Approval', 'Ready'],
}: PurchaseFormProps) {
  const tx = useTx();
  const [party, setParty] = useState('');
  const [showShipping, setShowShipping] = useState(true);
  const [shippingInfo, setShippingInfo] = useState('');
  const [billingAttention, setBillingAttention] = useState('');
  const [shippingAttention, setShippingAttention] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  const [docNumber, setDocNumber] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [docTitle, setDocTitle] = useState('');

  const [taxMode, setTaxMode] = useState<'inclusive' | 'exclusive'>('exclusive');
  const [lines, setLines] = useState<Line[]>([]);
  const [rounding, setRounding] = useState(false);
  const [terms, setTerms] = useState<Term[]>([]);
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState(statuses[0]);
  const [saving, setSaving] = useState(false);

  const setLine = (id: string, patch: Partial<Line>) =>
    setLines(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));

  const subTotal = useMemo(() => lines.reduce((s, l) => s + l.qty * l.price, 0), [lines]);
  const discountGiven = useMemo(() => lines.reduce((s, l) => s + (l.discount || 0), 0), [lines]);
  const total = Math.max(0, subTotal - discountGiven);

  const handleSave = () => {
    if (!party.trim()) { toast({ title: `${tx(partyLabel)} ${tx('is required')}`, variant: 'destructive' }); return; }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: `${title.replace('New ', '')} saved` });
    }, 300);
  };

  const sections: FormSection[] = [
    {
      id: 'billing-shipping',
      title: 'Billing & Shipping',
      description: 'Billing & shipping parties for the transaction.',
      content: (
        <div className="grid md:grid-cols-2 gap-4">
          <Field label={partyLabel} required>
            <ContactPicker
              kind="suppliers"
              label={partyLabel}
              value={party}
              onChange={(name, c) => {
                setParty(name);
                if (c) {
                  setBillingAttention(name);
                  setBillingAddress(c.address || '');
                  setShippingAttention(name);
                  setShippingAddress(c.address || '');
                }
              }}
            />
          </Field>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox checked={showShipping} onCheckedChange={c => setShowShipping(!!c)} />
              Show Shipping Info
            </label>
            <Input
              value={shippingInfo}
              onChange={e => setShippingInfo(e.target.value)}
              disabled={!showShipping}
              placeholder={tx('Shipping instructions, tracking no & etc.')}
            />
          </div>
          <Field label="Billing Attention">
            <Input value={billingAttention} onChange={e => setBillingAttention(e.target.value)} />
          </Field>
          <Field label="Shipping Attention">
            <Input value={shippingAttention} onChange={e => setShippingAttention(e.target.value)} disabled={!showShipping} />
          </Field>
          <Field label="Billing Address">
            <Textarea rows={4} value={billingAddress} onChange={e => setBillingAddress(e.target.value)} />
          </Field>
          <Field label="Shipping Address">
            <Textarea rows={4} value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} disabled={!showShipping} />
          </Field>
        </div>
      ),
    },
    {
      id: 'general-info',
      title: 'General Info',
      description: 'General information such as number, date and more for the transaction.',
      content: (
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="No." required>
            <Input value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder={numberPlaceholder} />
          </Field>
          <Field label={referenceLabel}>
            <Input value={reference} onChange={e => setReference(e.target.value)} />
          </Field>
          <Field label="Date" required>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency">
              <Input value="MYR - Malaysian Ringgit" disabled />
            </Field>
            <Field label="Rate">
              <Input value="1" disabled />
            </Field>
          </div>
          <Field label="Description">
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </Field>
          <Field label="Internal Note">
            <Input value={internalNote} onChange={e => setInternalNote(e.target.value)} />
          </Field>
          <Field label="Title">
            <Input value={docTitle} onChange={e => setDocTitle(e.target.value)} />
          </Field>
        </div>
      ),
    },
    {
      id: 'items',
      title: 'Items',
      content: (
        <div className="space-y-4">
          <div className="flex justify-end">
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              {(['inclusive', 'exclusive'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setTaxMode(m)}
                  className={`px-3 py-1.5 text-sm ${taxMode === m ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}
                >
                  {tx(m === 'inclusive' ? 'Tax Inclusive' : 'Tax Exclusive')}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/40 text-left">
                  <th className="px-2 py-2 font-semibold">{tx('Item')}</th>
                  <th className="px-2 py-2 font-semibold">{tx('Account')}</th>
                  <th className="px-2 py-2 font-semibold text-right">{tx('Quantity')}</th>
                  <th className="px-2 py-2 font-semibold text-right">{tx('Unit Price')}</th>
                  <th className="px-2 py-2 font-semibold text-right">{tx('Amount')}</th>
                  <th className="px-2 py-2 font-semibold text-right">{tx('Discount')}</th>
                  <th className="px-2 py-2 font-semibold text-right">{tx('Tax')}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 && (
                  <tr><td colSpan={8} className="px-2 py-10 text-center text-muted-foreground">{tx('No data')}</td></tr>
                )}
                {lines.map(l => (
                  <tr key={l.id} className="border-b border-border">
                    <td className="px-2 py-2"><Input value={l.item} onChange={e => setLine(l.id, { item: e.target.value })} placeholder={tx('Item')} /></td>
                    <td className="px-2 py-2"><Input value={l.account} onChange={e => setLine(l.id, { account: e.target.value })} placeholder={tx('Account')} /></td>
                    <td className="px-2 py-2"><Input type="number" className="text-right" value={l.qty} onChange={e => setLine(l.id, { qty: Number(e.target.value) })} /></td>
                    <td className="px-2 py-2"><Input type="number" className="text-right" value={l.price} onChange={e => setLine(l.id, { price: Number(e.target.value) })} /></td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">{money(l.qty * l.price)}</td>
                    <td className="px-2 py-2"><Input type="number" className="text-right" value={l.discount} onChange={e => setLine(l.id, { discount: Number(e.target.value) })} /></td>
                    <td className="px-2 py-2"><Input type="number" className="text-right" value={l.tax} onChange={e => setLine(l.id, { tax: Number(e.target.value) })} /></td>
                    <td className="px-2 py-2 text-right">
                      <Button variant="ghost" size="icon" onClick={() => setLines(prev => prev.filter(x => x.id !== l.id))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 lg:items-start justify-between">
            <Button
              onClick={() => setLines(prev => [...prev, { id: uid(), item: '', account: '', qty: 1, price: 0, discount: 0, tax: 0 }])}
              className="gap-1 self-start"
            >
              <Plus className="h-4 w-4" /> Item
            </Button>
            <div className="w-full lg:w-[380px] border border-border rounded-lg divide-y divide-border">
              {[
                [tx('Sub Total'), money(subTotal)],
                [tx('Discount Given'), money(discountGiven)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-3 py-2.5 text-sm">
                  <span>{k}</span><span>RM {v}</span>
                </div>
              ))}
              <label className="flex items-center justify-between px-3 py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  Rounding Adjustment
                  <Checkbox checked={rounding} onCheckedChange={c => setRounding(!!c)} />
                </span>
                <span className="text-muted-foreground">RM 0.00</span>
              </label>
              <div className="flex items-center justify-between px-3 py-3 text-sm font-bold">
                <span>{tx('TOTAL')}</span><span>RM {money(total)}</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'payment-terms',
      title: 'Payment Terms',
      content: (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/40 text-left">
                  <th className="px-2 py-2 font-semibold">{tx('Term')}</th>
                  <th className="px-2 py-2 font-semibold">{tx('Due On')}</th>
                  <th className="px-2 py-2 font-semibold text-right">{tx('Amount')}</th>
                  <th className="px-2 py-2 font-semibold">{tx('Description')}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {terms.length === 0 && (
                  <tr><td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">{tx('No payment terms')}</td></tr>
                )}
                {terms.map(t => (
                  <tr key={t.id} className="border-b border-border">
                    <td className="px-2 py-2"><Input value={t.term} onChange={e => setTerms(p => p.map(x => x.id === t.id ? { ...x, term: e.target.value } : x))} placeholder="NET14" /></td>
                    <td className="px-2 py-2"><Input type="date" value={t.dueOn} onChange={e => setTerms(p => p.map(x => x.id === t.id ? { ...x, dueOn: e.target.value } : x))} /></td>
                    <td className="px-2 py-2"><Input type="number" className="text-right" value={t.amount} onChange={e => setTerms(p => p.map(x => x.id === t.id ? { ...x, amount: Number(e.target.value) } : x))} /></td>
                    <td className="px-2 py-2"><Input value={t.description} onChange={e => setTerms(p => p.map(x => x.id === t.id ? { ...x, description: e.target.value } : x))} /></td>
                    <td className="px-2 py-2 text-right">
                      <Button variant="ghost" size="icon" onClick={() => setTerms(p => p.filter(x => x.id !== t.id))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              className="gap-1"
              onClick={() => setTerms(p => [...p, { id: uid(), term: 'NET14', dueOn: date, amount: total, description: '' }])}
            >
              <Plus className="h-4 w-4" /> Term
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: 'additional-info',
      title: 'Additional Info',
      description: 'Additional information such as remarks and country specific fields.',
      content: (
        <Field label="Remarks">
          <Textarea rows={4} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder={tx('Remarks displayed on the form.')} />
        </Field>
      ),
    },
    {
      id: 'attachments',
      title: 'Attachments',
      description: 'Supporting documents attached to the transaction.',
      content: (
        <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-lg py-10 cursor-pointer hover:bg-muted/40 transition-colors">
          <Plus className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">{tx('Drop files to upload')}</span>
          <span className="text-xs text-muted-foreground">or tap to select files</span>
          <input type="file" multiple className="hidden" />
        </label>
      ),
    },
    {
      id: 'controls',
      title: 'Controls',
      description: 'Controls and statuses for the transaction.',
      content: (
        <Field label="Status">
          <div className="inline-flex flex-wrap rounded-lg border border-border overflow-hidden">
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-4 py-2 text-sm ${status === s ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}
              >
                {tx(s)}
              </button>
            ))}
          </div>
        </Field>
      ),
    },
  ];

  return (
    <DataFormPage
      breadcrumb={`Home / ${breadcrumb}`}
      title={title}
      sections={sections}
      onSave={handleSave}
      saving={saving}
      autosaveLabel="Autosave On"
    />
  );
}

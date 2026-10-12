import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DataFormPage, { Field, FormSection } from '@/components/form/DataFormPage';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useL } from '@/i18n/dual';

export type ContactTable = 'customers' | 'suppliers' | 'employees';
export type ContactPerson = { id: string; name: string; position: string; phone: string; email: string; is_default?: boolean };
export type ContactAddress = { id: string; label: string; attention: string; address: string; is_billing?: boolean; is_shipping?: boolean };

const uid = () => Math.random().toString(36).slice(2, 9);
const ENTITY = [
  ['company', 'Company', 'Syarikat'], ['individual', 'Individual', 'Individu'], ['public', 'General Public', 'Orang Awam'],
  ['foreign_company', 'Foreign Company', 'Syarikat Asing'], ['foreign_individual', 'Foreign Individual', 'Individu Asing'], ['exempted', 'Exempted Person', 'Orang Dikecualikan'],
] as const;
const REG = [['none', 'None', 'Tiada'], ['brn', 'BRN', 'BRN'], ['nric', 'NRIC', 'No. KP'], ['passport', 'Passport', 'Pasport'], ['army', 'Army', 'Tentera']] as const;

const CFG: Record<ContactTable, { en: string; ms: string; list: string; prefix: string; secondary?: 'company' | 'position' }> = {
  customers: { en: 'Customer', ms: 'Pelanggan', list: '/customers', prefix: 'C' },
  suppliers: { en: 'Supplier', ms: 'Pembekal', list: '/suppliers', prefix: 'S', secondary: 'company' },
  employees: { en: 'Employee', ms: 'Pekerja', list: '/employees', prefix: 'E', secondary: 'position' },
};

function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly (readonly [string, string, string])[] }) {
  const l = useL();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 rounded-lg border border-border p-1">
      {options.map(([v, en, ms]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`px-2 py-2 text-sm rounded-md transition-colors ${value === v ? 'bg-primary text-primary-foreground font-medium' : 'text-foreground hover:bg-muted'}`}>
          {l(en, ms)}
        </button>
      ))}
    </div>
  );
}

/** Full "new / edit contact" page shared by customers, suppliers and employees. */
export default function ContactFullForm({ table }: { table: ContactTable }) {
  const cfg = CFG[table];
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const l = useL();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<any>({
    name: '', other_name: '', contact_code: '', entity_type: table === 'employees' ? 'individual' : 'company',
    reg_type: 'none', reg_no: '', old_reg_no: '', tin_number: '', sst_no: '', company: '', position: '',
    payment_term: '', notes: '', is_active: true,
  });
  const [phones, setPhones] = useState<string[]>(['']);
  const [emails, setEmails] = useState<string[]>(['']);
  const [persons, setPersons] = useState<ContactPerson[]>([]);
  const [addresses, setAddresses] = useState<ContactAddress[]>([]);
  const set = (p: any) => setF((x: any) => ({ ...x, ...p }));

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (id) {
        const { data } = await (supabase as any).from(table).select('*').eq('id', id).maybeSingle();
        if (!data) return;
        setF((x: any) => ({ ...x, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? (typeof x[k] === 'boolean' ? x[k] : '')])) }));
        const ph = Array.isArray(data.phones) && data.phones.length ? data.phones : [data.phone || ''];
        const em = Array.isArray(data.emails) && data.emails.length ? data.emails : [data.email || ''];
        setPhones(ph); setEmails(em);
        setPersons(Array.isArray(data.contact_persons) ? data.contact_persons : []);
        const ad = Array.isArray(data.addresses) && data.addresses.length ? data.addresses
          : data.address ? [{ id: uid(), label: l('Main', 'Utama'), attention: data.name, address: data.address, is_billing: true, is_shipping: true }] : [];
        setAddresses(ad);
      } else {
        const { count } = await (supabase as any).from(table).select('id', { count: 'exact', head: true }).eq('user_id', user.id);
        set({ contact_code: `${cfg.prefix}-${String((count || 0) + 1).padStart(5, '0')}` });
      }
    })();
  }, [id, user, table]);

  const save = async () => {
    if (!f.name?.trim()) { toast.error(l('Legal name is required', 'Nama sah diperlukan')); return; }
    const ph = phones.map(p => p.trim()).filter(Boolean);
    const em = emails.map(p => p.trim()).filter(Boolean);
    if (table === 'customers' && !ph.length) { toast.error(l('Contact no. is required', 'No. telefon diperlukan')); return; }
    const billing = addresses.find(a => a.is_billing) || addresses[0];
    setSaving(true);
    const payload: any = {
      name: f.name.trim(), other_name: f.other_name || null, contact_code: f.contact_code || null,
      entity_type: f.entity_type, reg_type: f.reg_type, reg_no: f.reg_no || null, old_reg_no: f.old_reg_no || null,
      tin_number: f.tin_number || null, sst_no: f.sst_no || null, payment_term: f.payment_term || null,
      notes: f.notes || null, phone: ph[0] || null, email: em[0] || null, address: billing?.address || null,
      phones: ph, emails: em, contact_persons: persons.filter(p => p.name.trim()), addresses: addresses.filter(a => a.address.trim()),
    };
    if (cfg.secondary) payload[cfg.secondary] = f[cfg.secondary] || null;
    if (table !== 'customers') payload.is_active = !!f.is_active;
    const q = id
      ? (supabase as any).from(table).update(payload).eq('id', id)
      : (supabase as any).from(table).insert({ ...payload, user_id: user?.id });
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(l(`${cfg.en} saved`, `${cfg.ms} disimpan`));
    navigate(cfg.list);
  };

  const listEditor = (vals: string[], setVals: (v: string[]) => void, type: string, ph: string) => (
    <div className="space-y-2">
      {vals.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input type={type} value={v} placeholder={ph} onChange={e => setVals(vals.map((x, j) => (j === i ? e.target.value : x)))} />
          {vals.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => setVals(vals.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setVals([...vals, ''])}><Plus className="h-4 w-4" /> {l('Add', 'Tambah')}</Button>
    </div>
  );

  const setPerson = (pid: string, p: Partial<ContactPerson>) => setPersons(xs => xs.map(x => (x.id === pid ? { ...x, ...p } : p.is_default ? { ...x, is_default: false } : x)));
  const setAddr = (aid: string, p: Partial<ContactAddress>) => setAddresses(xs => xs.map(x => (x.id === aid ? { ...x, ...p } : x)));

  const sections: FormSection[] = [
    {
      id: 'basic', title: l('Basic Information', 'Maklumat Asas'), description: l('Basic information for the contact.', 'Maklumat asas kenalan.'),
      content: (
        <div className="space-y-4">
          {table !== 'employees' && (
            <Field label={l('Entity Type', 'Jenis Entiti')} required><Seg value={f.entity_type} onChange={v => set({ entity_type: v })} options={ENTITY} /></Field>
          )}
          <div className="grid sm:grid-cols-2 gap-4 [&>*]:min-w-0">
            <Field label={l('Legal Name', 'Nama Sah')} required><Input value={f.name} onChange={e => set({ name: e.target.value })} placeholder="Beta Marketing Sdn Bhd" maxLength={150} /></Field>
            <Field label={l('Other Name', 'Nama Lain')}><Input value={f.other_name} onChange={e => set({ other_name: e.target.value })} placeholder="Beta Enterprise" maxLength={150} /></Field>
            <Field label={l('Contact Code', 'Kod Kenalan')}><Input value={f.contact_code} onChange={e => set({ contact_code: e.target.value })} maxLength={30} /></Field>
            {cfg.secondary === 'company' && <Field label={l('Company', 'Syarikat')}><Input value={f.company} onChange={e => set({ company: e.target.value })} /></Field>}
            {cfg.secondary === 'position' && <Field label={l('Position', 'Jawatan')}><Input value={f.position} onChange={e => set({ position: e.target.value })} /></Field>}
          </div>
          <Field label={l('Registration No. Type', 'Jenis No. Pendaftaran')}><Seg value={f.reg_type} onChange={v => set({ reg_type: v })} options={REG} /></Field>
          <div className="grid sm:grid-cols-2 gap-4 [&>*]:min-w-0">
            <Field label={l('Registration No.', 'No. Pendaftaran')}><Input value={f.reg_no} onChange={e => set({ reg_no: e.target.value })} disabled={f.reg_type === 'none'} maxLength={40} /></Field>
            <Field label={l('Old Registration No.', 'No. Pendaftaran Lama')}><Input value={f.old_reg_no} onChange={e => set({ old_reg_no: e.target.value })} maxLength={40} /></Field>
            <Field label="TIN"><Input value={f.tin_number} onChange={e => set({ tin_number: e.target.value })} placeholder="C20880050040" maxLength={30} /></Field>
            <Field label={l('SST Registration No.', 'No. Pendaftaran SST')}><Input value={f.sst_no} onChange={e => set({ sst_no: e.target.value })} maxLength={40} /></Field>
          </div>
        </div>
      ),
    },
    {
      id: 'persons', title: l('Contact Persons', 'Orang Hubungan'), description: l('Contact persons in the organisation. The starred one is used by default.', 'Orang hubungan dalam organisasi. Yang bertanda bintang digunakan secara lalai.'),
      content: (
        <div className="space-y-3">
          {persons.length === 0 && <p className="text-sm text-muted-foreground">{l('No contact persons yet.', 'Tiada orang hubungan lagi.')}</p>}
          {persons.map(p => (
            <div key={p.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                <Input value={p.name} onChange={e => setPerson(p.id, { name: e.target.value })} placeholder={l('Name', 'Nama')} />
                <Input value={p.position} onChange={e => setPerson(p.id, { position: e.target.value })} placeholder={l('Position', 'Jawatan')} />
                <Input type="tel" value={p.phone} onChange={e => setPerson(p.id, { phone: e.target.value })} placeholder={l('Phone', 'Telefon')} />
                <Input type="email" value={p.email} onChange={e => setPerson(p.id, { email: e.target.value })} placeholder={l('Email', 'Emel')} />
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => setPerson(p.id, { is_default: true })}>
                  <Star className={`h-4 w-4 ${p.is_default ? 'fill-primary text-primary' : ''}`} /> {l('Default', 'Lalai')}
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => setPersons(xs => xs.filter(x => x.id !== p.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" className="gap-1" onClick={() => setPersons(xs => [...xs, { id: uid(), name: '', position: '', phone: '', email: '', is_default: xs.length === 0 }])}>
            <Plus className="h-4 w-4" /> {l('Contact Person', 'Orang Hubungan')}
          </Button>
        </div>
      ),
    },
    {
      id: 'info', title: l('Contact Information', 'Maklumat Hubungan'), description: l('Phone numbers and email addresses.', 'Nombor telefon dan alamat emel.'),
      content: (
        <div className="grid sm:grid-cols-2 gap-4 [&>*]:min-w-0">
          <Field label={l('Contact No.', 'No. Telefon')} required={table === 'customers'}>{listEditor(phones, setPhones, 'tel', '0123456789')}</Field>
          <Field label={l('Email Addresses', 'Alamat Emel')}>{listEditor(emails, setEmails, 'email', 'name@company.com')}</Field>
        </div>
      ),
    },
    {
      id: 'addresses', title: l('Contact Addresses', 'Alamat Kenalan'), description: l('Manage a list of addresses. Mark which one is used for billing and shipping.', 'Urus senarai alamat. Tandakan alamat untuk bil dan penghantaran.'),
      content: (
        <div className="space-y-3">
          {addresses.length === 0 && <p className="text-sm text-muted-foreground">{l('No addresses yet.', 'Tiada alamat lagi.')}</p>}
          {addresses.map(a => (
            <div key={a.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                <Input value={a.label} onChange={e => setAddr(a.id, { label: e.target.value })} placeholder={l('Label (e.g. HQ, Site)', 'Label (cth. HQ, Tapak)')} />
                <Input value={a.attention} onChange={e => setAddr(a.id, { attention: e.target.value })} placeholder={l('Attention', 'U/P')} />
              </div>
              <Textarea rows={3} value={a.address} onChange={e => setAddr(a.id, { address: e.target.value })} placeholder={l('Full address', 'Alamat penuh')} maxLength={400} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2"><Checkbox checked={!!a.is_billing} onCheckedChange={c => setAddr(a.id, { is_billing: !!c })} />{l('Billing', 'Bil')}</label>
                  <label className="flex items-center gap-2"><Checkbox checked={!!a.is_shipping} onCheckedChange={c => setAddr(a.id, { is_shipping: !!c })} />{l('Shipping', 'Penghantaran')}</label>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setAddresses(xs => xs.filter(x => x.id !== a.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" className="gap-1" onClick={() => setAddresses(xs => [...xs, { id: uid(), label: '', attention: f.name, address: '', is_billing: xs.length === 0, is_shipping: xs.length === 0 }])}>
            <Plus className="h-4 w-4" /> {l('Address', 'Alamat')}
          </Button>
        </div>
      ),
    },
    {
      id: 'defaults', title: l('Default Settings', 'Tetapan Lalai'), description: l('Used when creating documents for this contact.', 'Digunakan semasa mencipta dokumen untuk kenalan ini.'),
      content: (
        <div className="grid sm:grid-cols-2 gap-4 [&>*]:min-w-0">
          <Field label={l('Payment Term', 'Terma Bayaran')}><Input value={f.payment_term} onChange={e => set({ payment_term: e.target.value })} placeholder="NET14" maxLength={30} /></Field>
        </div>
      ),
    },
    {
      id: 'other', title: l('Other Information', 'Maklumat Lain'),
      content: (
        <div className="space-y-4">
          <Field label={l('Remarks', 'Catatan')}><Textarea rows={4} value={f.notes} onChange={e => set({ notes: e.target.value })} maxLength={1000} /></Field>
          {table !== 'customers' && (
            <label className="flex items-center gap-2 text-sm font-medium"><Checkbox checked={!!f.is_active} onCheckedChange={c => set({ is_active: !!c })} />{l('Active', 'Aktif')}</label>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataFormPage
      breadcrumb={`${l('Home', 'Utama')} / ${l('Contacts', 'Kenalan')}`}
      title={id ? l(`Edit ${cfg.en}`, `Sunting ${cfg.ms}`) : l(`New ${cfg.en}`, `${cfg.ms} Baru`)}
      sections={sections}
      onSave={save}
      saving={saving}
      onBack={() => navigate(cfg.list)}
    />
  );
}

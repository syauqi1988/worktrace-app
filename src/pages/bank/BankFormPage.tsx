import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useReadOnly } from '@/components/PaidFeatureLock';
import { useL, useTx } from '@/i18n/dual';
import { Field } from '@/components/form/DataFormPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { bankDb, loadBank } from './api';
import { BANK_CONFIG, BankAccount, BankKind, accountBalance, money, parseMoney, validTransfer } from './shared';

const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const initial = () => ({ name: '', bank_name: '', account_number: '', opening_balance: '0', notes: '',
  account_id: '', to_account_id: '', amount: '', transaction_date: localDate(), reference: '', party: '', description: '' });

export default function BankFormPage({ kind }: { kind: BankKind | 'account' }) {
  const { id } = useParams();
  const { user } = useAuth();
  const { readOnly, requestUpgrade } = useReadOnly();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const l = useL();
  const tx = useTx();
  const [form, setForm] = useState(initial);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const accountMode = kind === 'account';
  const path = accountMode ? '/bank-accounts' : BANK_CONFIG[kind].path;
  const title = accountMode ? (id ? 'Edit Account' : 'New Account') : id ? BANK_CONFIG[kind].editTitle : BANK_CONFIG[kind].newTitle;
  const set = (key: keyof ReturnType<typeof initial>, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    setForm(initial());
    (async () => {
      try {
        const data = await loadBank(user.id);
        if (cancelled) return;
        setAccounts(data.accounts);
        setBalances(Object.fromEntries(data.accounts.map(a => [a.id, accountBalance(a, data.transactions)])));
        if (id) {
          const record = accountMode ? data.accounts.find(a => a.id === id) : data.transactions.find(t => t.id === id && t.kind === kind);
          if (!record) throw new Error('not_found');
          setForm(prev => ({ ...prev, ...record,
            ...('opening_balance' in record ? { opening_balance: String(record.opening_balance) } : { amount: String(record.amount), to_account_id: record.to_account_id || '' }),
          }));
        }
      } catch { if (!cancelled) setLoadError(true); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user?.id, id, kind, accountMode]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly) { requestUpgrade(); return; }
    if (!user || loading || loadError || savingRef.current) return;
    const sen = parseMoney(accountMode ? form.opening_balance : form.amount);
    if (sen === null || (!accountMode && sen <= 0)) {
      toast.error(l('Enter a valid amount with up to two decimal places.', 'Masukkan jumlah sah dengan maksimum dua tempat perpuluhan.')); return;
    }
    if (accountMode && !form.name.trim()) { toast.error(l('Account name is required.', 'Nama akaun diperlukan.')); return; }
    if (!accountMode && (!form.transaction_date || !accounts.some(a => a.id === form.account_id))) {
      toast.error(l('Select an account and date.', 'Pilih akaun dan tarikh.')); return;
    }
    if (kind === 'transfer' && (!validTransfer(form.account_id, form.to_account_id) || !accounts.some(a => a.id === form.to_account_id))) {
      toast.error(l('Choose two different accounts.', 'Pilih dua akaun berbeza.')); return;
    }
    const payload = accountMode ? {
      user_id: user.id, name: form.name.trim(), bank_name: form.bank_name.trim(), account_number: form.account_number.trim(), opening_balance: sen / 100, notes: form.notes.trim(),
    } : {
      user_id: user.id, kind, account_id: form.account_id, to_account_id: kind === 'transfer' ? form.to_account_id : null,
      amount: sen / 100, transaction_date: form.transaction_date, reference: form.reference.trim(), party: kind === 'transfer' ? '' : form.party.trim(), description: form.description.trim(), notes: form.notes.trim(),
    };
    savingRef.current = true;
    setSaving(true);
    try {
      const table = accountMode ? 'bank_accounts' : 'bank_transactions';
      const result = id
        ? await bankDb.from(table).update(payload).eq('id', id).eq('user_id', user.id).select('id').single()
        : await bankDb.from(table).insert(payload).select('id').single();
      if (result.error) throw result.error;
      await queryClient.invalidateQueries({ queryKey: ['bank', user.id] });
      toast.success(l('Saved', 'Disimpan'));
      navigate(path);
    } catch { toast.error(l('Could not save. Please try again.', 'Tidak dapat menyimpan. Sila cuba lagi.')); }
    finally { setSaving(false); savingRef.current = false; }
  };

  const picker = (key: 'account_id' | 'to_account_id', label: string) => (
    <Field label={label} required>
      <Select value={form[key]} onValueChange={v => set(key, v)}>
        <SelectTrigger aria-label={tx(label)}><SelectValue placeholder={l('Select account', 'Pilih akaun')} /></SelectTrigger>
        <SelectContent>{accounts.filter(a => key !== 'to_account_id' || a.id !== form.account_id).map(a =>
          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
      </Select>
      {form[key] && <p className="text-xs text-muted-foreground">{tx('Current Balance')}: {money(balances[form[key]] || 0)}</p>}
    </Field>
  );

  return (
    <form onSubmit={save} className="pb-40 md:pb-28">
      <header className="border-b border-border px-4 md:px-6 py-4 flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={() => navigate(path)} aria-label={tx('Back')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="min-w-0"><p className="text-xs text-muted-foreground">{tx('Home / Bank')}</p><h1 className="text-xl font-bold break-words">{tx(title)}</h1></div>
      </header>
      {loading ? <p className="p-6 text-muted-foreground">{tx('Loading...')}</p> : loadError ?
        <p role="alert" className="p-6 text-destructive">{l('Unable to load Bank records. Please try again later.', 'Tidak dapat memuatkan rekod Bank. Sila cuba lagi kemudian.')}</p> :
        <fieldset disabled={readOnly || saving} className="min-w-0 p-4 md:p-6 max-w-4xl space-y-6">
          {!accountMode && accounts.length === 0 && <div className="flex flex-wrap items-center gap-3"><p>{l('No accounts yet.', 'Tiada akaun lagi.')}</p><Button type="button" variant="outline" onClick={() => navigate('/bank-accounts/new')}>{tx('New Account')}</Button></div>}
          <section className="space-y-4">
            <h2 className="text-base font-semibold">{tx('Details')}</h2>
            <div className="grid sm:grid-cols-2 gap-4 [&>*]:min-w-0">
              {accountMode ? <>
                <Field label="Name" required><Input aria-label={tx('Name')} required value={form.name} onChange={e => set('name', e.target.value)} maxLength={200} /></Field>
                <Field label="Bank Name"><Input aria-label={tx('Bank Name')} value={form.bank_name} onChange={e => set('bank_name', e.target.value)} maxLength={200} /></Field>
                <Field label="Account Number"><Input aria-label={tx('Account Number')} value={form.account_number} onChange={e => set('account_number', e.target.value)} maxLength={100} /></Field>
                <Field label="Opening Balance" required><Input aria-label={tx('Opening Balance')} inputMode="decimal" value={form.opening_balance} onChange={e => set('opening_balance', e.target.value)} required /></Field>
              </> : <>
                {picker('account_id', kind === 'transfer' ? 'From Account' : 'Account')}
                {kind === 'transfer' ? picker('to_account_id', 'To Account') : <Field label={kind === 'money_in' ? 'Received From' : 'Paid To'}><Input aria-label={tx(kind === 'money_in' ? 'Received From' : 'Paid To')} value={form.party} onChange={e => set('party', e.target.value)} maxLength={200} /></Field>}
                <Field label="Date" required><Input aria-label={tx('Date')} type="date" required value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} /></Field>
                <Field label="Amount" required><Input aria-label={tx('Amount')} inputMode="decimal" required value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" /></Field>
                <Field label="Reference"><Input aria-label={tx('Reference')} value={form.reference} onChange={e => set('reference', e.target.value)} maxLength={200} /></Field>
                <Field label="Description"><Input aria-label={tx('Description')} value={form.description} onChange={e => set('description', e.target.value)} maxLength={1000} /></Field>
              </>}
            </div>
          </section>
          <section className="border-t border-border pt-6"><Field label="Notes"><Textarea aria-label={tx('Notes')} value={form.notes} onChange={e => set('notes', e.target.value)} rows={4} maxLength={3000} /></Field></section>
        </fieldset>}
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 md:left-[220px] z-30 border-t border-border bg-background px-4 md:px-6 py-3 flex justify-end gap-3 safe-area-pb">
        <Button type="button" variant="outline" onClick={() => navigate(path)} disabled={saving}>{tx('Cancel')}</Button>
        <Button type="submit" disabled={saving || loading || loadError || (!accountMode && accounts.length === 0)} className="gap-2 min-w-28"><Save className="h-4 w-4" />{tx(saving ? 'Saving...' : 'Save')}</Button>
      </div>
    </form>
  );
}
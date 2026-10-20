import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useReadOnly } from '@/components/PaidFeatureLock';
import { useL, useTx } from '@/i18n/dual';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { accountingDb, loadAccounts, loadJournals } from './api';
import { LedgerAccount, lineTotals, toSen, validJournal } from './shared';

type Row = { account_id: string; debit: string; credit: string; memo: string };
const emptyRow = (): Row => ({ account_id: '', debit: '', credit: '', memo: '' });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
const amountOk = (v: string) => !v.trim() || /^\d+(\.\d{1,2})?$/.test(v.trim());

export default function JournalFormPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { readOnly, requestUpgrade } = useReadOnly();
  const navigate = useNavigate(); const qc = useQueryClient();
  const l = useL(); const tx = useTx();
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [head, setHead] = useState({ entry_number: '', entry_date: today(), reference: '', description: '' });
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow()]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false); const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let off = false;
    (async () => {
      try {
        const [acc, journals] = await Promise.all([loadAccounts(user.id), loadJournals(user.id)]);
        if (off) return;
        setAccounts(acc);
        if (id) {
          const j = journals.find(x => x.id === id); if (!j) throw new Error('not_found');
          setHead({ entry_number: j.entry_number, entry_date: j.entry_date, reference: j.reference, description: j.description });
          setRows(j.lines.map(x => ({ account_id: x.account_id, debit: x.debit ? String(x.debit) : '', credit: x.credit ? String(x.credit) : '', memo: x.memo || '' })));
        } else setHead(h => ({ ...h, entry_number: `JE-${String(journals.length + 1).padStart(4, '0')}` }));
      } catch { if (!off) setError(true); } finally { if (!off) setLoading(false); }
    })();
    return () => { off = true; };
  }, [user?.id, id]);

  const lines = rows.filter(r => r.account_id || r.debit || r.credit).map(r => ({ account_id: r.account_id, debit: Number(r.debit) || 0, credit: Number(r.credit) || 0, memo: r.memo.trim() }));
  const totals = lineTotals(lines);
  const setRow = (i: number, patch: Partial<Row>) => setRows(rs => rs.map((r, j) => j === i ? { ...r, ...patch } : r));
  const money = (sen: number) => `RM ${(sen / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) { requestUpgrade(); return; }
    if (!user || saving) return;
    if (!head.entry_date) { toast.error(l('Choose a date.', 'Pilih tarikh.')); return; }
    if (rows.some(r => !amountOk(r.debit) || !amountOk(r.credit))) { toast.error(l('Enter valid amounts with up to two decimal places.', 'Masukkan jumlah sah dengan maksimum dua tempat perpuluhan.')); return; }
    if (!validJournal(lines)) { toast.error(l('Each line needs an account and either a debit or a credit, and total debits must equal total credits.', 'Setiap baris perlu akaun dan sama ada debit atau kredit, dan jumlah debit mesti sama dengan jumlah kredit.')); return; }
    setSaving(true);
    try {
      const payload = { user_id: user.id, ...head, entry_number: head.entry_number.trim(), reference: head.reference.trim(), description: head.description.trim(), lines: lines.map(x => ({ ...x, debit: toSen(x.debit) / 100, credit: toSen(x.credit) / 100 })) };
      const r = id ? await accountingDb.from('journal_entries').update(payload).eq('id', id).eq('user_id', user.id).select('id').single() : await accountingDb.from('journal_entries').insert(payload).select('id').single();
      if (r.error) throw r.error;
      await qc.invalidateQueries({ queryKey: ['ledger', user.id] });
      toast.success(l('Saved', 'Disimpan')); navigate('/journal-entries');
    } catch { toast.error(l('Could not save. Please try again.', 'Tidak dapat menyimpan. Sila cuba lagi.')); }
    finally { setSaving(false); }
  };

  return <form onSubmit={save} className="pb-40 md:pb-28">
    <header className="border-b border-border px-4 md:px-6 py-4 flex items-center gap-3">
      <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/journal-entries')} aria-label={tx('Back')}><ArrowLeft className="h-5 w-5" /></Button>
      <div><p className="text-xs text-muted-foreground">{l('Home / Accounting', 'Utama / Perakaunan')}</p><h1 className="text-xl font-bold">{id ? l('Edit Journal Entry', 'Sunting Catatan Jurnal') : l('New Journal Entry', 'Catatan Jurnal Baharu')}</h1></div>
    </header>
    {loading ? <p className="p-6 text-muted-foreground">{tx('Loading...')}</p> : error ? <p role="alert" className="p-6 text-destructive">{l('Unable to load accounting records. They become available after this draft is accepted.', 'Tidak dapat memuatkan rekod perakaunan. Ia tersedia selepas draf ini diterima.')}</p> :
      <fieldset disabled={readOnly || saving} className="p-4 md:p-6 max-w-5xl space-y-6 min-w-0">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1"><Label htmlFor="je-no">{l('Number', 'Nombor')}</Label><Input id="je-no" value={head.entry_number} maxLength={50} onChange={e => setHead({ ...head, entry_number: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="je-date">{l('Date', 'Tarikh')}</Label><Input id="je-date" type="date" required value={head.entry_date} onChange={e => setHead({ ...head, entry_date: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="je-ref">{l('Reference', 'Rujukan')}</Label><Input id="je-ref" value={head.reference} maxLength={200} onChange={e => setHead({ ...head, reference: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="je-desc">{l('Description', 'Keterangan')}</Label><Input id="je-desc" value={head.description} maxLength={500} onChange={e => setHead({ ...head, description: e.target.value })} /></div>
        </div>
        <section className="space-y-3">
          <h2 className="font-semibold">{l('Lines', 'Baris')}</h2>
          {rows.map((r, i) => <div key={i} className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_2fr_auto] gap-2 items-end border-b border-border pb-3">
            <div className="col-span-2 md:col-span-1 space-y-1 min-w-0"><Label className="text-xs">{l('Account', 'Akaun')}</Label>
              <Select value={r.account_id} onValueChange={v => setRow(i, { account_id: v })}>
                <SelectTrigger aria-label={l('Account', 'Akaun')}><SelectValue placeholder={l('Select account', 'Pilih akaun')} /></SelectTrigger>
                <SelectContent>{accounts.filter(a => a.is_active || a.id === r.account_id).map(a => <SelectItem key={a.id} value={a.id}>{a.code} {a.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1"><Label className="text-xs">{l('Debit', 'Debit')}</Label><Input inputMode="decimal" placeholder="0.00" value={r.debit} onChange={e => setRow(i, { debit: e.target.value, credit: e.target.value ? '' : r.credit })} /></div>
            <div className="space-y-1"><Label className="text-xs">{l('Credit', 'Kredit')}</Label><Input inputMode="decimal" placeholder="0.00" value={r.credit} onChange={e => setRow(i, { credit: e.target.value, debit: e.target.value ? '' : r.debit })} /></div>
            <div className="space-y-1 col-span-2 md:col-span-1"><Label className="text-xs">{l('Memo', 'Memo')}</Label><Input value={r.memo} maxLength={300} onChange={e => setRow(i, { memo: e.target.value })} /></div>
            <Button type="button" variant="ghost" size="icon" aria-label={tx('Delete')} disabled={rows.length <= 2} onClick={() => setRows(rs => rs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>)}
          <Button type="button" variant="outline" className="gap-2" onClick={() => setRows(rs => [...rs, emptyRow()])}><Plus className="h-4 w-4" />{l('Add Line', 'Tambah Baris')}</Button>
          <div className="flex flex-wrap justify-end gap-6 text-sm tabular-nums">
            <span>{l('Total Debit', 'Jumlah Debit')}: <b>{money(totals.debit)}</b></span>
            <span>{l('Total Credit', 'Jumlah Kredit')}: <b>{money(totals.credit)}</b></span>
            <span className={totals.debit === totals.credit ? 'text-muted-foreground' : 'text-destructive'}>{l('Difference', 'Perbezaan')}: <b>{money(Math.abs(totals.debit - totals.credit))}</b></span>
          </div>
        </section>
      </fieldset>}
    <div className="fixed bottom-16 md:bottom-0 inset-x-0 md:left-[220px] z-30 border-t border-border bg-background px-4 md:px-6 py-3 flex justify-end gap-3 safe-area-pb">
      <Button type="button" variant="outline" onClick={() => navigate('/journal-entries')} disabled={saving}>{tx('Cancel')}</Button>
      <Button type="submit" disabled={saving || loading || error} className="gap-2 min-w-28"><Save className="h-4 w-4" />{tx(saving ? 'Saving...' : 'Save')}</Button>
    </div>
  </form>;
}

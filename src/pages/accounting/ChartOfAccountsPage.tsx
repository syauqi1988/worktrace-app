import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useReadOnly } from '@/components/PaidFeatureLock';
import { useL, useTx } from '@/i18n/dual';
import DataListPage, { ListColumn } from '@/components/list/DataListPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { accountingDb, loadLedger } from './api';
import { ACCOUNT_TYPES, AccountType, LedgerAccount, balances } from './shared';

const blank = { id: '', code: '', name: '', type: 'expense' as AccountType, notes: '', is_active: true };

export default function ChartOfAccountsPage() {
  const { user } = useAuth();
  const { readOnly, requestUpgrade } = useReadOnly();
  const qc = useQueryClient();
  const l = useL(); const tx = useTx();
  const query = useQuery({ queryKey: ['ledger', user?.id], queryFn: () => loadLedger(user?.id || ''), enabled: Boolean(user) });
  const accounts = query.data?.accounts || [];
  const entries = query.data?.entries || [];
  const bal = balances(entries, accounts, '', '9999-12-31');
  const used = new Set(entries.flatMap(e => e.lines.map(x => x.account_id)));
  const [form, setForm] = useState<typeof blank | null>(null);
  const [saving, setSaving] = useState(false);
  const typeLabel = (t: AccountType) => { const x = ACCOUNT_TYPES.find(a => a.value === t)!; return l(x.en, x.ms); };
  const refresh = () => qc.invalidateQueries({ queryKey: ['ledger', user?.id] });

  const save = async () => {
    if (readOnly) { requestUpgrade(); return; }
    if (!user || !form || saving) return;
    if (!form.code.trim() || !form.name.trim()) { toast.error(l('Code and name are required.', 'Kod dan nama diperlukan.')); return; }
    if (accounts.some(a => a.code === form.code.trim() && a.id !== form.id)) { toast.error(l('This code is already used.', 'Kod ini sudah digunakan.')); return; }
    setSaving(true);
    try {
      const payload = { user_id: user.id, code: form.code.trim(), name: form.name.trim(), type: form.type, notes: form.notes.trim(), is_active: form.is_active };
      const r = form.id ? await accountingDb.from('ledger_accounts').update(payload).eq('id', form.id).eq('user_id', user.id) : await accountingDb.from('ledger_accounts').insert(payload);
      if (r.error) throw r.error;
      await refresh(); setForm(null); toast.success(l('Saved', 'Disimpan'));
    } catch { toast.error(l('Could not save. Please try again.', 'Tidak dapat menyimpan. Sila cuba lagi.')); }
    finally { setSaving(false); }
  };
  const remove = async (a: LedgerAccount) => {
    if (readOnly) { requestUpgrade(); return; }
    if (!user) return;
    if (a.system_key || used.has(a.id)) { toast.error(l('This account is in use and cannot be deleted. You can deactivate it instead.', 'Akaun ini sedang digunakan dan tidak boleh dipadam. Anda boleh nyahaktifkannya.')); return; }
    const { error } = await accountingDb.from('ledger_accounts').delete().eq('id', a.id).eq('user_id', user.id);
    if (error) { toast.error(l('Could not delete.', 'Tidak dapat memadam.')); return; }
    await refresh(); toast.success(l('Deleted', 'Dipadam'));
  };
  const columns: ListColumn<LedgerAccount>[] = [
    { key: 'code', header: 'Code', render: a => <span className="tabular-nums">{a.code}</span>, sortValue: a => a.code },
    { key: 'name', header: 'Name', render: a => <span className="inline-flex items-center gap-2">{a.name}{a.system_key && <Lock className="h-3 w-3 text-muted-foreground" aria-label={l('Used for automatic postings', 'Digunakan untuk pos automatik')} />}{!a.is_active && <span className="text-xs text-muted-foreground">({l('Inactive', 'Tidak aktif')})</span>}</span>, sortValue: a => a.name },
    { key: 'type', header: 'Type', render: a => typeLabel(a.type), sortValue: a => a.type },
    { key: 'amount', header: 'Balance', align: 'right', render: a => <span className="tabular-nums">RM {((bal.get(a.id) || 0) / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>, sortValue: a => bal.get(a.id) || 0 },
  ];
  return <>
    {query.isError && <p role="alert" className="mx-4 md:mx-6 mt-4 text-destructive">{l('Unable to load accounting records. They become available after this draft is accepted.', 'Tidak dapat memuatkan rekod perakaunan. Ia tersedia selepas draf ini diterima.')}</p>}
    <DataListPage breadcrumb="Accounting" title="Chart of Accounts" newLabel="New Account" onNew={() => readOnly ? requestUpgrade() : setForm({ ...blank })}
      rows={accounts} loading={query.isLoading} getRowId={a => a.id} columns={columns} searchValues={a => [a.code, a.name]}
      filters={[{ label: 'Type', options: ACCOUNT_TYPES.map(t => ({ value: t.value, label: l(t.en, t.ms) })), match: (a, v) => a.type === v }]}
      onRowClick={a => !readOnly && setForm({ id: a.id, code: a.code, name: a.name, type: a.type, notes: a.notes, is_active: a.is_active })}
      rowActions={a => readOnly ? null : <div className="flex justify-end">
        <Button variant="ghost" size="icon" aria-label={tx('Edit')} onClick={() => setForm({ id: a.id, code: a.code, name: a.name, type: a.type, notes: a.notes, is_active: a.is_active })}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" aria-label={tx('Delete')} onClick={() => remove(a)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>} />
    <Dialog open={Boolean(form)} onOpenChange={o => !o && !saving && setForm(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>{form?.id ? l('Edit Account', 'Sunting Akaun') : l('New Account', 'Akaun Baharu')}</DialogTitle></DialogHeader>
        {form && <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label htmlFor="acc-code">{l('Code', 'Kod')}</Label><Input id="acc-code" value={form.code} maxLength={20} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label htmlFor="acc-name">{l('Name', 'Nama')}</Label><Input id="acc-name" value={form.name} maxLength={200} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label>{l('Type', 'Jenis')}</Label>
            <Select value={form.type} disabled={Boolean(form.id && accounts.find(a => a.id === form.id)?.system_key)} onValueChange={v => setForm({ ...form, type: v as AccountType })}>
              <SelectTrigger aria-label={l('Type', 'Jenis')}><SelectValue /></SelectTrigger>
              <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{l(t.en, t.ms)}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1"><Label htmlFor="acc-notes">{l('Notes', 'Catatan')}</Label><Textarea id="acc-notes" rows={2} value={form.notes} maxLength={1000} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />{l('Active', 'Aktif')}</label>
        </div>}
        <DialogFooter><Button variant="outline" onClick={() => setForm(null)} disabled={saving}>{tx('Cancel')}</Button><Button onClick={save} disabled={saving}>{tx(saving ? 'Saving...' : 'Save')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

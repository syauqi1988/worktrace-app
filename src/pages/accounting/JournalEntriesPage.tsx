import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useReadOnly } from '@/components/PaidFeatureLock';
import { useL, useTx } from '@/i18n/dual';
import DataListPage, { ListColumn } from '@/components/list/DataListPage';
import { Button } from '@/components/ui/button';
import { accountingDb, loadLedger } from './api';
import { PostedEntry, lineTotals } from './shared';

export default function JournalEntriesPage() {
  const { user } = useAuth();
  const { readOnly, requestUpgrade } = useReadOnly();
  const navigate = useNavigate(); const qc = useQueryClient();
  const l = useL(); const tx = useTx();
  const [busy, setBusy] = useState(false);
  const query = useQuery({ queryKey: ['ledger', user?.id], queryFn: () => loadLedger(user?.id || ''), enabled: Boolean(user) });
  const rows = [...(query.data?.entries || [])].sort((a, b) => b.date.localeCompare(a.date));
  const remove = async (e: PostedEntry) => {
    if (readOnly) { requestUpgrade(); return; }
    if (!user || busy || !window.confirm(l('Delete this journal entry?', 'Padam catatan jurnal ini?'))) return;
    setBusy(true);
    const { error } = await accountingDb.from('journal_entries').delete().eq('id', e.id).eq('user_id', user.id);
    setBusy(false);
    if (error) { toast.error(l('Could not delete.', 'Tidak dapat memadam.')); return; }
    await qc.invalidateQueries({ queryKey: ['ledger', user.id] }); toast.success(l('Deleted', 'Dipadam'));
  };
  const columns: ListColumn<PostedEntry>[] = [
    { key: 'date', header: 'Date', render: e => e.date, sortValue: e => e.date },
    { key: 'number', header: 'Number', render: e => <span className="font-medium">{e.number}</span>, sortValue: e => e.number },
    { key: 'description', header: 'Description', render: e => tx(e.description.split(' · ')[0]) + (e.description.includes(' · ') ? ' · ' + e.description.split(' · ').slice(1).join(' · ') : '') },
    { key: 'source', header: 'Source', render: e => e.source === 'Auto' ? l('Automatic', 'Automatik') : l('Manual', 'Manual') },
    { key: 'amount', header: 'Amount', align: 'right', render: e => <span className="tabular-nums">RM {(lineTotals(e.lines).debit / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>, sortValue: e => lineTotals(e.lines).debit },
  ];
  return <>
    {query.isError && <p role="alert" className="mx-4 md:mx-6 mt-4 text-destructive">{l('Unable to load accounting records. They become available after this draft is accepted.', 'Tidak dapat memuatkan rekod perakaunan. Ia tersedia selepas draf ini diterima.')}</p>}
    <p className="mx-4 md:mx-6 mt-4 text-xs text-muted-foreground">{l('Automatic entries come from invoices, bills, purchase payments, credit notes and Bank records. Edit the original document to change them.', 'Catatan automatik datang daripada invois, bil, bayaran pembelian, nota kredit dan rekod Bank. Sunting dokumen asal untuk mengubahnya.')}</p>
    <DataListPage breadcrumb="Accounting" title="Journal Entries" newLabel="New Journal Entry" onNew={() => readOnly ? requestUpgrade() : navigate('/journal-entries/new')}
      rows={rows} loading={query.isLoading} getRowId={e => e.id} columns={columns} searchValues={e => [e.number, e.description]} getDate={e => e.date}
      filters={[{ label: 'Source', options: [{ value: 'Manual', label: l('Manual', 'Manual') }, { value: 'Auto', label: l('Automatic', 'Automatik') }], match: (e, v) => e.source === v }]}
      getAmount={e => lineTotals(e.lines).debit / 100} onRowClick={e => navigate(e.path)}
      rowActions={e => e.source === 'Manual' && !readOnly ? <div className="flex justify-end"><Button variant="ghost" size="icon" aria-label={tx('Delete')} onClick={ev => { ev.stopPropagation(); remove(e); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div> : null} />
  </>;
}

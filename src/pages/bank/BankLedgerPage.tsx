import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useReadOnly } from '@/components/PaidFeatureLock';
import { useL, useTx } from '@/i18n/dual';
import { Button } from '@/components/ui/button';
import DataListPage from '@/components/list/DataListPage';
import { loadBank } from './api';
import { BANK_CONFIG, money, transactionEffect } from './shared';

export default function BankLedgerPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { readOnly } = useReadOnly();
  const navigate = useNavigate();
  const tx = useTx();
  const l = useL();
  const query = useQuery({ queryKey: ['bank', user?.id], queryFn: () => loadBank(user?.id || ''), enabled: Boolean(user) });
  const account = query.data?.accounts.find(a => a.id === id);
  const entries = (query.data?.transactions || []).filter(t => t.account_id === id || t.to_account_id === id)
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  let balanceSen = Math.round(Number(account?.opening_balance || 0) * 100);
  const rows = entries.map(t => {
    const effect = transactionEffect(t, id || '');
    balanceSen += effect;
    const otherId = t.account_id === id ? t.to_account_id : t.account_id;
    return { ...t, inflow: Math.max(0, effect / 100), outflow: Math.max(0, -effect / 100), balance: balanceSen / 100,
      other: query.data?.accounts.find(a => a.id === otherId)?.name || t.party };
  }).reverse();
  if (query.isError || (!query.isLoading && !account)) return <div role="alert" className="p-6 space-y-3"><p>{l('Unable to open this account.', 'Tidak dapat membuka akaun ini.')}</p><Button variant="outline" onClick={() => navigate('/bank-accounts')}>{tx('Back')}</Button></div>;
  return <>
    <div className="px-4 md:px-6 pt-4 flex flex-wrap items-center gap-3">
      <Button variant="ghost" size="icon" aria-label={tx('Back')} onClick={() => navigate('/bank-accounts')}><ArrowLeft className="h-4 w-4" /></Button>
      <span className="text-sm text-muted-foreground">{tx('Opening Balance')}: {money(account?.opening_balance || 0)}</span>
      <span className="font-semibold ml-auto">{tx('Current Balance')}: {money(balanceSen / 100)}</span>
      {!readOnly && <Button variant="outline" size="icon" aria-label={tx('Edit Account')} onClick={() => navigate(`/bank-accounts/${id}/edit`)}><Pencil className="h-4 w-4" /></Button>}
    </div>
    <DataListPage breadcrumb="Bank" title={account?.name || tx('Account Ledger')} rows={rows} loading={query.isLoading} getRowId={t => t.id}
      getDate={t => t.transaction_date} searchValues={t => [t.reference, t.description, t.party, t.other]}
      onRowClick={t => navigate(`${BANK_CONFIG[t.kind].path}/${t.id}/edit`)} columns={[
        { key: 'reference', header: 'Reference', render: t => t.reference || t.description || '—' },
        { key: 'date', header: 'Date', render: t => t.transaction_date, sortValue: t => t.transaction_date },
        { key: 'type', header: 'Type', render: t => tx(BANK_CONFIG[t.kind].title) },
        { key: 'party', header: 'Name', render: t => t.other || '—' },
        { key: 'in', header: 'Money In', align: 'right', render: t => t.inflow ? money(t.inflow) : '—' },
        { key: 'out', header: 'Money Out', align: 'right', render: t => t.outflow ? money(t.outflow) : '—' },
        { key: 'balance', header: 'Balance', align: 'right', render: t => <span className="font-semibold tabular-nums">{money(t.balance)}</span> },
      ]} />
  </>;
}
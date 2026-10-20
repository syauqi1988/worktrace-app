import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useReadOnly } from '@/components/PaidFeatureLock';
import { useL, useTx } from '@/i18n/dual';
import DataListPage, { ListColumn } from '@/components/list/DataListPage';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { bankDb, loadBank } from './api';
import { BANK_CONFIG, BankAccount, BankKind, BankTransaction, accountBalance, money } from './shared';

export default function BankListPage({ kind }: { kind: BankKind | 'account' }) {
  const { user } = useAuth();
  const { readOnly, requestUpgrade } = useReadOnly();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const l = useL();
  const tx = useTx();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const query = useQuery({ queryKey: ['bank', user?.id], queryFn: () => loadBank(user?.id || ''), enabled: Boolean(user) });
  const accounts = query.data?.accounts || [];
  const transactions = query.data?.transactions || [];
  const accountMode = kind === 'account';
  const path = accountMode ? '/bank-accounts' : BANK_CONFIG[kind].path;
  const name = (id: string | null) => accounts.find(a => a.id === id)?.name || '—';
  const balances = new Map(accounts.map(a => [a.id, accountBalance(a, transactions)]));
  const icon = (label: string, action: () => void, child: React.ReactNode) => (
    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={tx(label)} onClick={action}>{child}</Button></TooltipTrigger><TooltipContent>{tx(label)}</TooltipContent></Tooltip>
  );
  const actions = (id: string) => <div className="flex justify-end">
    {accountMode && icon('Account Ledger', () => navigate(`/bank-accounts/${id}`), <BookOpen className="h-4 w-4" />)}
    {!readOnly && <>{icon('Edit', () => navigate(`${path}/${id}/edit`), <Pencil className="h-4 w-4" />)}{icon('Delete', () => setPendingDelete(id), <Trash2 className="h-4 w-4 text-destructive" />)}</>}
  </div>;
  const remove = async () => {
    if (readOnly) { requestUpgrade(); return; }
    if (!user || !pendingDelete || deleting) return;
    if (accountMode && transactions.some(t => t.account_id === pendingDelete || t.to_account_id === pendingDelete)) {
      toast.error(l('This account has transactions and cannot be deleted.', 'Akaun ini mempunyai transaksi dan tidak boleh dipadam.')); setPendingDelete(null); return;
    }
    setDeleting(true);
    try {
      const { error } = await bankDb.from(accountMode ? 'bank_accounts' : 'bank_transactions').delete().eq('id', pendingDelete).eq('user_id', user.id).select('id').single();
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['bank', user.id] });
      setPendingDelete(null);
      toast.success(l('Deleted', 'Dipadam'));
    } catch { toast.error(l('Could not delete. The account may have transactions.', 'Tidak dapat memadam. Akaun mungkin mempunyai transaksi.')); }
    finally { setDeleting(false); }
  };
  const accountColumns: ListColumn<BankAccount>[] = [
    { key: 'name', header: 'Name', render: a => a.name, sortValue: a => a.name },
    { key: 'bank', header: 'Bank Name', render: a => a.bank_name || '—' },
    { key: 'number', header: 'Account Number', render: a => a.account_number || '—' },
    { key: 'opening', header: 'Opening Balance', align: 'right', render: a => money(a.opening_balance), sortValue: a => Number(a.opening_balance) },
    { key: 'amount', header: 'Current Balance', align: 'right', render: a => <span className="font-semibold tabular-nums">{money(balances.get(a.id) || 0)}</span>, sortValue: a => balances.get(a.id) || 0 },
  ];
  const transactionColumns: ListColumn<BankTransaction>[] = [
    { key: 'reference', header: 'Reference', render: t => <div><span className="font-medium">{t.reference || t.description || tx(BANK_CONFIG[t.kind].title)}</span>{t.reference && t.description && <p className="text-xs text-muted-foreground break-words">{t.description}</p>}</div>, sortValue: t => t.reference },
    { key: 'date', header: 'Date', render: t => t.transaction_date, sortValue: t => t.transaction_date },
    { key: 'account', header: kind === 'transfer' ? 'From Account' : 'Account', render: t => name(t.account_id) },
    { key: 'party', header: kind === 'transfer' ? 'To Account' : kind === 'money_in' ? 'Received From' : 'Paid To', render: t => kind === 'transfer' ? name(t.to_account_id) : t.party || '—' },
    { key: 'amount', header: 'Amount', align: 'right', render: t => <span className="tabular-nums">{money(t.amount)}</span>, sortValue: t => Number(t.amount) },
  ];
  return <>
    {query.isError && <div role="alert" className="mx-4 md:mx-6 mt-4 flex flex-wrap items-center gap-3 text-destructive"><p>{l('Unable to load Bank records. Please try again later.', 'Tidak dapat memuatkan rekod Bank. Sila cuba lagi kemudian.')}</p><Button variant="outline" size="icon" aria-label={l('Retry', 'Cuba lagi')} onClick={() => query.refetch()}><RefreshCw className="h-4 w-4" /></Button></div>}
    {accountMode ? <DataListPage breadcrumb="Bank" title="Accounts" newLabel="New Account" onNew={() => navigate(`${path}/new`)}
      rows={accounts} loading={query.isLoading} getRowId={a => a.id} columns={accountColumns} searchValues={a => [a.name, a.bank_name, a.account_number]}
      onRowClick={a => navigate(`/bank-accounts/${a.id}`)} rowActions={a => actions(a.id)} getAmount={a => balances.get(a.id) || 0} amountHeader="Current Balance"
      headerExtra={readOnly ? undefined : undefined} /> :
      <DataListPage key={kind} breadcrumb="Bank" title={BANK_CONFIG[kind].title} newLabel={BANK_CONFIG[kind].newTitle} onNew={() => navigate(`${path}/new`)}
        rows={transactions.filter(t => t.kind === kind)} loading={query.isLoading} getRowId={t => t.id} columns={transactionColumns}
        searchValues={t => [t.reference, t.party, t.description, name(t.account_id), name(t.to_account_id)]} getDate={t => t.transaction_date}
        filters={[{ label: 'Account', options: accounts.map(a => ({ value: a.id, label: a.name })), match: (t, id) => t.account_id === id || t.to_account_id === id }]}
        getAmount={t => Number(t.amount)} onRowClick={t => navigate(`${path}/${t.id}/edit`)} rowActions={t => actions(t.id)} />}
    <AlertDialog open={Boolean(pendingDelete)} onOpenChange={open => { if (!open && !deleting) setPendingDelete(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{l('Delete this record?', 'Padam rekod ini?')}</AlertDialogTitle>
        <AlertDialogDescription>{l('This cannot be undone. Account balances will be recalculated.', 'Tindakan ini tidak boleh dibatalkan. Baki akaun akan dikira semula.')}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={deleting}>{tx('Cancel')}</AlertDialogCancel><Button variant="destructive" onClick={remove} disabled={deleting}>{l(deleting ? 'Deleting...' : 'Delete', deleting ? 'Memadam...' : 'Padam')}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
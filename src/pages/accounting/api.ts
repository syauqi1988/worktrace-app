import { supabase } from '@/integrations/supabase/client';
import { allRows } from '@/lib/reports/data';
import { DEFAULT_ACCOUNTS, autoEntries, manualEntries, type AutoSources, type JournalEntry, type LedgerAccount, type LedgerData } from './shared';

// Staged tables are not in generated Supabase types until draft acceptance.
export const accountingDb = supabase as any;

/** Load the chart, preloading the standard accounts the first time. */
export async function loadAccounts(userId: string): Promise<LedgerAccount[]> {
  let rows = (await allRows('ledger_accounts', userId, '*')) as LedgerAccount[];
  if (!rows.length) {
    const { error } = await accountingDb.from('ledger_accounts').upsert(DEFAULT_ACCOUNTS.map(a => ({ ...a, user_id: userId })), { onConflict: 'user_id,code', ignoreDuplicates: true });
    if (error) throw error;
    rows = (await allRows('ledger_accounts', userId, '*')) as LedgerAccount[];
  }
  return rows.sort((a, b) => a.code.localeCompare(b.code));
}
export async function loadJournals(userId: string): Promise<JournalEntry[]> {
  return (await allRows('journal_entries', userId, '*')) as JournalEntry[];
}
export async function loadLedger(userId: string): Promise<LedgerData> {
  const [accounts, journals, invoices, purchases, bankAccounts, bankTransactions] = await Promise.all([
    loadAccounts(userId), loadJournals(userId),
    allRows('invoices', userId, 'id,invoice_number,status,total,issued_date,created_at,paid_date'),
    allRows('purchase_documents', userId, 'id,doc_type,doc_number,status,total,doc_date,party'),
    allRows('bank_accounts', userId, 'id,name,opening_balance,created_at'),
    allRows('bank_transactions', userId, 'id,kind,amount,transaction_date,reference,description,party'),
  ]);
  const src = { invoices, purchases, bankAccounts, bankTransactions } as unknown as AutoSources;
  return { accounts, entries: [...manualEntries(journals), ...autoEntries(src, accounts)] };
}

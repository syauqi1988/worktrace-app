import { supabase } from '@/integrations/supabase/client';
import type { BankAccount, BankTransaction } from './shared';

// Staged tables are not in generated Supabase types until draft acceptance.
export const bankDb = supabase as any;
export async function loadBank(userId: string) {
  const [accounts, transactions] = await Promise.all([
    bankDb.from('bank_accounts').select('*').eq('user_id', userId).order('name'),
    bankDb.from('bank_transactions').select('*').eq('user_id', userId).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }),
  ]);
  if (accounts.error) throw accounts.error;
  if (transactions.error) throw transactions.error;
  return { accounts: accounts.data as BankAccount[], transactions: transactions.data as BankTransaction[] };
}
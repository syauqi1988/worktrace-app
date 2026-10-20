export type BankKind = 'money_in' | 'money_out' | 'transfer';
export type BankAccount = {
  id: string; user_id: string; name: string; bank_name: string;
  account_number: string; opening_balance: number; notes: string; created_at: string;
};
export type BankTransaction = {
  id: string; user_id: string; kind: BankKind; account_id: string;
  to_account_id: string | null; amount: number; transaction_date: string;
  reference: string; party: string; description: string; notes: string; created_at: string;
};
export const BANK_CONFIG = {
  money_in: { path: '/money-in', title: 'Money In', newTitle: 'New Money In', editTitle: 'Edit Money In' },
  money_out: { path: '/money-out', title: 'Money Out', newTitle: 'New Money Out', editTitle: 'Edit Money Out' },
  transfer: { path: '/transfers', title: 'Transfers', newTitle: 'New Transfer', editTitle: 'Edit Transfer' },
} as const;

/** Convert MYR input to integer sen to avoid floating-point balance drift. */
export function parseMoney(value: string): number | null {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && Math.abs(amount) < 1e12 ? Math.round(amount * 100) : null;
}
export const money = (value: number) => `RM ${Number(value).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function transactionEffect(row: BankTransaction, accountId: string): number {
  const sen = Math.round(Number(row.amount) * 100);
  if (row.kind === 'transfer' && row.to_account_id === accountId) return sen;
  if (row.account_id !== accountId) return 0;
  return row.kind === 'money_in' ? sen : -sen;
}
export function accountBalance(account: BankAccount, rows: BankTransaction[]): number {
  return (Math.round(Number(account.opening_balance) * 100) + rows.reduce((sum, row) => sum + transactionEffect(row, account.id), 0)) / 100;
}
export function validTransfer(from: string, to: string): boolean {
  return Boolean(from && to && from !== to);
}
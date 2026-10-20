import { describe, expect, it } from 'vitest';
import { BankAccount, BankTransaction, accountBalance, parseMoney, validTransfer } from './shared';

const account = (id: string): BankAccount => ({ id, user_id: 'u', name: id, bank_name: '', account_number: '', opening_balance: 100, notes: '', created_at: '' });
const row = (kind: BankTransaction['kind'], amount: number, to: string | null = null): BankTransaction => ({ id: 't', user_id: 'u', kind, amount, account_id: 'a', to_account_id: to, transaction_date: '2026-10-20', reference: '', party: '', description: '', notes: '', created_at: '' });
describe('Bank balances', () => {
  it('adds money in to the opening balance', () => expect(accountBalance(account('a'), [row('money_in', 25.50)])).toBe(125.50));
  it('subtracts money out from the opening balance', () => expect(accountBalance(account('a'), [row('money_out', 10.25)])).toBe(89.75));
  it('moves a transfer from source to destination without changing total funds', () => {
    const rows = [row('transfer', 30, 'b')];
    expect(accountBalance(account('a'), rows)).toBe(70);
    expect(accountBalance(account('b'), rows)).toBe(130);
  });
  it('recalculates from edited or deleted records', () => {
    expect(accountBalance(account('a'), [row('money_out', 12)])).toBe(88);
    expect(accountBalance(account('a'), [])).toBe(100);
  });
  it('ignores unrelated accounts', () => expect(accountBalance(account('c'), [row('transfer', 30, 'b')])).toBe(100));
  it('keeps calculations precise to the sen', () => expect(accountBalance({ ...account('a'), opening_balance: 0 }, [row('money_in', 0.1), row('money_in', 0.2)])).toBe(0.3));
  it('requires two different accounts for transfers', () => {
    expect(validTransfer('a', 'a')).toBe(false);
    expect(validTransfer('a', '')).toBe(false);
    expect(validTransfer('a', 'b')).toBe(true);
  });
  it('rejects malformed or overprecision currency input', () => {
    expect(parseMoney('25.50')).toBe(2550);
    expect(parseMoney('-10.25')).toBe(-1025);
    expect(parseMoney('1.234')).toBeNull();
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('Infinity')).toBeNull();
  });
});
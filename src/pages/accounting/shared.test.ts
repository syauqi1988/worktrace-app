import { describe, expect, it } from 'vitest';
import { autoEntries, buildLedgerReport, validJournal, DEFAULT_ACCOUNTS, type LedgerAccount } from './shared';
const accounts: LedgerAccount[] = DEFAULT_ACCOUNTS.map((a, i) => ({ ...a, id: `a${i}`, user_id: 'u', is_active: true, notes: '', created_at: '' }));
const src = { invoices: [{ id: '1', invoice_number: 'INV-1', status: 'Paid', total: 100, issued_date: '2026-01-05', created_at: '', paid_date: '2026-01-10' }, { id: '2', invoice_number: 'INV-2', status: 'Draft', total: 50, issued_date: '2026-01-05', created_at: '', paid_date: null }],
  purchases: [{ id: 'b', doc_type: 'bill', doc_number: 'B-1', status: 'Unpaid', total: 30, doc_date: '2026-01-06', party: 'S' }], bankAccounts: [], bankTransactions: [] };
const data = { accounts, entries: autoEntries(src, accounts) };
describe('accounting', () => {
  it('rejects unbalanced journals', () => expect(validJournal([{ account_id: 'a', debit: 10, credit: 0 }, { account_id: 'b', debit: 0, credit: 9.99 }])).toBe(false));
  it('rejects lines with both debit and credit', () => expect(validJournal([{ account_id: 'a', debit: 10, credit: 10 }, { account_id: 'b', debit: 10, credit: 10 }])).toBe(false));
  it('accepts balanced journals', () => expect(validJournal([{ account_id: 'a', debit: 0.1, credit: 0 }, { account_id: 'a2', debit: 0.2, credit: 0 }, { account_id: 'b', debit: 0, credit: 0.3 }])).toBe(true));
  it('skips draft invoices', () => expect(data.entries.some(e => e.number === 'INV-2')).toBe(false));
  it('profit equals sales minus purchases', () => expect(buildLedgerReport('Profit & Loss', data, '2026-01-01', '2026-12-31').total).toBe(70));
  it('balance sheet balances', () => { const r = buildLedgerReport('Balance Sheet', data, '', '2026-12-31'); expect(r.total).toBe(100); expect(r.rows.at(-1)?.cells[2]).toBe(100); });
  it('trial balance debits equal credits', () => { const last = buildLedgerReport('Trial Balance', data, '', '2026-12-31').rows.at(-1)!.cells; expect(last[2]).toBe(last[3]); });
});

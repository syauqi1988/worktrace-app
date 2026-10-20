import type { ReportOutput, ReportRow } from '@/lib/reports/engine';

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type LedgerAccount = { id: string; user_id: string; code: string; name: string; type: AccountType; system_key: string | null; is_active: boolean; notes: string; created_at: string };
export type JournalLine = { account_id: string; debit: number; credit: number; memo?: string };
export type JournalEntry = { id: string; user_id: string; entry_number: string; entry_date: string; reference: string; description: string; lines: JournalLine[]; created_at: string };
/** A posted entry: manual journals plus entries generated from sales, purchase and bank records. */
export type PostedEntry = { id: string; number: string; date: string; description: string; source: 'Manual' | 'Auto'; path: string; lines: { account_id: string; debit: number; credit: number }[] };

export const ACCOUNT_TYPES: { value: AccountType; en: string; ms: string; debitNormal: boolean }[] = [
  { value: 'asset', en: 'Asset', ms: 'Aset', debitNormal: true },
  { value: 'liability', en: 'Liability', ms: 'Liabiliti', debitNormal: false },
  { value: 'equity', en: 'Equity', ms: 'Ekuiti', debitNormal: false },
  { value: 'income', en: 'Income', ms: 'Pendapatan', debitNormal: false },
  { value: 'expense', en: 'Expense', ms: 'Perbelanjaan', debitNormal: true },
];
export const debitNormal = (t: AccountType) => t === 'asset' || t === 'expense';

/** Preloaded chart. system_key accounts receive automatic postings. */
export const DEFAULT_ACCOUNTS: { code: string; name: string; type: AccountType; system_key: string | null }[] = [
  { code: '1000', name: 'Cash at Bank', type: 'asset', system_key: 'cash' },
  { code: '1010', name: 'Petty Cash', type: 'asset', system_key: null },
  { code: '1100', name: 'Trade Receivables', type: 'asset', system_key: 'receivables' },
  { code: '1200', name: 'Inventory', type: 'asset', system_key: null },
  { code: '1300', name: 'Deposits & Prepayments', type: 'asset', system_key: null },
  { code: '1500', name: 'Equipment & Tools', type: 'asset', system_key: null },
  { code: '1510', name: 'Motor Vehicles', type: 'asset', system_key: null },
  { code: '2000', name: 'Trade Payables', type: 'liability', system_key: 'payables' },
  { code: '2100', name: 'SST Payable', type: 'liability', system_key: null },
  { code: '2200', name: 'Accruals', type: 'liability', system_key: null },
  { code: '2300', name: 'Loans', type: 'liability', system_key: null },
  { code: '3000', name: "Owner's Capital", type: 'equity', system_key: null },
  { code: '3100', name: 'Opening Balance Equity', type: 'equity', system_key: 'opening' },
  { code: '3200', name: 'Drawings', type: 'equity', system_key: null },
  { code: '4000', name: 'Sales', type: 'income', system_key: 'sales' },
  { code: '4100', name: 'Other Income', type: 'income', system_key: 'other_income' },
  { code: '5000', name: 'Purchases', type: 'expense', system_key: 'purchases' },
  { code: '6000', name: 'General Expenses', type: 'expense', system_key: 'expenses' },
  { code: '6100', name: 'Salaries & Wages', type: 'expense', system_key: null },
  { code: '6200', name: 'Rent', type: 'expense', system_key: null },
  { code: '6300', name: 'Utilities', type: 'expense', system_key: null },
  { code: '6400', name: 'Transport & Fuel', type: 'expense', system_key: null },
  { code: '6500', name: 'Bank Charges', type: 'expense', system_key: null },
];

export const toSen = (v: unknown) => Math.round((Number(v) || 0) * 100);
export function lineTotals(lines: { debit: number; credit: number }[]) {
  return lines.reduce((s, l) => ({ debit: s.debit + toSen(l.debit), credit: s.credit + toSen(l.credit) }), { debit: 0, credit: 0 });
}
/** Valid journal: at least two lines, each one-sided and positive, debits equal credits. */
export function validJournal(lines: JournalLine[]): boolean {
  if (lines.length < 2) return false;
  if (lines.some(l => !l.account_id || toSen(l.debit) < 0 || toSen(l.credit) < 0 || (toSen(l.debit) > 0) === (toSen(l.credit) > 0))) return false;
  const t = lineTotals(lines);
  return t.debit === t.credit && t.debit > 0;
}

export type AutoSources = {
  invoices: { id: string; invoice_number: string; status: string; total: number; issued_date: string | null; created_at: string; paid_date: string | null }[];
  purchases: { id: string; doc_type: string; doc_number: string; status: string; total: number; doc_date: string; party: string }[];
  bankAccounts: { id: string; name: string; opening_balance: number; created_at: string }[];
  bankTransactions: { id: string; kind: string; amount: number; transaction_date: string; reference: string; description: string; party: string }[];
};
const d10 = (v: string | null | undefined) => (v || '').slice(0, 10);
const PURCHASE_PATHS: Record<string, string> = { bill: '/bills', payment: '/purchase-payments', credit_note: '/purchase-credit-notes' };

/** Posting rules: turn saved documents into balanced journals using the system accounts. */
export function autoEntries(src: AutoSources, accounts: LedgerAccount[]): PostedEntry[] {
  const key = new Map(accounts.filter(a => a.system_key).map(a => [a.system_key as string, a.id]));
  const out: PostedEntry[] = [];
  const post = (id: string, number: string, date: string, description: string, path: string, dr: string, cr: string, amount: number) => {
    const sen = toSen(amount); const debit = key.get(dr); const credit = key.get(cr);
    if (sen <= 0 || !debit || !credit || !date) return;
    out.push({ id, number, date, description, source: 'Auto', path, lines: [{ account_id: debit, debit: sen / 100, credit: 0 }, { account_id: credit, debit: 0, credit: sen / 100 }] });
  };
  for (const i of src.invoices) {
    if (i.status === 'Draft') continue;
    const issued = d10(i.issued_date || i.created_at);
    post(`inv-${i.id}`, i.invoice_number, issued, 'Invoice', `/invoices/${i.id}`, 'receivables', 'sales', i.total);
    if (i.status === 'Paid') post(`rcpt-${i.id}`, i.invoice_number, d10(i.paid_date) || issued, 'Invoice payment', `/invoices/${i.id}`, 'cash', 'receivables', i.total);
  }
  for (const p of src.purchases) {
    if (p.status === 'Draft') continue;
    const path = `${PURCHASE_PATHS[p.doc_type] || '/bills'}/${p.id}/edit`;
    const date = d10(p.doc_date);
    if (p.doc_type === 'bill') post(`bill-${p.id}`, p.doc_number, date, `Bill · ${p.party}`, path, 'purchases', 'payables', p.total);
    if (p.doc_type === 'payment' && p.status === 'Paid') post(`pay-${p.id}`, p.doc_number, date, `Purchase payment · ${p.party}`, path, 'payables', 'cash', p.total);
    if (p.doc_type === 'credit_note' && p.status !== 'Draft') post(`pcn-${p.id}`, p.doc_number, date, `Purchase credit note · ${p.party}`, path, 'payables', 'purchases', p.total);
  }
  for (const a of src.bankAccounts) {
    const sen = toSen(a.opening_balance);
    if (sen > 0) post(`open-${a.id}`, 'OB', d10(a.created_at), `Opening balance · ${a.name}`, `/bank-accounts/${a.id}`, 'cash', 'opening', sen / 100);
    if (sen < 0) post(`open-${a.id}`, 'OB', d10(a.created_at), `Opening balance · ${a.name}`, `/bank-accounts/${a.id}`, 'opening', 'cash', -sen / 100);
  }
  for (const t of src.bankTransactions) {
    const label = t.description || t.party;
    if (t.kind === 'money_in') post(`bank-${t.id}`, t.reference || 'Money In', d10(t.transaction_date), label || 'Money In', `/money-in/${t.id}/edit`, 'cash', 'other_income', t.amount);
    if (t.kind === 'money_out') post(`bank-${t.id}`, t.reference || 'Money Out', d10(t.transaction_date), label || 'Money Out', `/money-out/${t.id}/edit`, 'expenses', 'cash', t.amount);
  }
  return out;
}
export function manualEntries(rows: JournalEntry[]): PostedEntry[] {
  return rows.map(r => ({ id: r.id, number: r.entry_number || r.reference || r.id.slice(0, 8), date: d10(r.entry_date), description: r.description, source: 'Manual', path: `/journal-entries/${r.id}/edit`,
    lines: (Array.isArray(r.lines) ? r.lines : []).map(l => ({ account_id: l.account_id, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })) }));
}

/** Balance in sen, positive on the account's normal side. */
export function balances(entries: PostedEntry[], accounts: LedgerAccount[], from: string, to: string) {
  const type = new Map(accounts.map(a => [a.id, a.type]));
  const m = new Map<string, number>();
  for (const e of entries) {
    if ((from && e.date < from) || e.date > to) continue;
    for (const l of e.lines) {
      const t = type.get(l.account_id); if (!t) continue;
      const net = toSen(l.debit) - toSen(l.credit);
      m.set(l.account_id, (m.get(l.account_id) || 0) + (debitNormal(t) ? net : -net));
    }
  }
  return m;
}

export type LedgerData = { accounts: LedgerAccount[]; entries: PostedEntry[] };
export function buildLedgerReport(name: string, data: LedgerData, from: string, to: string, search = ''): ReportOutput {
  const accounts = [...data.accounts].sort((a, b) => a.code.localeCompare(b.code));
  const byId = new Map(accounts.map(a => [a.id, a]));
  const label = (id: string) => { const a = byId.get(id); return a ? `${a.code} ${a.name}` : '—'; };
  const q = search.trim().toLowerCase();
  const match = (...v: string[]) => !q || v.some(x => x.toLowerCase().includes(q));
  const inRange = data.entries.filter(e => (!from || e.date >= from) && e.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number));
  const typeName = (t: AccountType) => ACCOUNT_TYPES.find(x => x.value === t)?.en || t;

  if (name === 'Chart of Accounts' || name === 'Trial Balance') {
    const bal = balances(data.entries, accounts, '', to);
    const list = accounts.filter(a => match(a.code, a.name, typeName(a.type)));
    if (name === 'Chart of Accounts') return { columns: ['Code', 'Name', 'Type', 'Balance'], moneyColumns: [3], totalLabel: 'Accounts', total: list.length,
      rows: list.map(a => ({ cells: [a.code, a.name, typeName(a.type), (bal.get(a.id) || 0) / 100] })) };
    let dr = 0; let cr = 0; const rows: ReportRow[] = [];
    for (const a of list) {
      const b = bal.get(a.id) || 0; if (!b) continue;
      const debit = debitNormal(a.type) ? b : -b; // signed debit
      if (debit >= 0) dr += debit; else cr -= debit;
      rows.push({ cells: [a.code, a.name, debit > 0 ? debit / 100 : 0, debit < 0 ? -debit / 100 : 0] });
    }
    rows.push({ cells: ['', 'Total', dr / 100, cr / 100] });
    return { columns: ['Code', 'Name', 'Debit', 'Credit'], moneyColumns: [2, 3], totalLabel: 'Total Debit', total: dr / 100, rows };
  }
  if (name === 'Profit & Loss') {
    const bal = balances(data.entries, accounts, from, to);
    const rows: ReportRow[] = []; let income = 0; let expense = 0;
    for (const t of ['income', 'expense'] as AccountType[]) {
      let sub = 0;
      for (const a of accounts.filter(x => x.type === t)) { const b = bal.get(a.id) || 0; if (!b) continue; sub += b; rows.push({ cells: [typeName(t), `${a.code} ${a.name}`, b / 100] }); }
      rows.push({ cells: [typeName(t), t === 'income' ? 'Total Income' : 'Total Expenses', sub / 100] });
      if (t === 'income') income = sub; else expense = sub;
    }
    rows.push({ cells: ['', 'Net Profit', (income - expense) / 100] });
    return { columns: ['Section', 'Account', 'Amount'], moneyColumns: [2], totalLabel: 'Net Profit', total: (income - expense) / 100, rows };
  }
  if (name === 'Balance Sheet') {
    const bal = balances(data.entries, accounts, '', to);
    const rows: ReportRow[] = []; const totals: Record<string, number> = {};
    const earnings = accounts.reduce((s, a) => s + (a.type === 'income' ? (bal.get(a.id) || 0) : a.type === 'expense' ? -(bal.get(a.id) || 0) : 0), 0);
    for (const t of ['asset', 'liability', 'equity'] as AccountType[]) {
      let sub = 0;
      for (const a of accounts.filter(x => x.type === t)) { const b = bal.get(a.id) || 0; if (!b) continue; sub += b; rows.push({ cells: [typeName(t), `${a.code} ${a.name}`, b / 100] }); }
      if (t === 'equity') { sub += earnings; rows.push({ cells: ['Equity', 'Current Earnings', earnings / 100] }); }
      totals[t] = sub;
      rows.push({ cells: [typeName(t), `Total ${typeName(t)}`, sub / 100] });
    }
    rows.push({ cells: ['', 'Total Liabilities & Equity', (totals.liability + totals.equity) / 100] });
    return { columns: ['Section', 'Account', 'Amount'], moneyColumns: [2], totalLabel: 'Total Assets', total: totals.asset / 100, rows };
  }
  if (name === 'Journal Entry Detail') {
    const list = inRange.filter(e => match(e.number, e.description, e.source));
    const total = list.reduce((s, e) => s + lineTotals(e.lines).debit, 0);
    return { columns: ['Date', 'Number', 'Description', 'Source', 'Amount'], moneyColumns: [4], totalLabel: 'Total', total: total / 100,
      rows: list.map(e => ({ cells: [e.date, e.number, e.description, e.source, lineTotals(e.lines).debit / 100], path: e.path })) };
  }
  if (name === 'Double Entry Detail') {
    const rows: ReportRow[] = []; let dr = 0;
    for (const e of inRange) for (const l of e.lines) {
      if (!match(e.number, e.description, label(l.account_id))) continue;
      dr += toSen(l.debit);
      rows.push({ cells: [e.date, e.number, label(l.account_id), e.description, l.debit, l.credit], path: e.path });
    }
    return { columns: ['Date', 'Number', 'Account', 'Description', 'Debit', 'Credit'], moneyColumns: [4, 5], totalLabel: 'Total Debit', total: dr / 100, rows };
  }
  // General Ledger: per account, opening balance then running balance.
  const opening = balances(data.entries, accounts, '', from ? prevDay(from) : '');
  const rows: ReportRow[] = []; let dr = 0;
  for (const a of accounts) {
    if (!match(a.code, a.name)) continue;
    const lines = inRange.flatMap(e => e.lines.filter(l => l.account_id === a.id).map(l => ({ e, l })));
    let run = from ? opening.get(a.id) || 0 : 0;
    if (!lines.length && !run) continue;
    rows.push({ cells: [from || '', 'Opening', `${a.code} ${a.name}`, '', 0, 0, run / 100] });
    for (const { e, l } of lines) {
      const net = toSen(l.debit) - toSen(l.credit); run += debitNormal(a.type) ? net : -net; dr += toSen(l.debit);
      rows.push({ cells: [e.date, e.number, `${a.code} ${a.name}`, e.description, l.debit, l.credit, run / 100], path: e.path });
    }
  }
  return { columns: ['Date', 'Number', 'Account', 'Description', 'Debit', 'Credit', 'Balance'], moneyColumns: [4, 5, 6], totalLabel: 'Total Debit', total: dr / 100, rows };
}
function prevDay(d: string) { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10); }

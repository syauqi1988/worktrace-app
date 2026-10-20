import type { ReportDefinition } from './catalog';
export type ReportItem = { name: string; uom: string; qty: number; amount: number };
export type ReportRecord = { id: string; number: string; date: string; due: string; paidDate: string; party: string; status: string; amount: number; tags: string[]; items: ReportItem[]; path: string; kind?: string; to?: string };
export type ReportRow = { cells: (string | number)[]; path?: string };
export type ReportOutput = { columns: string[]; rows: ReportRow[]; moneyColumns: number[]; total: number; totalLabel: string };
export const sen = (n: number) => Math.round(n * 100);
export function ageBucket(due: string, asOf: string): number {
  if (!due) return 5;
  const days = Math.floor((Date.parse(asOf + 'T00:00:00Z') - Date.parse(due + 'T00:00:00Z')) / 86400000);
  if (!Number.isFinite(days)) return 5;
  return days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4;
}
export function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function buildReport(def: ReportDefinition, records: ReportRecord[], from: string, to: string, search = ''): ReportOutput {
  const aging = def.mode === 'aging' || def.mode === 'agingDetail';
  let list = records.filter(r => {
    if (aging) return r.date <= to && (!r.paidDate || r.paidDate > to) && (r.status !== 'Paid' || Boolean(r.paidDate && r.paidDate > to));
    const date = def.paid ? r.paidDate : r.date;
    return Boolean(date) && (!from || date >= from) && date <= to && (!def.paid || r.status === 'Paid');
  });
  const q = search.trim().toLowerCase();
  if (q) list = list.filter(r => [r.number, r.party, r.status, ...r.tags, ...r.items.map(i => i.name)].some(v => v.toLowerCase().includes(q)));
  const total = list.reduce((s, r) => s + sen(r.amount), 0) / 100;
  if (aging) {
    const cols = ['Name', ...(def.mode === 'agingDetail' ? ['Number', 'Due Date'] : []), 'Current', '1–30 days', '31–60 days', '61–90 days', '90+ days', 'No Due Date', 'Total'];
    const groups = new Map<string, number[]>();
    if (def.mode === 'agingDetail') return { columns: cols, moneyColumns: [3,4,5,6,7,8,9], total, totalLabel: 'Outstanding', rows: list.map(r => { const amounts = [0,0,0,0,0,0]; amounts[ageBucket(r.due, to)] = r.amount; return { cells: [r.party, r.number, r.due || '—', ...amounts, r.amount], path: r.path }; }) };
    for (const r of list) { const values = groups.get(r.party) || [0,0,0,0,0,0]; values[ageBucket(r.due, to)] += sen(r.amount); groups.set(r.party, values); }
    return { columns: cols, moneyColumns: [1,2,3,4,5,6,7], total, totalLabel: 'Outstanding', rows: [...groups].map(([party, values]) => ({ cells: [party, ...values.map(v => v / 100), values.reduce((s,v) => s+v,0)/100] })) };
  }
  if (def.mode === 'party') {
    const groups = new Map<string, { count: number; amount: number }>();
    for (const r of list) for (const party of (def.detail ? r.tags.length ? r.tags : ['Untagged'] : [r.party])) {
      const v = groups.get(party) || { count: 0, amount: 0 }; v.count++; v.amount += sen(r.amount); groups.set(party, v);
    }
    return { columns: [def.detail ? 'Tag' : 'Name', 'Documents', 'Amount'], moneyColumns: [2], total, totalLabel: 'Total', rows: [...groups].sort(([a],[b]) => a.localeCompare(b)).map(([party,v]) => ({ cells: [party, v.count, v.amount/100] })) };
  }
  if (def.mode === 'items') {
    const rows: ReportRow[] = [];
    const groups = new Map<string, { name: string; uom: string; qty: number; amount: number }>();
    let lineTotal = 0;
    for (const r of list) for (const i of r.items) {
      lineTotal += sen(i.amount);
      if (def.detail) rows.push({ cells: [r.date, r.number, r.party, i.name, i.uom, i.qty, i.amount], path: r.path });
      else { const key = JSON.stringify([i.name, i.uom]); const v = groups.get(key) || { name: i.name, uom: i.uom, qty: 0, amount: 0 }; v.qty += i.qty; v.amount += sen(i.amount); groups.set(key,v); }
    }
    return { columns: def.detail ? ['Date','Number','Name','Item','Unit','Quantity','Line Amount'] : ['Item','Unit','Quantity','Line Amount'], moneyColumns: [def.detail ? 6 : 3], total: lineTotal/100, totalLabel: 'Line Amount', rows: def.detail ? rows : [...groups.values()].map(v => ({ cells: [v.name,v.uom,Math.round(v.qty*10000)/10000,v.amount/100] })) };
  }
  if (def.mode === 'cashflow') {
    const groups = new Map<string, { incoming: number; outgoing: number }>();
    for (const r of list) { if (r.kind === 'transfer') continue; const v = groups.get(r.party) || { incoming: 0, outgoing: 0 }; v[r.kind === 'money_in' ? 'incoming' : 'outgoing'] += sen(r.amount); groups.set(r.party,v); }
    return { columns: ['Account','Inflow','Outflow','Net'], moneyColumns: [1,2,3], total: [...groups.values()].reduce((s,v)=>s+v.incoming-v.outgoing,0)/100, totalLabel: 'Net', rows: [...groups].map(([name,v])=>({ cells: [name,v.incoming/100,v.outgoing/100,(v.incoming-v.outgoing)/100] })) };
  }
  return { columns: ['Date','Number','Name','Status','Amount'], moneyColumns: [4], total, totalLabel: 'Total', rows: list.sort((a,b)=>a.date.localeCompare(b.date)).map(r=>({ cells: [def.paid ? r.paidDate || '—' : r.date,r.number,r.to ? `${r.party} → ${r.to}` : r.party,r.status,r.amount], path:r.path })) };
}
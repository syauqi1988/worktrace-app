import { supabase } from '@/integrations/supabase/client';
import { loadBank } from '@/pages/bank/api';
import type { ReportDefinition } from './catalog';
import type { ReportRecord, ReportItem } from './engine';
import { PURCHASE_CONFIG, type PurchaseType } from '@/pages/purchases/shared';
type Raw = Record<string, any>;
async function allRows(table: string, userId: string, fields: string): Promise<Raw[]> {
  const db = supabase as any;
  const rows: Raw[] = [];
  for (let start = 0; ; start += 1000) {
    const result = await db.from(table).select(fields).eq('user_id',userId).order('id').range(start,start+999);
    if (result.error) throw result.error;
    rows.push(...result.data);
    if (result.data.length < 1000) return rows;
  }
}
const date = (value: unknown) => typeof value === 'string' ? value.slice(0,10) : '';
function items(raw: unknown, purchase = false): ReportItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(i=>i && typeof i === 'object').map(i=>({ name: String(purchase ? i.item || '' : i.description || ''), uom: String(i.uom || ''), qty: Number(i.qty) || 0, amount: (Number(i.qty)||0)*(Number(purchase ? i.price : i.unit_price)||0) - (purchase ? Number(i.discount)||0 : 0) }));
}
export async function loadReport(def: ReportDefinition, userId: string): Promise<ReportRecord[]> {
  if (def.source === 'bank') {
    const data = await loadBank(userId);
    const names = new Map(data.accounts.map(a=>[a.id,a.name]));
    return data.transactions.map(t=>({ id:t.id, number:t.reference || t.id.slice(0,8), date:t.transaction_date, due:'', paidDate:'', party:names.get(t.account_id)||'—', status:t.kind === 'transfer' ? 'Transfers' : t.kind === 'money_in' ? 'Money In' : 'Money Out', amount:Number(t.amount), tags:[],items:[],kind:t.kind,to:t.to_account_id ? names.get(t.to_account_id) : undefined, path:`/${t.kind === 'transfer' ? 'transfers' : t.kind === 'money_in' ? 'money-in' : 'money-out'}/${t.id}/edit` }));
  }
  if (def.source === 'purchase') {
    const rows = await allRows('purchase_documents',userId,'id,doc_number,doc_type,doc_date,party,status,total,data');
    return rows.filter(r=>r.doc_type===def.purchaseKind).map(r=>({ id:r.id,number:r.doc_number,date:date(r.doc_date),due:Array.isArray(r.data?.terms) ? [...r.data.terms].map(t=>date(t.dueOn)).filter(Boolean).sort()[0] || '' : '',paidDate:'',party:r.party,status:r.status,amount:Number(r.total)||0,tags:[],items:items(r.data?.lines,true),path:`${PURCHASE_CONFIG[r.doc_type as PurchaseType].path}/${r.id}/edit` }));
  }
  const isQuote = def.source === 'quotation';
  const [docs, jobs, customers] = await Promise.all([
    allRows(isQuote ? 'quotations' : 'invoices',userId,isQuote ? 'id,quote_number,created_at,job_id,status,total,items' : 'id,invoice_number,receipt_number,created_at,issued_date,due_date,paid_date,customer_id,job_id,status,total,items'),
    allRows('jobs',userId,'id,customer_id'),
    allRows('customers',userId,'id,name,tags,tags_v2'),
  ]);
  const jobMap = new Map(jobs.map(j=>[j.id,j.customer_id]));
  const customerMap = new Map(customers.map(c=>[c.id,c]));
  return docs.map(r=>{
    const c = customerMap.get(r.customer_id || jobMap.get(r.job_id));
    return { id:r.id,number:isQuote ? r.quote_number : def.name === 'Official Receipt Summary' ? r.receipt_number || r.invoice_number : r.invoice_number,date:date(r.issued_date || r.created_at),due:date(r.due_date),paidDate:date(r.paid_date),party:c?.name || '—',status:r.status,amount:Number(r.total)||0,tags:Array.isArray(c?.tags_v2) && c.tags_v2.length ? c.tags_v2.map((t:Raw)=>String(t.label || '')).filter(Boolean) : Array.isArray(c?.tags) ? c.tags : [],items:items(r.items),path:`/${isQuote ? 'quotations' : 'invoices'}/${r.id}` };
  });
}
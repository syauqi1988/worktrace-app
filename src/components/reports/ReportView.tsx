import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, RefreshCw, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useL, useTx } from '@/i18n/dual';
import { loadReport } from '@/lib/reports/data';
import { loadLedger } from '@/pages/accounting/api';
import { buildLedgerReport, type LedgerData } from '@/pages/accounting/shared';
import { buildReport, csvCell } from '@/lib/reports/engine';
import type { ReportDefinition } from '@/lib/reports/catalog';

export default function ReportView({ report, onBack }: { report: ReportDefinition; onBack: () => void }) {
  const l = useL(); const tx = useTx(); const { user, profile } = useAuth(); const navigate = useNavigate();
  const today = new Intl.DateTimeFormat('en-CA',{ timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
  const [from,setFrom] = useState(today.slice(0,4)+'-01-01'); const [to,setTo] = useState(today); const [search,setSearch] = useState('');
  const [page,setPage] = useState(0);
  const aging = report.mode === 'aging' || report.mode === 'agingDetail' || ['Balance Sheet','Trial Balance','Chart of Accounts'].includes(report.name);
  const valid = Boolean(to) && (aging || !from || from <= to);
  const query = useQuery({ queryKey:['report',report.source,report.purchaseKind,report.name,user?.id], queryFn:():Promise<unknown>=>report.source==='ledger' ? loadLedger(user?.id || '') : loadReport(report,user?.id || ''), enabled:Boolean(user && report.source && !report.requirement), staleTime:60000 });
  const output = useMemo(()=>report.source==='ledger' ? buildLedgerReport(report.name,(query.data as LedgerData) || { accounts:[],entries:[] },report.name==='Profit & Loss' || report.name==='General Ledger' || report.name.includes('Detail') ? from : '',to,search) : buildReport(report,(query.data as any) || [],from,to,search),[report,query.data,from,to,search]);
  const title = l(report.name,report.ms);
  const money = (v: number) => `RM ${v.toLocaleString(l('en-MY','ms-MY'),{ minimumFractionDigits:2,maximumFractionDigits:2 })}`;
  const cell = (v:string|number,index:number) => typeof v==='number' && output.moneyColumns.includes(index) ? money(v) : typeof v==='string' ? tx(v) : v;
  const pages = Math.max(1,Math.ceil(output.rows.length/50)); const activePage = Math.min(page,pages-1);
  const exportCsv = () => {
    const lines = [output.columns.map(tx).map(csvCell).join(','),...output.rows.map(r=>r.cells.map((c,i)=>csvCell(typeof c==='number' ? c : String(cell(c,i)))).join(','))];
    const blob = new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${report.name.replace(/[^a-z0-9]+/gi,'-')}-${to}.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const tool = (label:string,action:()=>void,icon:React.ReactNode,disabled=false) => <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label={label} onClick={action} disabled={disabled}>{icon}</Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
  const notes: string[] = [];
  if (report.source==='invoice' || report.source==='quotation') notes.push(l('Document totals in MYR. Only invoices marked Paid are treated as fully settled; partial payment allocations are not recorded.','Jumlah dokumen dalam MYR. Hanya invois bertanda Dibayar dianggap selesai sepenuhnya; peruntukan bayaran separa tidak direkodkan.'));
  if (report.name==='Financial Summary') notes.push(l('Invoice register only — not a balance sheet or profit statement.','Daftar invois sahaja — bukan kunci kira-kira atau penyata untung.'));
  if (report.paid) notes.push(l('Only recorded payment dates are included. Paid invoices without a payment date are excluded.','Hanya tarikh bayaran yang direkodkan disertakan. Invois Dibayar tanpa tarikh bayaran dikecualikan.'));
  if (report.name==='Debtor Ledger' || report.name==='Creditor Ledger') notes.push(l('Document register, not a double-entry ledger. Payment allocations and running debtor/creditor balances are not available.','Daftar dokumen, bukan lejar catatan bergu. Peruntukan bayaran dan baki berjalan penghutang/pemiutang tidak tersedia.'));
  if (report.source==='purchase') notes.push(l('Purchase documents are independent records. Credits and payments are not automatically allocated to bills.','Dokumen pembelian ialah rekod berasingan. Kredit dan bayaran tidak diperuntukkan kepada bil secara automatik.'));
  if (aging && report.source==='purchase') notes.push(l('Unpaid bills currently recorded, issued on or before the cutoff. Historic paid dates and partial settlements are unavailable; earliest recorded term date is used for aging.','Bil belum dibayar yang direkodkan kini, dikeluarkan pada atau sebelum tarikh akhir. Tarikh bayaran lampau dan bayaran separa tidak tersedia; tarikh terma terawal digunakan untuk pengumuran.'));
  if (report.mode==='items') notes.push(l('Line amounts before document-level discounts, deductions and tax; products grouped by recorded item name and unit.','Jumlah baris sebelum diskaun, potongan dan cukai peringkat dokumen; produk dikumpulkan mengikut nama item dan unit yang direkodkan.'));
  if (report.name==='Sales By Tag') notes.push(l('A sale can appear under multiple customer tags. The total counts each invoice once.','Jualan boleh muncul di bawah berbilang tag pelanggan. Jumlah mengira setiap invois sekali.'));
  if (report.source==='ledger') notes.push(l('Built from manual journals plus automatic postings from invoices, bills, purchase payments, credit notes and Bank records. If a payment is recorded both on an invoice and in Bank, it is counted twice.','Dibina daripada jurnal manual serta pos automatik daripada invois, bil, bayaran pembelian, nota kredit dan rekod Bank. Jika bayaran direkod pada invois dan juga di Bank, ia dikira dua kali.'));
  if (report.source==='bank') notes.push(l('Manual Bank records only; sales and purchase payments are not added automatically. Internal transfers are excluded from net cash flow.','Rekod Bank manual sahaja; bayaran jualan dan pembelian tidak ditambah secara automatik. Pindahan dalaman dikecualikan daripada aliran tunai bersih.'));
  return <div className="report-print-area p-4 md:p-6 space-y-5">
    <div className="flex items-start gap-3">
      <div className="report-no-print">{tool(tx('Back'),onBack,<ArrowLeft className="h-4 w-4" />)}</div>
      <div className="min-w-0 flex-1"><p className="text-sm text-muted-foreground">{tx('Reports')}</p><h1 className="text-xl md:text-2xl font-bold break-words">{title}</h1><p className="report-print-only text-sm">{profile?.company_name} · {aging ? to : `${from || '—'} — ${to}`}</p></div>
      {report.source && <div className="report-no-print flex gap-2">{tool(l('Download CSV','Muat turun CSV'),exportCsv,<Download className="h-4 w-4" />,query.isLoading || query.isError || !valid || !output.rows.length)}{tool(l('Print / Save PDF','Cetak / Simpan PDF'),()=>window.print(),<Printer className="h-4 w-4" />,query.isLoading || query.isError || !valid)}</div>}
    </div>
    {report.requirement ? <div role="status" className="border-l-4 border-primary bg-muted p-4 space-y-2"><h2 className="font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4" />{l('Required records unavailable','Rekod diperlukan belum tersedia')}</h2><p className="text-sm text-muted-foreground">{l(...report.requirement)}</p></div> : <>
      <div className="report-no-print flex flex-wrap items-end gap-3">
        {!aging && <div className="space-y-1 min-w-0"><Label htmlFor="report-from">{l('From','Dari')}</Label><Input id="report-from" type="date" value={from} onChange={e=>{setFrom(e.target.value);setPage(0);}} /></div>}
        <div className="space-y-1 min-w-0"><Label htmlFor="report-to">{aging ? l('As of','Setakat') : l('To','Hingga')}</Label><Input id="report-to" type="date" value={to} onChange={e=>{setTo(e.target.value);setPage(0);}} /></div>
        <div className="space-y-1 flex-1 min-w-[180px]"><Label htmlFor="report-search">{tx('Search')}</Label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="report-search" className="pl-9" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder={l('Name, number or item','Nama, nombor atau item')} /></div></div>
        {tool(l('Refresh','Muat semula'),()=>{query.refetch();},<RefreshCw className="h-4 w-4" />,query.isFetching)}
      </div>
      {!valid ? <p role="alert" className="text-destructive">{l('Choose a valid date range.','Pilih julat tarikh yang sah.')}</p> : query.isError ? <p role="alert" className="text-destructive">{report.source==='bank' ? l('Unable to load Bank records. Bank storage becomes available after this draft is accepted.','Tidak dapat memuatkan rekod Bank. Simpanan Bank tersedia selepas draf ini diterima.') : l('Unable to load records. Please retry.','Tidak dapat memuatkan rekod. Sila cuba lagi.')}</p> : query.isLoading ? <p role="status" className="py-12 text-muted-foreground">{tx('Loading...')}</p> : <>
        <div className="flex flex-wrap justify-between items-baseline gap-3 border-y border-border py-4"><span className="text-sm text-muted-foreground">{output.rows.length} {l('rows','baris')}</span><p className="text-lg font-semibold">{tx(output.totalLabel)} <span className="ml-3 tabular-nums">{money(output.total)}</span></p></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted">{output.columns.map((c,i)=><th key={c} className={`px-3 py-3 whitespace-nowrap font-medium ${output.moneyColumns.includes(i) ? 'text-right' : 'text-left'}`}>{tx(c)}</th>)}</tr></thead><tbody>{output.rows.slice(activePage*50,activePage*50+50).map((r,index)=><tr key={index} className="report-screen-row border-b border-border">{r.cells.map((c,i)=><td key={i} className={`px-3 py-3 ${typeof c==='number' ? 'text-right tabular-nums' : 'text-left'}`}>{i===1 && r.path ? <Button variant="link" className="h-auto p-0 text-sm" onClick={()=>navigate(r.path || '/reports')}>{cell(c,i)}</Button> : cell(c,i)}</td>)}</tr>)}{output.rows.map((r,index)=><tr key={`print-${index}`} className="report-print-only border-b border-border">{r.cells.map((c,i)=><td key={i} className={`px-3 py-2 ${typeof c==='number' ? 'text-right' : 'text-left'}`}>{cell(c,i)}</td>)}</tr>)}</tbody></table>{!output.rows.length && <p className="py-12 text-center text-muted-foreground">{tx('No records found.')}</p>}</div>
        {pages>1 && <div className="report-no-print flex justify-end items-center gap-3"><Button variant="outline" disabled={!activePage} onClick={()=>setPage(activePage-1)}>{l('Previous','Sebelum')}</Button><span className="text-sm">{activePage+1} / {pages}</span><Button variant="outline" disabled={activePage>=pages-1} onClick={()=>setPage(activePage+1)}>{l('Next','Seterusnya')}</Button></div>}
      </>}
      <div className="space-y-1 border-t border-border pt-3">{notes.map(note=><p key={note} className="text-xs text-muted-foreground">{note}</p>)}</div>
    </>}
  </div>;
}
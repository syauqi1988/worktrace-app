import { useState } from 'react';
import { ChevronDown, FileText, Star, Search, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useL, useTx } from '@/i18n/dual';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { REPORT_GROUPS, ALL_REPORTS, type ReportGroup } from '@/lib/reports/catalog';
import ReportView from '@/components/reports/ReportView';
import '@/styles/reports.css';

const FAV_KEY = 'report_favourites';

export default function ReportsPage() {
  const tx = useTx();
  const l = useL();
  const [params,setParams] = useSearchParams();
  const [search,setSearch] = useState('');
  const [closed, setClosed] = useState<string[]>([]);
  const [favs, setFavs] = useState<string[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); return Array.isArray(saved) ? saved.filter((s: unknown) => typeof s === 'string' && ALL_REPORTS.some(r=>r.name===s)) : []; } catch { return []; }
  });

  const toggleFav = (name: string) => {
    const next = favs.includes(name) ? favs.filter(f => f !== name) : [...favs, name];
    setFavs(next);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch { /* Device storage may be disabled. */ }
  };

  const selected = ALL_REPORTS.find(r=>r.name===params.get('report'));
  if (selected) return <ReportView key={selected.name} report={selected} onBack={()=>setParams({})} />;
  const groups: ReportGroup[] = favs.length ? [{ title: 'Favourites', reports: ALL_REPORTS.filter(r=>favs.includes(r.name)) }, ...REPORT_GROUPS] : REPORT_GROUPS;
  const filtered = groups.map(g=>({...g,reports:g.reports.filter(r=>`${r.name} ${r.ms}`.toLowerCase().includes(search.toLowerCase()))})).filter(g=>g.reports.length);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">{tx('Reports')}</p>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">{tx('All Reports')}</h1>
      </div>

      <div className="relative max-w-lg"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label={l('Search reports','Cari laporan')} placeholder={l('Search reports','Cari laporan')} value={search} onChange={e=>setSearch(e.target.value)} className="pl-9" /></div>
      {!filtered.length && <p className="text-muted-foreground py-8">{tx('No records found.')}</p>}
      {filtered.map(g => {
        const isOpen = !closed.includes(g.title);
        return (
          <section key={g.title} className="border-b border-border pb-4">
            <Button variant="ghost" aria-expanded={isOpen}
              onClick={() => setClosed(p => (isOpen ? [...p, g.title] : p.filter(x => x !== g.title)))}
              className="w-full justify-start gap-2 px-0 py-3 text-sm font-medium text-foreground"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
              {tx(g.title)} ({g.reports.length})
            </Button>
            {isOpen && (
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {g.reports.map(report => (
                  <div
                    key={report.name}
                    className="flex items-center border border-border rounded-lg min-h-[64px] hover:border-primary transition-colors"
                  >
                    <Button variant="ghost" className="flex-1 min-w-0 h-auto min-h-[64px] justify-start gap-2 px-3 py-3 whitespace-normal text-left" onClick={()=>setParams({report:report.name})}>
                      <FileText className="h-5 w-5 text-primary shrink-0" /><span className="text-sm leading-snug break-words">{l(report.name,report.ms)}</span>
                    </Button>
                    {report.requirement && <Tooltip><TooltipTrigger asChild><span tabIndex={0} aria-label={l('Required records unavailable','Rekod diperlukan belum tersedia')}><AlertCircle className="h-3.5 w-3.5 text-muted-foreground" /></span></TooltipTrigger><TooltipContent>{l('Required records unavailable','Rekod diperlukan belum tersedia')}</TooltipContent></Tooltip>}
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={`${l('Favourite','Kegemaran')}: ${l(report.name,report.ms)}`} onClick={()=>toggleFav(report.name)} className="shrink-0 text-muted-foreground"><Star className={`h-4 w-4 ${favs.includes(report.name) ? 'fill-primary text-primary' : ''}`} /></Button></TooltipTrigger><TooltipContent>{l('Favourite','Kegemaran')}</TooltipContent></Tooltip>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

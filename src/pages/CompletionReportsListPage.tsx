import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, Search, X, User, Briefcase, CalendarDays } from 'lucide-react';
import { tx } from '@/lib/tx';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Menunggu Pengesahan',
  accepted: 'Diterima',
  rejected: 'Ditolak',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#F1F5F9] text-[#64748B]',
  submitted: 'bg-[#DBEAFE] text-[#1D4ED8]',
  accepted: 'bg-[#DCFCE7] text-[#15803D]',
  rejected: 'bg-[#FEE2E2] text-[#B91C1C]',
};

const TABS = ['Semua', 'draft', 'submitted', 'accepted', 'rejected'];

interface Row {
  id: string;
  report_number: string;
  status: string;
  completion_date: string | null;
  created_at: string;
  job_id: string;
  jobs: { job_number: string; title: string; customers: { name: string } | null } | null;
}

export default function CompletionReportsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('Semua');

  useEffect(() => {
    if (!user) return;
    supabase.from('completion_reports')
      .select('id, report_number, status, completion_date, created_at, job_id, jobs(job_number, title, customers(name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRows((data as unknown as Row[]) || []);
        setLoading(false);
      });
  }, [user]);

  const filtered = useMemo(() => {
    let r = rows;
    if (tab !== 'Semua') r = r.filter(x => (x.status || 'draft') === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x =>
        x.report_number.toLowerCase().includes(q) ||
        (x.jobs?.title || '').toLowerCase().includes(q) ||
        (x.jobs?.customers?.name || '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [rows, tab, search]);

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold text-foreground">{tx('Laporan Siap Kerja')}</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={tx("Cari nombor, tajuk, atau pelanggan...")} className="pl-9 pr-9 rounded-lg" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium shrink-0 ${
              tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
            }`}>
            {t === 'Semua' ? 'Semua' : STATUS_LABELS[t] || t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <Skeleton className="h-4 w-28 mb-2" /><Skeleton className="h-3 w-40" />
          </div>
        ))}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border p-8 flex flex-col items-center text-center bg-card">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">{rows.length === 0 ? tx('Belum ada laporan siap kerja') : tx('Tiada laporan dijumpai')}</p>
          <p className="text-xs text-muted-foreground mt-2">{tx('Laporan siap kerja dibuat dari halaman kerja selepas sebut harga diterima.')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const status = r.status || 'draft';
            return (
              <button key={r.id} onClick={() => navigate(`/jobs/${r.job_id}/completion-report`)}
                className="w-full bg-card rounded-xl border border-border p-4 hover:shadow-md text-left">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-primary">{r.report_number}</span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>
                    {STATUS_LABELS[status] || status}
                  </span>
                </div>
                <p className="text-sm text-foreground mt-1 truncate">{r.jobs?.title || '-'}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                    <User className="h-3.5 w-3.5" /><span>{r.jobs?.customers?.name || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" /><span>{r.jobs?.job_number || '-'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground mt-2">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="text-[13px]">Tarikh siap: {fmtDate(r.completion_date)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

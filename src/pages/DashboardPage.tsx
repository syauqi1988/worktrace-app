import { useTx } from '@/i18n/dual';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusSquare, MinusSquare } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ComposedChart, Bar, PieChart, Pie, Cell, BarChart, Legend,
} from 'recharts';

const C = (v: string) => `hsl(var(--${v}))`;
const AGING_COLORS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'].map(C);
const AGING_LABELS = ['Upcoming', '1-30 Days', '31-60 Days', '61-90 Days', '91+ Days'];
const PIE_COLORS = ['primary', 'chart-income', 'destructive', 'chart-4', 'chart-expense', 'chart-2', 'chart-1'].map(C);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const JOB_STATUSES = ['Lead', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'];
const REPORT_STATUSES = ['draft', 'submitted', 'accepted', 'rejected'];

const rm = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const k = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : `${Math.round(n)}`);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB');
const monthKey = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;

type Inv = {
  id: string; invoice_number: string; status: string; total: number;
  due_date: string | null; paid_date: string | null; created_at: string;
  jobs: { category: string; customers: { name: string } | null } | null;
};
type Job = { id: string; job_number: string; title: string; status: string; category: string; created_at: string; customers: { name: string } | null };
type Rep = { id: string; report_number: string; status: string | null; created_at: string; job_id: string; jobs: { title: string } | null };

function Card({ title, right, children, className = '' }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  const tx = useTx();
  return (
    <div className={`bg-card border border-border rounded-xl p-4 md:p-6 min-w-0 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <h2 className="text-lg md:text-xl font-medium text-primary">{tx(title)}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Net({ value, label }: { value: number; label: string }) {
  return (
    <p className="text-sm md:text-base font-semibold text-foreground mb-3">
      NET {rm(value)} <span className="font-normal text-muted-foreground uppercase">{label}</span>
    </p>
  );
}

type Period = { preset: string; from: string; to: string };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const PRESETS: Record<string, string> = {
  all: 'All Time', this_year: 'This Year', ytd: 'Year to Date', last_year: 'Last Year', this_month: 'This Month',
  '3': 'Last 3 Months', '6': 'Last 6 Months', '9': 'Last 9 Months', '12': 'Last 12 Months',
  next3: 'Next 3 Months', next6: 'Next 6 Months', next12: 'Next 12 Months', custom: 'Custom',
};
const PAST = ['this_month', '3', '6', '9', '12', 'this_year', 'ytd', 'last_year', 'custom'];
function resolve(p: Period): { from: Date; to: Date } {
  const t = new Date(new Date().toDateString()), y = t.getFullYear(), m = t.getMonth();
  switch (p.preset) {
    case 'all': return { from: new Date(2000, 0, 1), to: new Date(2100, 0, 1) };
    case 'this_year': return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) };
    case 'ytd': return { from: new Date(y, 0, 1), to: t };
    case 'last_year': return { from: new Date(y - 1, 0, 1), to: new Date(y - 1, 11, 31) };
    case 'this_month': return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0) };
    case 'next3': case 'next6': case 'next12': { const n = Number(p.preset.slice(4)); return { from: new Date(y, m, 1), to: new Date(y, m + n, 0) }; }
    case 'custom': {
      const from = p.from ? new Date(p.from) : new Date(y, m, 1), to = p.to ? new Date(p.to) : t;
      return from <= to ? { from, to } : { from: to, to: from };
    }
    default: { const n = Number(p.preset); return { from: new Date(y, m - n + 1, 1), to: new Date(y, m + 1, 0) }; }
  }
}
const inRange = (d: Date, r: { from: Date; to: Date }) => d >= r.from && d <= new Date(r.to.getFullYear(), r.to.getMonth(), r.to.getDate(), 23, 59, 59);
const monthsIn = (r: { from: Date; to: Date }) => {
  const out: Date[] = []; const d = new Date(r.from.getFullYear(), r.from.getMonth(), 1);
  while (d <= r.to && out.length < 120) { out.push(new Date(d)); d.setMonth(d.getMonth() + 1); }
  return out;
};
const periodLabel = (p: Period) => p.preset === 'custom' ? 'Custom' : PRESETS[p.preset];

function PeriodFilter({ value, onChange, presets }: { value: Period; onChange: (p: Period) => void; presets: string[] }) {
  const set = (preset: string) => {
    if (preset === 'custom' && !value.from) { const r = resolve(value); onChange({ preset, from: iso(r.from), to: iso(r.to > new Date(2099, 0) ? new Date() : r.to) }); }
    else onChange({ ...value, preset });
  };
  const tx = useTx();
  const cls = 'h-9 rounded-lg border border-input bg-background px-2 text-sm';
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select value={value.preset} onChange={e => set(e.target.value)} className={cls}>
        {presets.map(v => <option key={v} value={v}>{tx(PRESETS[v])}</option>)}
      </select>
      {value.preset === 'custom' && (
        <div className="flex items-center gap-1 w-full sm:w-auto">
          <input type="date" value={value.from} onChange={e => onChange({ ...value, from: e.target.value })} className={`${cls} flex-1 min-w-0`} />
          <span className="text-muted-foreground text-sm">–</span>
          <input type="date" value={value.to} onChange={e => onChange({ ...value, to: e.target.value })} className={`${cls} flex-1 min-w-0`} />
        </div>
      )}
    </div>
  );
}
const P = (preset: string): Period => ({ preset, from: '', to: '' });

function Empty({ text }: { text: string }) {
  const tx = useTx();
  return <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">{tx(text)}</div>;
}

function AgingBar({ buckets }: { buckets: number[] }) {
  const total = buckets.reduce((a, b) => a + b, 0);
  return (
    <div>
      <div className="h-10 md:h-14 w-full flex rounded overflow-hidden bg-muted">
        {total > 0 && buckets.map((b, i) => b > 0 && (
          <div key={i} style={{ width: `${(b / total) * 100}%`, background: AGING_COLORS[i] }} title={`${AGING_LABELS[i]}: ${rm(b)}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs md:text-sm">
        {AGING_LABELS.map((l, i) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ background: AGING_COLORS[i] }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const tx = useTx();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Inv[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reports, setReports] = useState<Rep[]>([]);
  const [incomeP, setIncomeP] = useState<Period>(P('this_year'));
  const [plP, setPlP] = useState<Period>(P('9'));
  const [trendP, setTrendP] = useState<Period>(P('12'));
  const [forecastP, setForecastP] = useState<Period>(P('next12'));
  const [breakP, setBreakP] = useState<Period>(P('12'));
  const [expenseP, setExpenseP] = useState<Period>(P('12'));
  const [jobsP, setJobsP] = useState<Period>(P('all'));
  const [repP, setRepP] = useState<Period>(P('all'));

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [i, j, r] = await Promise.all([
        supabase.from('invoices').select('id, invoice_number, status, total, due_date, paid_date, created_at, jobs(category, customers(name))').order('created_at', { ascending: false }),
        supabase.from('jobs').select('id, job_number, title, status, category, created_at, customers(name)').order('created_at', { ascending: false }),
        supabase.from('completion_reports').select('id, report_number, status, created_at, job_id, jobs(title)').order('created_at', { ascending: false }),
      ]);
      setInvoices((i.data as unknown as Inv[]) || []);
      setJobs((j.data as unknown as Job[]) || []);
      setReports((r.data as unknown as Rep[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const today = new Date(new Date().toDateString());
  const unpaid = useMemo(() => invoices.filter(i => i.status !== 'Paid'), [invoices]);
  const paid = useMemo(() => invoices.filter(i => i.status === 'Paid'), [invoices]);
  const paidDate = (i: Inv) => new Date(i.paid_date || i.created_at);

  const { comingDue, overdue, aging } = useMemo(() => {
    const b = [0, 0, 0, 0, 0];
    let cd = 0, od = 0;
    unpaid.forEach(i => {
      const t = Number(i.total || 0);
      const days = i.due_date ? Math.floor((today.getTime() - new Date(i.due_date).getTime()) / 86400000) : -1;
      if (days <= 0) { cd += t; b[0] += t; }
      else { od += t; b[days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4] += t; }
    });
    return { comingDue: cd, overdue: od, aging: b };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unpaid]);

  const sumMonth = (list: Inv[], key: string) => list.filter(i => monthKey(paidDate(i)) === key).reduce((t, i) => t + Number(i.total || 0), 0);
  const incomeData = useMemo(() => monthsIn(resolve(incomeP)).map(d => {
    const ly = new Date(d.getFullYear() - 1, d.getMonth(), 1);
    return { m: monthKey(d), current: sumMonth(paid, monthKey(d)), last: sumMonth(paid, monthKey(ly)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [paid, incomeP]);
  const incomeNet = incomeData.reduce((s, d) => s + d.current, 0);

  const plData = useMemo(() => monthsIn(resolve(plP)).map(d => {
    const income = sumMonth(paid, monthKey(d)); const expense = 0;
    return { m: monthKey(d), income, expense, net: income - expense };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [paid, plP]);
  const plNet = plData.reduce((s, d) => s + d.net, 0);

  const trendData = useMemo(() => {
    const r = resolve(trendP);
    let bal = paid.filter(i => paidDate(i) < r.from).reduce((t, i) => t + Number(i.total || 0), 0);
    return monthsIn(r).map(d => {
      const inflow = sumMonth(paid, monthKey(d)); const outflow = 0;
      bal += inflow - outflow;
      return { m: monthKey(d), inflow, outflow: -outflow, balance: bal };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, trendP]);

  const forecastData = useMemo(() => {
    const r = resolve(forecastP);
    const ms = monthsIn(r).map(monthKey);
    let bal = paid.filter(i => paidDate(i) < r.from).reduce((t, i) => t + Number(i.total || 0), 0);
    return ms.map((key, idx) => {
      const inflow = unpaid.filter(i => {
        const d = i.due_date ? new Date(i.due_date) : today;
        return idx === 0 ? (d <= today || monthKey(d) === key) : monthKey(d) === key;
      }).reduce((s, i) => s + Number(i.total || 0), 0);
      bal += inflow;
      return { m: key, inflow, balance: bal };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unpaid, paid, forecastP]);

  const incomeBreakdown = useMemo(() => {
    const rg = resolve(breakP);
    const map: Record<string, number> = {};
    paid.filter(i => inRange(paidDate(i), rg)).forEach(i => {
      const c = i.jobs?.category || 'Other';
      map[c] = (map[c] || 0) + Number(i.total || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, breakP]);
  const breakdownNet = incomeBreakdown.reduce((s, d) => s + d.value, 0);

  const fJobs = useMemo(() => { const rg = resolve(jobsP); return jobs.filter(j => inRange(new Date(j.created_at), rg)); }, [jobs, jobsP]);
  const fReps = useMemo(() => { const rg = resolve(repP); return reports.filter(x => inRange(new Date(x.created_at), rg)); }, [reports, repP]);
  const jobStatusData = JOB_STATUSES.map(s => ({ name: s, value: fJobs.filter(j => j.status === s).length }));
  const reportStatusData = REPORT_STATUSES.map(s => ({
    name: s[0].toUpperCase() + s.slice(1), value: fReps.filter(r => (r.status || 'draft') === s).length,
  }));

  const kpis = [
    { label: 'INVOICES', value: comingDue, sub: 'Coming Due', icon: PlusSquare, shade: 'bg-chart-2' },
    { label: 'INVOICES', value: overdue, sub: 'Overdue', icon: PlusSquare, shade: 'bg-chart-3' },
    { label: 'BILLS', value: 0, sub: 'Coming Due', icon: MinusSquare, shade: 'bg-chart-4' },
    { label: 'BILLS', value: 0, sub: 'Overdue', icon: MinusSquare, shade: 'bg-chart-5' },
  ];

  const axis = { fontSize: 11, fill: C('muted-foreground') };

  if (loading) {
    return (
      <div className="p-4 md:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className={`h-24 ${i > 3 ? 'col-span-2 h-64' : ''}`} />)}
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 bg-muted/30 min-h-full">
      <h1 className="sr-only">{tx('Dashboard')}</h1>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map((t, idx) => (
          <div key={idx} className={`${t.shade} text-primary-foreground rounded-lg flex overflow-hidden`}>
            <div className="w-16 md:w-20 flex items-center justify-center bg-foreground/10">
              <t.icon className="h-7 w-7" />
            </div>
            <div className="p-3 md:p-4">
              <p className="text-xs font-semibold tracking-wide">{tx(t.label)}</p>
              <p className="text-xl md:text-2xl font-semibold">{rm(t.value)}</p>
              <p className="text-sm md:text-base">{tx(t.sub)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Jobs */}
        <Card title="Jobs" right={<div className="flex items-center gap-2"><PeriodFilter value={jobsP} onChange={setJobsP} presets={['all', ...PAST]} /><button onClick={() => navigate('/jobs')} className="text-sm text-primary whitespace-nowrap">{tx('View all')}</button></div>}>
          <p className="text-sm font-semibold mb-3">TOTAL {fJobs.length} <span className="font-normal text-muted-foreground">{tx('JOBS')}</span></p>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={jobStatusData} margin={{ left: -20, right: 8 }}>
                <CartesianGrid stroke={C('border')} vertical={false} />
                <XAxis dataKey="name" tick={axis} interval={0} />
                <YAxis tick={axis} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name={tx('Jobs')} radius={[4, 4, 0, 0]}>
                  {jobStatusData.map((_, idx) => <Cell key={idx} fill={AGING_COLORS[idx]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="divide-y divide-border mt-3">
            {fJobs.slice(0, 5).map(j => (
              <button key={j.id} onClick={() => navigate(`/jobs/${j.id}`)}
                className="w-full flex items-center justify-between gap-3 py-2.5 text-sm text-left hover:bg-muted/50">
                <span className="min-w-0">
                  <span className="text-primary font-medium">{j.job_number}</span>
                  <span className="block text-xs text-muted-foreground truncate">{j.title} · {j.customers?.name || '—'}</span>
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground shrink-0">{j.status}</span>
              </button>
            ))}
            {fJobs.length === 0 && <Empty text="No jobs yet" />}
          </div>
        </Card>

        <Card title="Outstanding Invoices"><AgingBar buckets={aging} /></Card>
        <Card title="Outstanding Bills"><AgingBar buckets={[0, 0, 0, 0, 0]} /></Card>

        <Card title="Income" right={<PeriodFilter value={incomeP} onChange={setIncomeP} presets={PAST} />}>
          <Net value={incomeNet} label={periodLabel(incomeP)} />
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={incomeData} margin={{ left: -10, right: 8 }}>
                <CartesianGrid stroke={C('border')} vertical={false} />
                <XAxis dataKey="m" tick={axis} />
                <YAxis tick={axis} tickFormatter={k} />
                <Tooltip formatter={(v: number) => rm(v)} />
                <Line type="linear" dataKey="current" name={tx('This year')} stroke={C('chart-income')} strokeWidth={2} dot={false} />
                <Line type="linear" dataKey="last" name={tx('Last year')} stroke={C('chart-income')} strokeDasharray="6 4" strokeOpacity={0.6} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Profit & Loss" right={<PeriodFilter value={plP} onChange={setPlP} presets={PAST} />}>
          <Net value={plNet} label={periodLabel(plP)} />
          <div className="h-64">
            <ResponsiveContainer>
              <ComposedChart data={plData} margin={{ left: -10, right: 8 }}>
                <CartesianGrid stroke={C('border')} vertical={false} />
                <XAxis dataKey="m" tick={axis} />
                <YAxis tick={axis} tickFormatter={k} />
                <Tooltip formatter={(v: number) => rm(v)} />
                <Bar dataKey="net" name={tx('Net')} fill={C('primary')} />
                <Line dataKey="income" name={tx('Income')} stroke={C('chart-income')} strokeWidth={2} />
                <Line dataKey="expense" name={tx('Expense')} stroke={C('destructive')} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Cashflow Trend" right={<PeriodFilter value={trendP} onChange={setTrendP} presets={PAST} />}>
          <div className="h-64">
            <ResponsiveContainer>
              <ComposedChart data={trendData} stackOffset="sign" margin={{ left: -10, right: 0 }}>
                <CartesianGrid stroke={C('border')} vertical={false} />
                <XAxis dataKey="m" tick={axis} />
                <YAxis yAxisId="l" tick={axis} tickFormatter={k} />
                <YAxis yAxisId="r" orientation="right" tick={axis} tickFormatter={k} />
                <Tooltip formatter={(v: number) => rm(v)} />
                <Bar yAxisId="l" dataKey="inflow" name={tx('Inflow')} stackId="a" fill={C('chart-income')} />
                <Bar yAxisId="l" dataKey="outflow" name={tx('Outflow')} stackId="a" fill={C('chart-expense')} />
                <Line yAxisId="r" dataKey="balance" name={tx('Ending balance')} stroke={C('primary')} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Cashflow Forecast" right={<PeriodFilter value={forecastP} onChange={setForecastP} presets={['next3', 'next6', 'next12', 'custom']} />}>
          <div className="h-64">
            <ResponsiveContainer>
              <ComposedChart data={forecastData} margin={{ left: -10, right: 0 }}>
                <CartesianGrid stroke={C('border')} vertical={false} />
                <XAxis dataKey="m" tick={axis} />
                <YAxis yAxisId="l" tick={axis} tickFormatter={k} />
                <YAxis yAxisId="r" orientation="right" tick={axis} tickFormatter={k} />
                <Tooltip formatter={(v: number) => rm(v)} />
                <Bar yAxisId="l" dataKey="inflow" name={tx('Expected inflow')} fill={C('chart-income')} fillOpacity={0.6} />
                <Line yAxisId="r" dataKey="balance" name={tx('Projected balance')} stroke={C('primary')} strokeDasharray="6 4" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Bank Accounts">
          <Empty text="No bank accounts yet" />
        </Card>

        <Card title="Recent Sales">
          {invoices.length === 0 ? <Empty text="No invoices yet" /> : (
            <div className="divide-y divide-border">
              {invoices.slice(0, 5).map(i => (
                <button key={i.id} onClick={() => navigate(`/invoices/${i.id}`)}
                  className="w-full grid grid-cols-[1fr_auto] sm:grid-cols-[90px_130px_1fr_auto] gap-x-3 gap-y-0.5 py-3 text-sm text-left hover:bg-muted/50">
                  <span className="hidden sm:block text-muted-foreground">{fmtDate(i.created_at)}</span>
                  <span className="text-primary font-medium truncate">{i.invoice_number}</span>
                  <span className="hidden sm:block truncate">{i.jobs?.customers?.name || '—'}</span>
                  <span className="text-right whitespace-nowrap">{rm(Number(i.total || 0))}</span>
                  <span className="sm:hidden text-xs text-muted-foreground truncate col-span-2">{fmtDate(i.created_at)} · {i.jobs?.customers?.name || '—'}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card title="Income Breakdown" right={<PeriodFilter value={breakP} onChange={setBreakP} presets={PAST} />}>
          <Net value={breakdownNet} label={periodLabel(breakP)} />
          {incomeBreakdown.length === 0 ? <Empty text="No paid invoices in this period" /> : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={incomeBreakdown} dataKey="value" nameKey="name" outerRadius="80%" stroke={C('card')}>
                    {incomeBreakdown.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => rm(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Expense Breakdown" right={<PeriodFilter value={expenseP} onChange={setExpenseP} presets={PAST} />}>
          <Net value={0} label={periodLabel(expenseP)} />
          <Empty text="No expenses recorded yet" />
        </Card>

        {/* Completion reports */}
        <Card title="Completion Reports" right={<div className="flex items-center gap-2"><PeriodFilter value={repP} onChange={setRepP} presets={['all', ...PAST]} /><button onClick={() => navigate('/completion-reports')} className="text-sm text-primary whitespace-nowrap">{tx('View all')}</button></div>}>
          <p className="text-sm font-semibold mb-3">TOTAL {fReps.length} <span className="font-normal text-muted-foreground">{tx('REPORTS')}</span></p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {reportStatusData.map((s, idx) => (
              <div key={s.name} className="rounded-lg border border-border p-3">
                <span className="h-2 w-6 rounded-full block mb-2" style={{ background: AGING_COLORS[idx + 1] }} />
                <p className="text-xs text-muted-foreground">{s.name}</p>
                <p className="text-xl font-semibold">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="divide-y divide-border mt-3">
            {fReps.slice(0, 5).map(r => (
              <button key={r.id} onClick={() => navigate(`/jobs/${r.job_id}/completion-report`)}
                className="w-full flex items-center justify-between gap-3 py-2.5 text-sm text-left hover:bg-muted/50">
                <span className="min-w-0">
                  <span className="text-primary font-medium">{r.report_number}</span>
                  <span className="block text-xs text-muted-foreground truncate">{fmtDate(r.created_at)} · {r.jobs?.title || '—'}</span>
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize shrink-0">{r.status || 'draft'}</span>
              </button>
            ))}
            {fReps.length === 0 && <Empty text="No completion reports yet" />}
          </div>
        </Card>
      </div>
    </div>
  );
}

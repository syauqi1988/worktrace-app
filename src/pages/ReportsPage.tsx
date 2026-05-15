import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Loader2, FileBarChart } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import MonthlySummaryReportPDF, { MonthlySummaryData } from '@/components/pdf/MonthlySummaryReportPDF';
import { toast } from 'sonner';
import { getDateLocale } from '@/i18n';
import { embedPdfCompanyLogo } from '@/utils/imageToBase64';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

type Preset = 'week' | 'month' | 'lastMonth' | '3m' | 'year' | 'custom';

const MONTH_NAMES_MS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
const MONTH_SHORT_MS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_COLORS_HEX: Record<string, string> = {
  Lead: '#94A3B8',
  Scheduled: '#3B82F6',
  'In Progress': '#F59E0B',
  Completed: '#22C55E',
  Cancelled: '#EF4444',
};

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function toInputDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getRangeForPreset(p: Preset): { start: Date; end: Date } {
  const now = new Date();
  const today = startOfDay(now);
  switch (p) {
    case 'week': {
      const day = today.getDay() || 7;
      const start = new Date(today);
      start.setDate(today.getDate() - (day - 1));
      return { start, end: endOfDay(now) };
    }
    case 'month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }
    case '3m': {
      const start = new Date(today);
      start.setMonth(today.getMonth() - 3);
      return { start, end: endOfDay(now) };
    }
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now) };
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
  }
}

interface ReportData {
  // Revenue
  totalRevenue: number;
  paidCount: number;
  outstandingAmount: number;
  outstandingCount: number;
  avgInvoice: number;
  revenueSeries: { label: string; amount: number }[];

  // Jobs
  jobsTotal: number;
  jobsCompleted: number;
  jobsInProgress: number;
  completionRate: number;
  jobsByStatus: { name: string; value: number }[];
  jobsByCategory: { category: string; count: number }[];

  // Customers
  newCustomers: number;
  activeCustomers: number;
  totalCustomers: number;
  topCustomers: { name: string; jobs: number; revenue: number; lastDeal: string | null }[];

  // Documents
  quotesSent: number;
  quotesAccepted: number;
  workOrdersAccepted: number;
  reportsSent: number;
  receiptsGenerated: number;
}

export default function ReportsPage() {
  const { user, profile } = useAuth();
  const { t, i18n } = useTranslation();
  const isEN = i18n.language === 'en';
  const MONTH_NAMES = isEN ? MONTH_NAMES_EN : MONTH_NAMES_MS;
  const MONTH_SHORT = isEN ? MONTH_SHORT_EN : MONTH_SHORT_MS;
  const [preset, setPreset] = useState<Preset>('month');
  const initial = getRangeForPreset('month');
  const [start, setStart] = useState<Date>(initial.start);
  const [end, setEnd] = useState<Date>(initial.end);
  const [customStart, setCustomStart] = useState(toInputDate(initial.start));
  const [customEnd, setCustomEnd] = useState(toInputDate(initial.end));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const startISO = useMemo(() => start.toISOString(), [start]);
  const endISO = useMemo(() => end.toISOString(), [end]);
  const startDate = useMemo(() => toInputDate(start), [start]);
  const endDate = useMemo(() => toInputDate(end), [end]);

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p !== 'custom') {
      const r = getRangeForPreset(p);
      setStart(r.start); setEnd(r.end);
      setCustomStart(toInputDate(r.start));
      setCustomEnd(toInputDate(r.end));
    }
  }

  function applyCustom() {
    const s = startOfDay(new Date(customStart));
    const e = endOfDay(new Date(customEnd));
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) {
      toast.error(t('reports.invalidRange'));
      return;
    }
    setPreset('custom');
    setStart(s); setEnd(e);
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      const [
        invoicesRes, jobsRes, custAllRes, custNewRes,
        quotesRes, woRes, reportsRes, receiptsRes,
      ] = await Promise.all([
        supabase.from('invoices')
          .select('id, status, total, paid_date, customer_id, customers:customer_id(name), created_at, receipt_number')
          .gte('created_at', startISO).lte('created_at', endISO),
        supabase.from('jobs')
          .select('id, status, category, customer_id, created_at, completed_date')
          .gte('created_at', startISO).lte('created_at', endISO),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true })
          .gte('created_at', startISO).lte('created_at', endISO),
        supabase.from('quotations').select('id, status, created_at')
          .gte('created_at', startISO).lte('created_at', endISO),
        supabase.from('work_orders').select('id, status, created_at')
          .gte('created_at', startISO).lte('created_at', endISO),
        supabase.from('completion_reports').select('id, status, created_at')
          .gte('created_at', startISO).lte('created_at', endISO),
        supabase.from('invoices').select('id', { count: 'exact', head: true })
          .not('receipt_number', 'is', null)
          .gte('created_at', startISO).lte('created_at', endISO),
      ]);

      if (cancelled) return;
      const invoices = (invoicesRes.data || []) as any[];
      const jobs = (jobsRes.data || []) as any[];
      const quotes = (quotesRes.data || []) as any[];
      const wos = (woRes.data || []) as any[];
      const reports = (reportsRes.data || []) as any[];

      // Revenue
      const paid = invoices.filter(i => i.status === 'Paid' && i.paid_date
        && i.paid_date >= startDate && i.paid_date <= endDate);
      const totalRevenue = paid.reduce((s, i) => s + Number(i.total || 0), 0);
      const outstanding = invoices.filter(i => i.status !== 'Paid' && i.status !== 'Draft' && i.status !== 'Cancelled');
      const outstandingAmount = outstanding.reduce((s, i) => s + Number(i.total || 0), 0);
      const avgInvoice = paid.length > 0 ? totalRevenue / paid.length : 0;

      // Revenue series
      const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      const series = buildRevenueSeries(paid, start, end, days);

      // Jobs
      const completed = jobs.filter(j => j.status === 'Completed').length;
      const inProgress = jobs.filter(j => j.status === 'In Progress').length;
      const completionRate = jobs.length > 0 ? Math.round((completed / jobs.length) * 100) : 0;

      const statusCounts: Record<string, number> = {};
      jobs.forEach(j => { statusCounts[j.status] = (statusCounts[j.status] || 0) + 1; });
      const jobsByStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

      const catCounts: Record<string, number> = {};
      jobs.forEach(j => { catCounts[j.category] = (catCounts[j.category] || 0) + 1; });
      const jobsByCategory = Object.entries(catCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Customers
      const activeCustomerIds = new Set(jobs.map(j => j.customer_id).filter(Boolean));

      // Top customers (by paid invoice revenue in range)
      const custMap = new Map<string, { name: string; jobs: Set<string>; revenue: number; lastDeal: string | null }>();
      paid.forEach((inv: any) => {
        const name = inv.customers?.name || (isEN ? 'Unnamed' : 'Tanpa Nama');
        const key = inv.customer_id || name;
        const cur = custMap.get(key) || { name, jobs: new Set(), revenue: 0, lastDeal: null };
        cur.revenue += Number(inv.total || 0);
        if (!cur.lastDeal || (inv.paid_date && inv.paid_date > cur.lastDeal)) cur.lastDeal = inv.paid_date;
        custMap.set(key, cur);
      });
      jobs.forEach((j: any) => {
        if (!j.customer_id) return;
        const cur = custMap.get(j.customer_id);
        if (cur) cur.jobs.add(j.id);
      });
      const topCustomers = Array.from(custMap.values())
        .map(c => ({ name: c.name, jobs: c.jobs.size, revenue: c.revenue, lastDeal: c.lastDeal }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Documents
      const quotesSent = quotes.filter(q => q.status !== 'Draft').length;
      const quotesAccepted = quotes.filter(q => q.status === 'Accepted').length;
      const workOrdersAccepted = wos.filter(w => w.status === 'Accepted').length;
      const reportsSent = reports.filter(r => r.status !== 'draft').length;

      setData({
        totalRevenue,
        paidCount: paid.length,
        outstandingAmount,
        outstandingCount: outstanding.length,
        avgInvoice,
        revenueSeries: series,
        jobsTotal: jobs.length,
        jobsCompleted: completed,
        jobsInProgress: inProgress,
        completionRate,
        jobsByStatus,
        jobsByCategory,
        newCustomers: custNewRes.count ?? 0,
        activeCustomers: activeCustomerIds.size,
        totalCustomers: custAllRes.count ?? 0,
        topCustomers,
        quotesSent,
        quotesAccepted,
        workOrdersAccepted,
        reportsSent,
        receiptsGenerated: receiptsRes.count ?? 0,
      });
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [user, startISO, endISO, startDate, endDate, start, end]);

  const periodLabel = useMemo(() => {
    if (preset === 'month') return `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
    if (preset === 'lastMonth') return `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
    if (preset === 'year') return t('reports.year', { year: start.getFullYear() });
    return `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  }, [preset, start, end, isEN]);

  async function handleDownloadPDF() {
    if (!data) return;
    setGenerating(true);
    try {
      const pdfData: MonthlySummaryData = {
        company: {
          name: profile?.company_name || t('reports.yourCompany'),
          logo_url: profile?.logo_url,
          address: profile?.address,
          phone: profile?.phone,
          email: user?.email,
          ssm: profile?.ssm_number_new || profile?.ssm_number_old,
        },
        periodLabel,
        periodStart: startDate,
        periodEnd: endDate,
        jobs: {
          total: data.jobsTotal,
          completed: data.jobsCompleted,
          active: data.jobsInProgress,
          cancelled: data.jobsByStatus.find(s => s.name === 'Cancelled')?.value ?? 0,
        },
        invoices: {
          total: data.paidCount + data.outstandingCount,
          paid: data.paidCount,
          outstanding: data.outstandingCount,
          paidAmount: data.totalRevenue,
          outstandingAmount: data.outstandingAmount,
        },
        topCustomers: data.topCustomers.map(c => ({ name: c.name, amount: c.revenue, count: c.jobs })),
        byCategory: data.jobsByCategory,
      };
      const pdfWithLogo = await embedPdfCompanyLogo(pdfData);
      const blob = await pdf(<MonthlySummaryReportPDF data={pdfWithLogo} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${isEN ? 'Report' : 'Laporan'}-${periodLabel.replace(/\s+/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('reports.downloaded'));
    } catch (e: any) {
      toast.error(e.message || t('reports.generateFailed'));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('reports.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('reports.subtitle')}</p>
        </div>
        <Button data-tutorial="reports-export" onClick={handleDownloadPDF} disabled={generating || loading} className="rounded-lg gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {t('reports.exportPdf')}
        </Button>
      </div>

      {/* Date range pills */}
      <div className="bg-card rounded-xl border border-border p-3 space-y-3">
        <div data-tutorial="reports-presets" className="flex flex-wrap gap-1.5">
          {([
            ['week', t('reports.weekThis')],
            ['month', t('reports.monthThis')],
            ['lastMonth', t('reports.monthLast')],
            ['3m', t('reports.months3')],
            ['year', t('reports.yearThis')],
            ['custom', t('reports.custom')],
          ] as [Preset, string][]).map(([p, lbl]) => (
            <button
              key={p}
              type="button"
              onClick={() => applyPreset(p)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                preset === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-sidebar-background text-muted-foreground hover:bg-sidebar-accent'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-border">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">{t('reports.from')}</label>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="h-9 px-2 text-sm rounded border border-input bg-background" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">{t('reports.to')}</label>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="h-9 px-2 text-sm rounded border border-input bg-background" />
            </div>
            <Button size="sm" onClick={applyCustom} className="h-9 rounded-lg">{t('reports.useDates')}</Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t('reports.period')} <span className="font-medium text-foreground">{periodLabel}</span></p>
      </div>

      {loading || !data ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Section 1: Revenue */}
          <Section title={t('reports.secRevenue')} icon="💰">
            <StatGrid items={[
              { label: t('reports.totalRevenue'), value: `RM ${data.totalRevenue.toFixed(2)}` },
              { label: t('reports.paidInvoices'), value: data.paidCount },
              { label: t('reports.outstanding'), value: `RM ${data.outstandingAmount.toFixed(2)}` },
              { label: t('reports.avgInvoice'), value: `RM ${data.avgInvoice.toFixed(2)}` },
            ]} />
            {data.revenueSeries.length > 0 && (
              <div className="h-56 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueSeries} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip formatter={(v: any) => `RM ${Number(v).toFixed(2)}`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          {/* Section 2: Jobs */}
          <Section title={t('reports.secJobs')} icon="📋">
            <StatGrid items={[
              { label: t('reports.totalJobs'), value: data.jobsTotal },
              { label: t('reports.completedJobs'), value: data.jobsCompleted },
              { label: t('reports.inProgressJobs'), value: data.jobsInProgress },
              { label: t('reports.completionRate'), value: `${data.completionRate}%` },
            ]} />
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {data.jobsByStatus.length > 0 && (
                <div className="h-56">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t('reports.jobStatus')}</p>
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie data={data.jobsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%"
                        outerRadius={70} innerRadius={40} paddingAngle={2}
                        label={(e: any) => `${e.value}`}>
                        {data.jobsByStatus.map((s, i) => (
                          <Cell key={i} fill={STATUS_COLORS_HEX[s.name] || '#94A3B8'} />
                        ))}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {data.jobsByCategory.length > 0 && (
                <div className="h-56">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t('reports.jobCategory')}</p>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={data.jobsByCategory} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={70} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </Section>

          {/* Section 3: Customers */}
          <Section title={t('reports.secCustomers')} icon="👥">
            <StatGrid items={[
              { label: t('reports.newCustomers'), value: data.newCustomers },
              { label: t('reports.activeCustomers'), value: data.activeCustomers },
              { label: t('reports.totalCustomers'), value: data.totalCustomers },
            ]} />
            {data.topCustomers.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <p className="text-xs font-medium text-muted-foreground mb-2">{t('reports.topCustomers')}</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border">
                      <th className="py-2 font-medium text-muted-foreground text-xs">{t('reports.tName')}</th>
                      <th className="py-2 font-medium text-muted-foreground text-xs text-right">{t('reports.tJobs')}</th>
                      <th className="py-2 font-medium text-muted-foreground text-xs text-right">{t('reports.tValue')}</th>
                      <th className="py-2 font-medium text-muted-foreground text-xs text-right">{t('reports.tLast')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCustomers.map((c, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 text-foreground">{c.name}</td>
                        <td className="py-2 text-right text-foreground">{c.jobs}</td>
                        <td className="py-2 text-right text-foreground">RM {c.revenue.toFixed(2)}</td>
                        <td className="py-2 text-right text-muted-foreground text-xs">
                          {c.lastDeal ? new Date(c.lastDeal).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short' }) : '–'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Section 4: Documents */}
          <Section title={t('reports.secDocs')} icon="📄">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatBox label={t('reports.quotesSent')} value={data.quotesSent} />
              <StatBox label={t('reports.quotesAccepted')} value={data.quotesAccepted} />
              <StatBox label={t('reports.wosAccepted')} value={data.workOrdersAccepted} />
              <StatBox label={t('reports.reportsSent')} value={data.reportsSent} />
              <StatBox label={t('reports.receiptsGen')} value={data.receiptsGenerated} />
            </div>

            {/* Conversion funnel */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-3">{t('reports.funnel')}</p>
              <FunnelStages stages={[
                { label: t('reports.fQuote'), count: data.quotesSent },
                { label: t('reports.fAccepted'), count: data.quotesAccepted },
                { label: t('reports.fWorkOrder'), count: data.workOrdersAccepted },
                { label: t('reports.fReport'), count: data.reportsSent },
                { label: t('reports.fPaid'), count: data.paidCount },
              ]} />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// ───────────────── helpers ─────────────────

function buildRevenueSeries(paid: any[], start: Date, end: Date, days: number) {
  const buckets = new Map<string, number>();
  let formatKey: (d: Date) => string;
  let formatLabel: (d: Date) => string;
  let step: 'day' | 'week' | 'month';

  if (days < 14) step = 'day';
  else if (days <= 90) step = 'week';
  else step = 'month';

  if (step === 'day') {
    formatKey = d => toInputDate(d);
    formatLabel = d => `${d.getDate()}/${d.getMonth() + 1}`;
    const cur = new Date(start);
    while (cur <= end) { buckets.set(formatKey(cur), 0); cur.setDate(cur.getDate() + 1); }
  } else if (step === 'week') {
    formatKey = d => {
      const c = new Date(d); const day = c.getDay() || 7;
      c.setDate(c.getDate() - (day - 1));
      return toInputDate(c);
    };
    formatLabel = d => `${d.getDate()}/${d.getMonth() + 1}`;
    const cur = new Date(start);
    while (cur <= end) {
      const k = formatKey(cur);
      if (!buckets.has(k)) buckets.set(k, 0);
      cur.setDate(cur.getDate() + 7);
    }
  } else {
    formatKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    formatLabel = d => `${d.toLocaleDateString(getDateLocale(), { month: 'short' })} ${String(d.getFullYear()).slice(-2)}`;
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      buckets.set(formatKey(cur), 0);
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  paid.forEach(inv => {
    if (!inv.paid_date) return;
    const d = new Date(inv.paid_date);
    let key: string;
    if (step === 'day') key = toInputDate(d);
    else if (step === 'week') {
      const c = new Date(d); const day = c.getDay() || 7;
      c.setDate(c.getDate() - (day - 1));
      key = toInputDate(c);
    } else key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + Number(inv.total || 0));
  });

  return Array.from(buckets.entries()).map(([key, amount]) => {
    const d = step === 'month'
      ? new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1)
      : new Date(key);
    return { label: formatLabel(d), amount };
  });
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 md:p-5 space-y-3">
      <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function StatGrid({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it, i) => <StatBox key={i} label={it.label} value={it.value} />)}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-background">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground mt-1">{value}</p>
    </div>
  );
}

function FunnelStages({ stages }: { stages: { label: string; count: number }[] }) {
  const max = Math.max(...stages.map(s => s.count), 1);
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const pct = (s.count / max) * 100;
        const conv = i > 0 && stages[i - 1].count > 0
          ? Math.round((s.count / stages[i - 1].count) * 100)
          : null;
        return (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-28 text-xs text-foreground shrink-0">{s.label}</div>
            <div className="flex-1 h-7 bg-sidebar-background rounded relative overflow-hidden">
              <div className="h-full bg-primary/80 rounded transition-all" style={{ width: `${pct}%` }} />
              <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-foreground">{s.count}</span>
            </div>
            <div className="w-12 text-right text-[11px] text-muted-foreground shrink-0">
              {conv !== null ? `${conv}%` : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

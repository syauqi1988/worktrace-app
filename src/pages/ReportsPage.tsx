import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileBarChart, Download, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import MonthlySummaryReportPDF, { MonthlySummaryData } from '@/components/pdf/MonthlySummaryReportPDF';
import { toast } from 'sonner';

const MONTH_NAMES = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

export default function ReportsPage() {
  const { user, profile } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<MonthlySummaryData | null>(null);
  const [loading, setLoading] = useState(false);

  const periodStart = useMemo(() => new Date(year, month, 1).toISOString(), [year, month]);
  const periodEnd = useMemo(() => new Date(year, month + 1, 0, 23, 59, 59).toISOString(), [year, month]);
  const periodStartDate = periodStart.slice(0, 10);
  const periodEndDate = periodEnd.slice(0, 10);

  async function loadData(): Promise<MonthlySummaryData> {
    const [jobsRes, invoicesRes] = await Promise.all([
      supabase.from('jobs')
        .select('id, status, category, customer_id, customers(name)')
        .gte('created_at', periodStart).lte('created_at', periodEnd),
      supabase.from('invoices')
        .select('id, status, total, customer_id, customers:customer_id(name)')
        .gte('created_at', periodStart).lte('created_at', periodEnd),
    ]);

    const jobs = jobsRes.data || [];
    const invoices = invoicesRes.data || [];

    const completed = jobs.filter(j => j.status === 'Completed').length;
    const active = jobs.filter(j => j.status === 'Scheduled' || j.status === 'In Progress').length;
    const cancelled = jobs.filter(j => j.status === 'Cancelled').length;

    const paid = invoices.filter(i => i.status === 'Paid');
    const outstanding = invoices.filter(i => i.status !== 'Paid' && i.status !== 'Draft');
    const paidAmount = paid.reduce((s, i) => s + Number(i.total || 0), 0);
    const outstandingAmount = outstanding.reduce((s, i) => s + Number(i.total || 0), 0);

    // By category
    const catMap = new Map<string, number>();
    jobs.forEach(j => catMap.set(j.category, (catMap.get(j.category) || 0) + 1));
    const byCategory = Array.from(catMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Top customers from paid invoices
    const custMap = new Map<string, { name: string; amount: number; count: number }>();
    paid.forEach((inv: any) => {
      const name = inv.customers?.name || 'Tanpa Nama';
      const key = inv.customer_id || name;
      const cur = custMap.get(key) || { name, amount: 0, count: 0 };
      cur.amount += Number(inv.total || 0);
      cur.count += 1;
      custMap.set(key, cur);
    });
    const topCustomers = Array.from(custMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 5);

    return {
      company: {
        name: profile?.company_name || 'Syarikat Anda',
        logo_url: profile?.logo_url,
        address: profile?.address,
        phone: profile?.phone,
        email: user?.email,
        ssm: profile?.ssm_number_new || profile?.ssm_number_old,
      },
      periodLabel: `${MONTH_NAMES[month]} ${year}`,
      periodStart: periodStartDate,
      periodEnd: periodEndDate,
      jobs: { total: jobs.length, completed, active, cancelled },
      invoices: {
        total: invoices.length,
        paid: paid.length,
        outstanding: outstanding.length,
        paidAmount,
        outstandingAmount,
      },
      topCustomers,
      byCategory,
    };
  }

  async function handlePreview() {
    setLoading(true);
    try {
      const data = await loadData();
      setPreview(data);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    setGenerating(true);
    try {
      const data = preview || await loadData();
      const blob = await pdf(<MonthlySummaryReportPDF data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan-${MONTH_NAMES[month]}-${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Laporan dimuat turun');
    } catch (e: any) {
      toast.error(e.message || 'Gagal menjana laporan');
    } finally {
      setGenerating(false);
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Laporan</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Jana laporan ringkasan bulanan</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Bulan</label>
            <select
              value={month}
              onChange={e => { setMonth(Number(e.target.value)); setPreview(null); }}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            >
              {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tahun</label>
            <select
              value={year}
              onChange={e => { setYear(Number(e.target.value)); setPreview(null); }}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handlePreview} variant="outline" disabled={loading} className="rounded-lg gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBarChart className="h-4 w-4" />}
            Pratonton
          </Button>
          <Button onClick={handleDownload} disabled={generating} className="rounded-lg gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Muat Turun PDF
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {preview && !loading && (
        <div className="space-y-4">
          <SummaryGrid title="Kerja" items={[
            { label: 'Jumlah', value: preview.jobs.total },
            { label: 'Siap', value: preview.jobs.completed },
            { label: 'Aktif', value: preview.jobs.active },
            { label: 'Dibatal', value: preview.jobs.cancelled },
          ]} />
          <SummaryGrid title="Invois" items={[
            { label: 'Jumlah', value: preview.invoices.total },
            { label: 'Dibayar', value: preview.invoices.paid },
            { label: 'Belum Bayar', value: preview.invoices.outstanding },
          ]} />
          <SummaryGrid title="Pendapatan" items={[
            { label: 'Diterima', value: `RM ${preview.invoices.paidAmount.toFixed(2)}` },
            { label: 'Tertunggak', value: `RM ${preview.invoices.outstandingAmount.toFixed(2)}` },
          ]} />
          {preview.topCustomers.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Pelanggan Teratas</h3>
              <div className="space-y-2">
                {preview.topCustomers.map((c, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-foreground">{c.name}</span>
                    <span className="text-muted-foreground">RM {c.amount.toFixed(2)} ({c.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryGrid({ title, items }: { title: string; items: { label: string; value: string | number }[] }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((it, i) => (
          <div key={i}>
            <p className="text-xs text-muted-foreground">{it.label}</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">{it.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Briefcase, Clock, CheckCircle, Plus, Users, Receipt, CalendarDays
} from 'lucide-react';
import RevenueRangeCard from '@/components/dashboard/RevenueRangeCard';

const CATEGORY_COLORS: Record<string, string> = {
  Renovation: 'bg-blue-100 text-blue-700',
  Aircond: 'bg-cyan-100 text-cyan-700',
  Electrical: 'bg-amber-100 text-amber-700',
  Plumbing: 'bg-blue-100 text-blue-700',
  Maintenance: 'bg-green-100 text-green-700',
  Welding: 'bg-orange-100 text-orange-700',
  Other: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS: Record<string, string> = {
  Lead: 'bg-gray-100 text-gray-600',
  Scheduled: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

interface JobRow {
  id: string;
  job_number: string;
  title: string;
  category: string;
  status: string;
  scheduled_date: string | null;
  created_at: string;
  customers: { name: string } | null;
}

interface Stats {
  totalThisMonth: number;
  active: number;
  completedThisMonth: number;
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    async function fetchData() {
      // Fetch stats in parallel
      const [totalRes, activeRes, completedRes, jobsRes] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true })
          .gte('created_at', startOfMonth).lte('created_at', endOfMonth),
        supabase.from('jobs').select('id', { count: 'exact', head: true })
          .in('status', ['Scheduled', 'In Progress']),
        supabase.from('jobs').select('id', { count: 'exact', head: true })
          .eq('status', 'Completed')
          .gte('completed_date', startOfMonth.slice(0, 10))
          .lte('completed_date', endOfMonth.slice(0, 10)),
        supabase.from('jobs').select('id, job_number, title, category, status, scheduled_date, created_at, customers(name)')
          .order('created_at', { ascending: false }).limit(10),
      ]);

      setStats({
        totalThisMonth: totalRes.count ?? 0,
        active: activeRes.count ?? 0,
        completedThisMonth: completedRes.count ?? 0,
      });
      setJobs((jobsRes.data as unknown as JobRow[]) || []);
      setLoading(false);
    }

    fetchData();
  }, [user]);

  const greeting = profile?.company_name
    ? `Selamat datang, ${profile.company_name}`
    : 'Selamat datang ke WorkTrace';

  const statsCards = [
    { label: 'Total Kerja Bulan Ini', value: stats?.totalThisMonth ?? 0, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Kerja Aktif', value: stats?.active ?? 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Siap Bulan Ini', value: stats?.completedThisMonth ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{greeting}</p>
      </div>

      {/* Stats Cards */}
      <div data-tutorial="dashboard-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statsCards.map(card => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-4 relative overflow-hidden">
            <div className={`absolute top-3 right-3 h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            {loading ? (
              <>
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-7 w-16" />
              </>
            ) : (
              <>
                <p className="text-[13px] text-muted-foreground pr-10">{card.label}</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{card.value}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div data-tutorial="dashboard-quick-actions" className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button onClick={() => navigate('/jobs/new')} className="h-10 rounded-lg gap-2">
          <Plus className="h-4 w-4" /> Kerja Baru
        </Button>
        <Button onClick={() => navigate('/customers/new')} variant="outline" className="h-10 rounded-lg gap-2">
          <Users className="h-4 w-4" /> Pelanggan Baru
        </Button>
        <Button onClick={() => navigate('/invoices/new')} variant="outline" className="h-10 rounded-lg gap-2">
          <Receipt className="h-4 w-4" /> Invois Baru
        </Button>
      </div>

      {/* Recent Jobs */}
      <div data-tutorial="dashboard-recent-jobs">
        <h2 className="text-lg font-semibold text-foreground mb-3">Kerja Terkini</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center bg-card">
            <Briefcase className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground mb-4">Belum ada kerja lagi</p>
            <Button onClick={() => navigate('/jobs/new')} className="rounded-lg gap-2">
              <Plus className="h-4 w-4" /> Tambah Kerja Pertama
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map(job => (
              <button
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="w-full bg-card rounded-xl border border-border p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{job.job_number}</span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[job.category] || CATEGORY_COLORS.Other}`}>
                      {job.category}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] || STATUS_COLORS.Lead}`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                    {job.customers?.name || 'Tiada pelanggan'}
                  </p>
                </div>
                {job.scheduled_date && (
                  <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="text-[13px]">{new Date(job.scheduled_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

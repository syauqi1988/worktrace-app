import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Plus, Search, X, CalendarDays, User, CheckSquare, Square } from 'lucide-react';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import BulkActionBar from '@/components/BulkActionBar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';
import { tx } from '@/lib/tx';

const CATEGORY_COLORS: Record<string, string> = {
  Renovation: 'bg-blue-100 text-blue-700',
  Aircond: 'bg-cyan-100 text-cyan-700',
  Electrical: 'bg-amber-100 text-amber-700',
  Plumbing: 'bg-indigo-100 text-indigo-700',
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

const STATUS_TABS = ['Semua', 'Lead', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'];

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

export default function JobsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    let result = jobs;
    if (statusFilter !== 'Semua') result = result.filter(j => j.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(j =>
        j.job_number.toLowerCase().includes(q) ||
        j.title.toLowerCase().includes(q) ||
        (j.customers?.name || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [jobs, statusFilter, search]);

  const bulk = useBulkSelection(filtered);

  useEffect(() => {
    if (!user) return;
    async function fetch() {
      const { data } = await supabase
        .from('jobs')
        .select('id, job_number, title, category, status, scheduled_date, created_at, customers(name)')
        .order('created_at', { ascending: false });
      setJobs((data as unknown as JobRow[]) || []);
      setLoading(false);
    }
    fetch();
  }, [user]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });

  async function handleBulkDelete() {
    setDeleting(true);
    const ids = Array.from(bulk.selected);
    const { error } = await supabase.from('jobs').delete().in('id', ids);
    setDeleting(false);
    setConfirmOpen(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setJobs(prev => prev.filter(j => !ids.includes(j.id)));
    toast.success(`${ids.length} kerja dipadam`);
    bulk.exit();
  }

  function handleCardClick(id: string) {
    if (bulk.selectionMode) bulk.toggle(id);
    else navigate(`/jobs/${id}`);
  }

  // Long press for mobile
  let pressTimer: any = null;
  function handlePressStart(id: string) {
    pressTimer = setTimeout(() => bulk.enter(id), 500);
  }
  function handlePressEnd() {
    if (pressTimer) clearTimeout(pressTimer);
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {bulk.selectionMode && (
        <BulkActionBar
          count={bulk.selected.size}
          total={filtered.length}
          onSelectAll={bulk.selectAll}
          onClear={bulk.clear}
          onDelete={() => setConfirmOpen(true)}
          onExit={bulk.exit}
          deleting={deleting}
          label=tx("kerja")
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{tx('Kerja')}</h1>
        <div className="flex gap-2">
          {!bulk.selectionMode && filtered.length > 0 && (
            <Button onClick={() => bulk.enter()} variant="outline" size="sm" className="rounded-lg gap-1.5">
              <CheckSquare className="h-4 w-4" /> {tx('Pilih')}
            </Button>
          )}
          <Button data-tutorial="jobs-new-btn" onClick={() => navigate('/jobs/new')} size="sm" className="rounded-lg gap-1.5 hidden sm:flex">
            <Plus className="h-4 w-4" /> {tx('Kerja Baru')}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div data-tutorial="jobs-search" className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder=tx("Cari kerja, nombor, atau pelanggan...")
          className="pl-9 pr-9 rounded-lg"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Status Tabs */}
      <div data-tutorial="jobs-status-tabs" className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              statusFilter === tab
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Job Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-xl border border-border p-4">
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-3 w-40 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center bg-card">
          <Briefcase className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground mb-4">
            {jobs.length === 0 ? tx('Belum ada kerja') : tx('Tiada kerja dijumpai')}
          </p>
          {jobs.length === 0 && (
            <Button onClick={() => navigate('/jobs/new')} className="rounded-lg gap-2">
              <Plus className="h-4 w-4" /> {tx('Tambah Kerja')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(job => {
            const isSelected = bulk.selected.has(job.id);
            return (
              <button
                key={job.id}
                onClick={() => handleCardClick(job.id)}
                onMouseDown={() => handlePressStart(job.id)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={() => handlePressStart(job.id)}
                onTouchEnd={handlePressEnd}
                className={`w-full bg-card rounded-xl border p-4 hover:shadow-md transition-all text-left flex gap-3 ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                {bulk.selectionMode && (
                  <div className="shrink-0 pt-0.5">
                    {isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-primary">{job.job_number}</span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[job.status] || STATUS_COLORS.Lead}`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>{job.customers?.name || tx('Tiada pelanggan')}</span>
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[job.category] || CATEGORY_COLORS.Other}`}>
                      {job.category}
                    </span>
                  </div>
                  {job.scheduled_date && (
                    <div className="flex items-center gap-1 mt-1.5 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span className="text-[13px]">{formatDate(job.scheduled_date)}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile FAB */}
      {!bulk.selectionMode && (
        <button
          data-tutorial="jobs-fab"
          onClick={() => navigate('/jobs/new')}
          className="sm:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title=tx("Padam Kerja Terpilih?")
        body={`Adakah anda pasti ingin padam ${bulk.selected.size} kerja? Tindakan ini tidak boleh dibatalkan.`}
        confirmLabel=tx("Padam")
        confirmVariant="danger"
        isLoading={deleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}

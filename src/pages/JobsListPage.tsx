import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';
import { getDateLocale } from '@/i18n';
import DataListPage from '@/components/list/DataListPage';

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

const STATUSES = ['Lead', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'];

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

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export default function JobsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<{ ids: string[]; clear: () => void } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('jobs')
      .select('id, job_number, title, category, status, scheduled_date, created_at, customers(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setJobs((data as unknown as JobRow[]) || []);
        setLoading(false);
      });
  }, [user]);

  async function handleBulkDelete() {
    if (!pending) return;
    setDeleting(true);
    const ids = pending.ids;
    const { error } = await supabase.from('jobs').delete().in('id', ids);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    setJobs(prev => prev.filter(j => !ids.includes(j.id)));
    toast.success(t('jobs.deletedToast', { count: ids.length }));
    pending.clear();
    setPending(null);
  }

  return (
    <>
      <DataListPage<JobRow>
        breadcrumb={t('nav.jobs')}
        title={t('jobs.title')}
        newLabel={t('jobs.newJob')}
        onNew={() => navigate('/jobs/new')}
        rows={jobs}
        loading={loading}
        emptyMessage={t('jobs.empty')}
        getRowId={j => j.id}
        onRowClick={j => navigate(`/jobs/${j.id}`)}
        getDate={j => j.created_at}
        searchValues={j => [j.job_number, j.title, j.customers?.name]}
        selectable
        bulkActions={(selected, clear) => (
          <Button
            size="sm"
            variant="destructive"
            className="gap-1"
            onClick={() => setPending({ ids: selected.map(s => s.id), clear })}
          >
            <Trash2 className="h-3.5 w-3.5" /> {t('common.delete')}
          </Button>
        )}
        filters={[
          {
            label: 'Status',
            options: STATUSES.map(s => ({ value: s, label: s })),
            match: (j, v) => j.status === v,
          },
          {
            label: 'Category',
            options: Object.keys(CATEGORY_COLORS).map(c => ({ value: c, label: c })),
            match: (j, v) => j.category === v,
          },
        ]}
        columns={[
          { key: 'created_at', header: 'Date', sortValue: j => j.created_at, render: j => formatDate(j.created_at) },
          { key: 'job_number', header: 'Job No.', sortValue: j => j.job_number, render: j => <span className="font-medium text-primary">{j.job_number}</span> },
          { key: 'title', header: 'Title', sortValue: j => j.title, render: j => j.title },
          { key: 'customer', header: 'Customer', sortValue: j => j.customers?.name || '', render: j => j.customers?.name || t('common2.noCustomer') },
          {
            key: 'category', header: 'Category', align: 'center',
            render: j => (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[j.category] || CATEGORY_COLORS.Other}`}>{j.category}</span>
            ),
          },
          { key: 'scheduled_date', header: 'Scheduled', sortValue: j => j.scheduled_date || '', render: j => formatDate(j.scheduled_date) },
          {
            key: 'status', header: 'Status', align: 'center',
            render: j => (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[j.status] || STATUS_COLORS.Lead}`}>{j.status}</span>
            ),
          },
        ]}
      />

      <ConfirmDialog
        isOpen={!!pending}
        onClose={() => setPending(null)}
        title={t('jobs.deleteTitle')}
        body={t('common2.deleteConfirm', { count: pending?.ids.length || 0, label: t('jobs.label') })}
        confirmLabel={t('common.delete')}
        confirmVariant="danger"
        isLoading={deleting}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}

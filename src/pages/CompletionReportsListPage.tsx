import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getDateLocale } from '@/i18n';
import DataListPage from '@/components/list/DataListPage';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#F1F5F9] text-[#64748B]',
  submitted: 'bg-[#DBEAFE] text-[#1D4ED8]',
  accepted: 'bg-[#DCFCE7] text-[#15803D]',
  rejected: 'bg-[#FEE2E2] text-[#B91C1C]',
};

const STATUSES = ['draft', 'submitted', 'accepted', 'rejected'];

interface Row {
  id: string;
  report_number: string;
  status: string;
  completion_date: string | null;
  created_at: string;
  job_id: string;
  jobs: { job_number: string; title: string; customers: { name: string } | null } | null;
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export default function CompletionReportsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('completion_reports')
      .select('id, report_number, status, completion_date, created_at, job_id, jobs(job_number, title, customers(name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRows((data as unknown as Row[]) || []);
        setLoading(false);
      });
  }, [user]);

  return (
    <DataListPage<Row>
      breadcrumb={t('nav.jobs')}
      title={t('completionReports.title')}
      rows={rows}
      loading={loading}
      emptyMessage={t('completionReports.empty')}
      getRowId={r => r.id}
      onRowClick={r => navigate(`/jobs/${r.job_id}/completion-report`)}
      getDate={r => r.created_at}
      searchValues={r => [r.report_number, r.jobs?.title, r.jobs?.job_number, r.jobs?.customers?.name]}
      filters={[
        {
          label: 'Status',
          options: STATUSES.map(s => ({ value: s, label: t(`completionReports.statusTabs.${s}`, { defaultValue: s }) })),
          match: (r, v) => (r.status || 'draft') === v,
        },
      ]}
      columns={[
        { key: 'created_at', header: 'Date', sortValue: r => r.created_at, render: r => formatDate(r.created_at) },
        { key: 'report_number', header: 'Report No.', sortValue: r => r.report_number, render: r => <span className="font-medium text-primary">{r.report_number}</span> },
        { key: 'title', header: 'Job', sortValue: r => r.jobs?.title || '', render: r => r.jobs?.title || '-' },
        { key: 'customer', header: 'Customer', sortValue: r => r.jobs?.customers?.name || '', render: r => r.jobs?.customers?.name || '-' },
        { key: 'completion_date', header: 'Completed On', sortValue: r => r.completion_date || '', render: r => formatDate(r.completion_date) },
        {
          key: 'status', header: 'Status', align: 'center',
          render: r => {
            const s = r.status || 'draft';
            return (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[s] || STATUS_COLORS.draft}`}>
                {t(`completionReports.statusTabs.${s}`, { defaultValue: s })}
              </span>
            );
          },
        },
      ]}
    />
  );
}

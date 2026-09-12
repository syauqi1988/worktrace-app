import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getDateLocale } from '@/i18n';
import DataListPage from '@/components/list/DataListPage';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-[#F1F5F9] text-[#64748B]',
  Created: 'bg-[#E0E7FF] text-[#4338CA]',
  Sent: 'bg-[#DBEAFE] text-[#1D4ED8]',
  Accepted: 'bg-[#DCFCE7] text-[#15803D]',
  Rejected: 'bg-[#FEE2E2] text-[#B91C1C]',
};

const STATUSES = ['Created', 'Draft', 'Sent', 'Accepted', 'Rejected'];

interface WoRow {
  id: string;
  wo_number: string;
  status: string;
  total: number;
  scheduled_start_date: string | null;
  created_at: string;
  job_id: string;
  jobs: { job_number: string; title: string; customers: { name: string } | null } | null;
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export default function WorkOrdersListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rows, setRows] = useState<WoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('work_orders')
      .select('id, wo_number, status, total, scheduled_start_date, created_at, job_id, jobs(job_number, title, customers(name))')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRows((data as unknown as WoRow[]) || []);
        setLoading(false);
      });
  }, [user]);

  return (
    <DataListPage<WoRow>
      breadcrumb={t('nav.jobs')}
      title={t('workOrders.title')}
      rows={rows}
      loading={loading}
      emptyMessage={t('workOrders.empty')}
      getRowId={w => w.id}
      onRowClick={w => navigate(`/jobs/${w.job_id}/work-order`)}
      getDate={w => w.created_at}
      searchValues={w => [w.wo_number, w.jobs?.title, w.jobs?.job_number, w.jobs?.customers?.name]}
      getAmount={w => Number(w.total || 0)}
      amountHeader={t('workOrders.title')}
      filters={[
        {
          label: 'Status',
          options: STATUSES.map(s => ({ value: s, label: s })),
          match: (w, v) => w.status === v,
        },
      ]}
      columns={[
        { key: 'created_at', header: 'Date', sortValue: w => w.created_at, render: w => formatDate(w.created_at) },
        { key: 'wo_number', header: 'WO No.', sortValue: w => w.wo_number, render: w => <span className="font-medium text-primary">{w.wo_number}</span> },
        { key: 'title', header: 'Job', sortValue: w => w.jobs?.title || '', render: w => w.jobs?.title || '-' },
        { key: 'customer', header: 'Customer', sortValue: w => w.jobs?.customers?.name || '', render: w => w.jobs?.customers?.name || '-' },
        { key: 'start', header: 'Start Date', sortValue: w => w.scheduled_start_date || '', render: w => formatDate(w.scheduled_start_date) },
        {
          key: 'status', header: 'Status', align: 'center',
          render: w => (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[w.status] || STATUS_COLORS.Draft}`}>{w.status}</span>
          ),
        },
        { key: 'amount', header: 'Amount', align: 'right', sortValue: w => Number(w.total || 0), render: w => `RM ${Number(w.total || 0).toFixed(2)}` },
      ]}
    />
  );
}

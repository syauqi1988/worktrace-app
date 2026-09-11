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

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-[#F1F5F9] text-[#64748B]',
  Created: 'bg-[#E0E7FF] text-[#4338CA]',
  Sent: 'bg-[#DBEAFE] text-[#1D4ED8]',
  Accepted: 'bg-[#DCFCE7] text-[#15803D]',
  Rejected: 'bg-[#FEE2E2] text-[#B91C1C]',
};

const STATUSES = ['Created', 'Draft', 'Sent', 'Accepted', 'Rejected'];

interface QuotationRow {
  id: string;
  quote_number: string;
  status: string;
  total: number;
  valid_until: string | null;
  created_at: string;
  jobs: { job_number: string; customers: { name: string } | null } | null;
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export default function QuotationsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<{ ids: string[]; clear: () => void } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('quotations')
      .select('id, quote_number, status, total, valid_until, created_at, jobs(job_number, customers(name))')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setQuotations((data as unknown as QuotationRow[]) || []);
        setLoading(false);
      });
  }, [user]);

  async function handleBulkDelete() {
    if (!pending) return;
    setDeleting(true);
    const ids = pending.ids;
    const { error } = await supabase.from('quotations').delete().in('id', ids);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    setQuotations(prev => prev.filter(q => !ids.includes(q.id)));
    toast.success(t('quotations.deletedToast', { count: ids.length }));
    pending.clear();
    setPending(null);
  }

  return (
    <>
      <DataListPage<QuotationRow>
        breadcrumb={t('nav.sales')}
        title={t('quotations.title')}
        newLabel={t('quotations.newQuotation')}
        onNew={() => navigate('/quotations/new')}
        rows={quotations}
        loading={loading}
        emptyMessage={t('quotations.empty')}
        getRowId={q => q.id}
        onRowClick={q => navigate(`/quotations/${q.id}`)}
        getDate={q => q.created_at}
        searchValues={q => [q.quote_number, q.jobs?.job_number, q.jobs?.customers?.name]}
        getAmount={q => Number(q.total || 0)}
        amountHeader={t('quotations.title')}
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
            match: (q, v) => q.status === v,
          },
        ]}
        columns={[
          { key: 'created_at', header: 'Date', sortValue: q => q.created_at, render: q => formatDate(q.created_at) },
          { key: 'quote_number', header: 'Quotation No.', sortValue: q => q.quote_number, render: q => <span className="font-medium text-primary">{q.quote_number}</span> },
          { key: 'customer', header: 'Customer', sortValue: q => q.jobs?.customers?.name || '', render: q => q.jobs?.customers?.name || t('common2.noCustomer') },
          { key: 'job', header: 'Job', render: q => q.jobs?.job_number || '-' },
          { key: 'valid_until', header: 'Valid Until', sortValue: q => q.valid_until || '', render: q => formatDate(q.valid_until) },
          {
            key: 'status', header: 'Status', align: 'center',
            render: q => (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[q.status] || STATUS_COLORS.Draft}`}>{q.status}</span>
            ),
          },
          { key: 'amount', header: 'Amount', align: 'right', sortValue: q => Number(q.total || 0), render: q => `RM ${Number(q.total).toFixed(2)}` },
        ]}
      />

      <ConfirmDialog
        isOpen={!!pending}
        onClose={() => setPending(null)}
        title={t('quotations.deleteTitle')}
        body={t('common2.deleteConfirm', { count: pending?.ids.length || 0, label: t('quotations.label') })}
        confirmLabel={t('common.delete')}
        confirmVariant="danger"
        isLoading={deleting}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}

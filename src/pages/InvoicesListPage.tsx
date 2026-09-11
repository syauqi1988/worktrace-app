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
  Paid: 'bg-[#DCFCE7] text-[#15803D]',
  Overdue: 'bg-[#FEE2E2] text-[#B91C1C]',
};

const STATUSES = ['Created', 'Draft', 'Sent', 'Paid', 'Overdue'];

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  due_date: string | null;
  created_at: string;
  job_id: string | null;
  jobs: { job_number: string; customers: { name: string } | null } | null;
}

function formatDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
}

function getDisplayStatus(inv: InvoiceRow): string {
  if (inv.status === 'Sent' && inv.due_date && new Date(inv.due_date) < new Date(new Date().toDateString())) {
    return 'Overdue';
  }
  return inv.status;
}

export default function InvoicesListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<{ ids: string[]; clear: () => void } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('invoices')
      .select('id, invoice_number, status, total, due_date, created_at, job_id, jobs(job_number, customers(name))')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setInvoices((data as unknown as InvoiceRow[]) || []);
        setLoading(false);
      });
  }, [user]);

  async function handleBulkDelete() {
    if (!pending) return;
    setDeleting(true);
    const ids = pending.ids;
    const { error } = await supabase.from('invoices').delete().in('id', ids);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    setInvoices(prev => prev.filter(i => !ids.includes(i.id)));
    toast.success(t('invoices.deletedToast', { count: ids.length }));
    pending.clear();
    setPending(null);
  }

  return (
    <>
      <DataListPage<InvoiceRow>
        breadcrumb={t('nav.sales')}
        title={t('invoices.title')}
        newLabel={t('invoices.newInvoice')}
        onNew={() => navigate('/invoices/new')}
        rows={invoices}
        loading={loading}
        emptyMessage={t('invoices.empty')}
        getRowId={i => i.id}
        onRowClick={i => navigate(`/invoices/${i.id}`)}
        getDate={i => i.created_at}
        searchValues={i => [i.invoice_number, i.jobs?.job_number, i.jobs?.customers?.name]}
        getAmount={i => Number(i.total || 0)}
        amountHeader={t('invoices.title')}
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
            match: (i, v) => getDisplayStatus(i) === v,
          },
        ]}
        columns={[
          { key: 'created_at', header: 'Date', sortValue: i => i.created_at, render: i => formatDate(i.created_at) },
          { key: 'invoice_number', header: 'Invoice No.', sortValue: i => i.invoice_number, render: i => <span className="font-medium text-primary">{i.invoice_number}</span> },
          { key: 'customer', header: 'Customer', sortValue: i => i.jobs?.customers?.name || '', render: i => i.jobs?.customers?.name || t('common2.noCustomer') },
          { key: 'job', header: 'Job', render: i => i.jobs?.job_number || '-' },
          {
            key: 'due_date', header: 'Due Date', sortValue: i => i.due_date || '',
            render: i => (
              <span className={getDisplayStatus(i) === 'Overdue' ? 'text-[#B91C1C] font-medium' : ''}>{formatDate(i.due_date)}</span>
            ),
          },
          {
            key: 'status', header: 'Status', align: 'center',
            render: i => {
              const s = getDisplayStatus(i);
              return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[s] || STATUS_COLORS.Draft}`}>{s}</span>;
            },
          },
          { key: 'amount', header: 'Amount', align: 'right', sortValue: i => Number(i.total || 0), render: i => `RM ${Number(i.total).toFixed(2)}` },
        ]}
      />

      <ConfirmDialog
        isOpen={!!pending}
        onClose={() => setPending(null)}
        title={t('invoices.deleteTitle')}
        body={t('common2.deleteConfirm', { count: pending?.ids.length || 0, label: t('invoices.label') })}
        confirmLabel={t('common.delete')}
        confirmVariant="danger"
        isLoading={deleting}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}

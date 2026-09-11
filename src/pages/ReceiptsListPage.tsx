import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getDateLocale } from '@/i18n';
import DataListPage from '@/components/list/DataListPage';

interface ReceiptRow {
  id: string;
  invoice_number: string;
  receipt_number: string | null;
  total: number;
  paid_date: string | null;
  created_at: string;
  jobs: { customers: { name: string } | null } | null;
}

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ReceiptsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('invoices')
      .select('id, invoice_number, receipt_number, total, paid_date, created_at, jobs(customers(name))')
      .eq('status', 'Paid')
      .order('paid_date', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        setRows((data as unknown as ReceiptRow[]) || []);
        setLoading(false);
      });
  }, [user]);

  return (
    <DataListPage<ReceiptRow>
      breadcrumb={t('nav.sales')}
      title={t('receipts.title')}
      description={t('receipts.subtitle')}
      rows={rows}
      loading={loading}
      emptyMessage={t('receipts.empty')}
      getRowId={r => r.id}
      onRowClick={r => navigate(`/invoices/${r.id}`)}
      getDate={r => r.paid_date || r.created_at}
      searchValues={r => [r.receipt_number, r.invoice_number, r.jobs?.customers?.name]}
      getAmount={r => Number(r.total || 0)}
      amountHeader={t('receipts.totalReceived')}
      columns={[
        { key: 'paid_date', header: 'Paid Date', sortValue: r => r.paid_date || '', render: r => formatDate(r.paid_date) },
        {
          key: 'receipt_number', header: 'Receipt No.', sortValue: r => r.receipt_number || '',
          render: r => <span className="font-medium text-primary">{r.receipt_number || t('receipts.noNumber')}</span>,
        },
        { key: 'invoice_number', header: 'Invoice No.', sortValue: r => r.invoice_number, render: r => r.invoice_number },
        { key: 'customer', header: 'Customer', sortValue: r => r.jobs?.customers?.name || '', render: r => r.jobs?.customers?.name || t('common2.noCustomer') },
        { key: 'amount', header: 'Amount', align: 'right', sortValue: r => Number(r.total || 0), render: r => `RM ${Number(r.total).toFixed(2)}` },
      ]}
    />
  );
}

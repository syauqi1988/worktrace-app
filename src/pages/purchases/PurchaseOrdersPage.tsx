import { useNavigate } from 'react-router-dom';
import DataListPage from '@/components/list/DataListPage';
import { PurchaseDoc, statusBadge } from './shared';

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  return (
    <DataListPage<PurchaseDoc>
      breadcrumb="Purchases"
      title="Purchase Orders"
      newLabel="New Purchase Order"
      onNew={() => navigate('/purchase-orders/new')}
      rows={[]}
      getRowId={r => r.id}
      emptyMessage="No purchase orders found."
      searchValues={r => [r.number, r.party, r.reference]}
      getDate={r => r.date}
      getAmount={r => r.amount}
      amountHeader="Amount"
      selectable
      filters={[
        {
          label: 'Supplier',
          options: [],
          match: (r, v) => r.party === v,
          placeholder: 'All suppliers',
        },
        {
          label: 'Status',
          options: [
            { value: 'Draft', label: 'Draft' },
            { value: 'Sent', label: 'Sent' },
            { value: 'Received', label: 'Received' },
            { value: 'Closed', label: 'Closed' },
          ],
          match: (r, v) => r.status === v,
        },
      ]}
      columns={[
        { key: 'date', header: 'Date', sortValue: r => r.date, render: r => r.date },
        { key: 'number', header: 'PO No.', sortValue: r => r.number, render: r => r.number },
        { key: 'party', header: 'Supplier', sortValue: r => r.party, render: r => r.party },
        { key: 'reference', header: 'Reference', render: r => r.reference || '-' },
        { key: 'status', header: 'Status', align: 'center', render: r => statusBadge(r.status) },
        { key: 'amount', header: 'Amount', align: 'right', sortValue: r => r.amount, render: r => `RM ${r.amount.toFixed(2)}` },
      ]}
    />
  );
}

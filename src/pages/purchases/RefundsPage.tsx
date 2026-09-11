import DataListPage from '@/components/list/DataListPage';
import { PurchaseDoc, statusBadge } from './shared';

export default function RefundsPage() {
  return (
    <DataListPage<PurchaseDoc>
      breadcrumb="Purchases"
      title="Refunds"
      newLabel="New Refund"
      onNew={() => {}}
      rows={[]}
      getRowId={r => r.id}
      emptyMessage="No refunds found."
      searchValues={r => [r.number, r.party, r.reference]}
      getDate={r => r.date}
      getAmount={r => r.amount}
      amountHeader="Amount"
      selectable
      filters={[
        { label: 'Supplier', options: [], match: (r, v) => r.party === v, placeholder: 'All suppliers' },
        {
          label: 'Status',
          options: [
            { value: 'Pending', label: 'Pending' },
            { value: 'Approved', label: 'Approved' },
            { value: 'Closed', label: 'Closed' },
          ],
          match: (r, v) => r.status === v,
        },
      ]}
      columns={[
        { key: 'date', header: 'Date', sortValue: r => r.date, render: r => r.date },
        { key: 'number', header: 'Refund No.', sortValue: r => r.number, render: r => r.number },
        { key: 'party', header: 'Supplier', sortValue: r => r.party, render: r => r.party },
        { key: 'reference', header: 'Reference', render: r => r.reference || '-' },
        { key: 'status', header: 'Status', align: 'center', render: r => statusBadge(r.status) },
        { key: 'amount', header: 'Amount', align: 'right', sortValue: r => r.amount, render: r => `RM ${r.amount.toFixed(2)}` },
      ]}
    />
  );
}

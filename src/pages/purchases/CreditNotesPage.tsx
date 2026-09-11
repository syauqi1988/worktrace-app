import DataListPage from '@/components/list/DataListPage';
import { PurchaseDoc, statusBadge } from './shared';

export default function CreditNotesPage() {
  return (
    <DataListPage<PurchaseDoc>
      breadcrumb="Purchases"
      title="Credit Notes"
      newLabel="New Credit Note"
      onNew={() => {}}
      rows={[]}
      getRowId={r => r.id}
      emptyMessage="No credit notes found."
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
            { value: 'Draft', label: 'Draft' },
            { value: 'Approved', label: 'Approved' },
            { value: 'Closed', label: 'Closed' },
          ],
          match: (r, v) => r.status === v,
        },
      ]}
      columns={[
        { key: 'date', header: 'Date', sortValue: r => r.date, render: r => r.date },
        { key: 'number', header: 'CN No.', sortValue: r => r.number, render: r => r.number },
        { key: 'party', header: 'Supplier', sortValue: r => r.party, render: r => r.party },
        { key: 'reference', header: 'Bill Reference', render: r => r.reference || '-' },
        { key: 'status', header: 'Status', align: 'center', render: r => statusBadge(r.status) },
        { key: 'amount', header: 'Amount', align: 'right', sortValue: r => r.amount, render: r => `RM ${r.amount.toFixed(2)}` },
      ]}
    />
  );
}

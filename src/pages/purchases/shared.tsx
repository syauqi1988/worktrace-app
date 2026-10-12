import { ReactNode } from 'react';
import { useTx } from '@/i18n/dual';

function StatusLabel({ s }: { s: string }) { const tx = useTx(); return <>{tx(s)}</>; }

export type PurchaseDoc = {
  id: string;
  date: string;
  number: string;
  party: string;
  reference?: string;
  status: string;
  amount: number;
};

export type PurchaseType = 'purchase_order' | 'grn' | 'bill' | 'credit_note' | 'payment' | 'refund';

export type PurchaseConfig = {
  type: PurchaseType;
  path: string;
  listTitle: string;
  newLabel: string;
  formTitle: string;
  editTitle: string;
  prefix: string;
  numberHeader: string;
  referenceLabel: string;
  statuses: string[];
  empty: string;
  /** PDF title, [English, Malay] */
  pdfTitle: [string, string];
};

export const PURCHASE_CONFIG: Record<PurchaseType, PurchaseConfig> = {
  purchase_order: {
    type: 'purchase_order', path: '/purchase-orders', listTitle: 'Purchase Orders', newLabel: 'New Purchase Order',
    formTitle: 'New Purchase Order', editTitle: 'Edit Purchase Order', prefix: 'PO', numberHeader: 'PO No.',
    referenceLabel: 'Reference No.', statuses: ['Draft', 'Pending Approval', 'Ready'], empty: 'No purchase orders found.',
    pdfTitle: ['PURCHASE ORDER', 'PESANAN BELIAN'],
  },
  grn: {
    type: 'grn', path: '/goods-received-notes', listTitle: 'Goods Received Notes', newLabel: 'New Goods Received Note',
    formTitle: 'New Goods Received Note', editTitle: 'Edit Goods Received Note', prefix: 'GRN', numberHeader: 'GRN No.',
    referenceLabel: 'PO Reference', statuses: ['Draft', 'Received', 'Closed'], empty: 'No goods received notes found.',
    pdfTitle: ['GOODS RECEIVED NOTE', 'NOTA PENERIMAAN BARANG'],
  },
  bill: {
    type: 'bill', path: '/bills', listTitle: 'Bills', newLabel: 'New Bill',
    formTitle: 'New Bill', editTitle: 'Edit Bill', prefix: 'BILL', numberHeader: 'Bill No.',
    referenceLabel: 'Reference No.', statuses: ['Draft', 'Unpaid', 'Paid'], empty: 'No bills found.',
    pdfTitle: ['BILL', 'BIL'],
  },
  credit_note: {
    type: 'credit_note', path: '/credit-notes', listTitle: 'Credit Notes', newLabel: 'New Credit Note',
    formTitle: 'New Credit Note', editTitle: 'Edit Credit Note', prefix: 'CN', numberHeader: 'CN No.',
    referenceLabel: 'Bill Reference', statuses: ['Draft', 'Approved', 'Closed'], empty: 'No credit notes found.',
    pdfTitle: ['CREDIT NOTE', 'NOTA KREDIT'],
  },
  payment: {
    type: 'payment', path: '/purchase-payments', listTitle: 'Payments', newLabel: 'New Payment',
    formTitle: 'New Payment', editTitle: 'Edit Payment', prefix: 'PAY', numberHeader: 'Payment No.',
    referenceLabel: 'Bill Reference', statuses: ['Draft', 'Pending', 'Paid'], empty: 'No payments found.',
    pdfTitle: ['PAYMENT VOUCHER', 'BAUCAR BAYARAN'],
  },
  refund: {
    type: 'refund', path: '/refunds', listTitle: 'Refunds', newLabel: 'New Refund',
    formTitle: 'New Refund', editTitle: 'Edit Refund', prefix: 'RF', numberHeader: 'Refund No.',
    referenceLabel: 'Reference No.', statuses: ['Draft', 'Pending', 'Approved', 'Closed'], empty: 'No refunds found.',
    pdfTitle: ['REFUND', 'BAYARAN BALIK'],
  },
};

export type Line = { id: string; item: string; account: string; qty: number; price: number; discount: number; tax: number };
export type Term = { id: string; term: string; dueOn: string; amount: number; description: string };

export type PurchaseData = {
  showShipping: boolean; shippingInfo: string;
  billingAttention: string; shippingAttention: string; billingAddress: string; shippingAddress: string;
  description: string; internalNote: string; title: string;
  taxMode: 'inclusive' | 'exclusive'; lines: Line[]; rounding: boolean; terms: Term[]; remarks: string;
};

/** Totals: line tax is a % rate on (amount − discount). Inclusive mode means prices already include tax. */
export function calcTotals(d: Pick<PurchaseData, 'lines' | 'taxMode' | 'rounding'>) {
  const subTotal = d.lines.reduce((s, l) => s + (l.qty || 0) * (l.price || 0), 0);
  const discount = d.lines.reduce((s, l) => s + (l.discount || 0), 0);
  const tax = d.lines.reduce((s, l) => {
    const net = (l.qty || 0) * (l.price || 0) - (l.discount || 0);
    const r = (l.tax || 0) / 100;
    return s + (d.taxMode === 'inclusive' ? net - net / (1 + r) : net * r);
  }, 0);
  const raw = Math.max(0, subTotal - discount + (d.taxMode === 'inclusive' ? 0 : tax));
  const total = d.rounding ? Math.round(raw * 20) / 20 : raw;
  return { subTotal, discount, tax, rounding: total - raw, total };
}

const tone: Record<string, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Sent: 'bg-primary/10 text-primary',
  Received: 'bg-primary/10 text-primary',
  Paid: 'bg-primary/10 text-primary',
  Ready: 'bg-primary/10 text-primary',
  Unpaid: 'bg-destructive/10 text-destructive',
  Overdue: 'bg-destructive/10 text-destructive',
  Closed: 'bg-muted text-muted-foreground',
  Approved: 'bg-primary/10 text-primary',
  Pending: 'bg-secondary text-secondary-foreground',
  'Pending Approval': 'bg-secondary text-secondary-foreground',
};

export function statusBadge(status: string): ReactNode {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone[status] || 'bg-muted text-muted-foreground'}`}>
      <StatusLabel s={status} />
    </span>
  );
}

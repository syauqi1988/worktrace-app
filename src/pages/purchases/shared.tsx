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

const tone: Record<string, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Sent: 'bg-primary/10 text-primary',
  Received: 'bg-primary/10 text-primary',
  Paid: 'bg-primary/10 text-primary',
  Unpaid: 'bg-destructive/10 text-destructive',
  Overdue: 'bg-destructive/10 text-destructive',
  Closed: 'bg-muted text-muted-foreground',
  Approved: 'bg-primary/10 text-primary',
  Pending: 'bg-secondary text-secondary-foreground',
};

export function statusBadge(status: string): ReactNode {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone[status] || 'bg-muted text-muted-foreground'}`}>
      <StatusLabel s={status} />
    </span>
  );
}

import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MilestoneInvoice {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  due_date: string | null;
  paid_date?: string | null;
  milestone_stage_number: number | null;
  milestone_total_stages: number | null;
  milestone_stages?: any;
}

interface Props {
  invoices: MilestoneInvoice[];
}

export function JobMilestoneTracker({ invoices }: Props) {
  const navigate = useNavigate();
  if (!invoices.length) return null;

  const sorted = [...invoices].sort(
    (a, b) => (a.milestone_stage_number || 0) - (b.milestone_stage_number || 0)
  );

  const paidCount = sorted.filter((s) => s.status === 'Paid').length;
  const totalSum = sorted.reduce((a, s) => a + (Number(s.total) || 0), 0);
  const paidSum = sorted
    .filter((s) => s.status === 'Paid')
    .reduce((a, s) => a + (Number(s.total) || 0), 0);
  const progress = totalSum > 0 ? (paidSum / totalSum) * 100 : 0;

  const plan = (sorted[0]?.milestone_stages as Array<{ label: string }>) || [];

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Peringkat Pembayaran
        </p>
        <span className="text-xs text-muted-foreground">
          {paidCount} / {sorted.length} dibayar
        </span>
      </div>

      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div className="bg-green-600 h-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-green-700 font-medium">Dibayar: RM {paidSum.toFixed(2)}</span>
        <span className="text-muted-foreground">Total: RM {totalSum.toFixed(2)}</span>
      </div>

      <div className="space-y-1.5">
        {sorted.map((s, idx) => {
          const isPaid = s.status === 'Paid';
          const isOverdue =
            !isPaid && s.due_date && new Date(s.due_date) < new Date(new Date().toDateString());
          const prev = sorted[idx - 1];
          const isLocked = prev && prev.status !== 'Paid' && !isPaid;
          const label = plan[idx]?.label || `Peringkat ${s.milestone_stage_number}`;
          return (
            <button
              key={s.id}
              onClick={() => navigate(`/invoices/${s.id}`)}
              className={cn(
                'w-full flex items-center gap-2 rounded-lg border p-2 text-left transition-colors border-border hover:bg-accent',
                isPaid && 'opacity-80'
              )}
            >
              <div className="shrink-0">
                {isPaid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : isOverdue ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : isLocked ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Clock className="h-4 w-4 text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-foreground">
                    Peringkat {s.milestone_stage_number}/{s.milestone_total_stages}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{label}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-foreground">
                    RM {Number(s.total).toFixed(2)}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                      isPaid
                        ? 'bg-green-100 text-green-700'
                        : isOverdue
                        ? 'bg-red-100 text-red-700'
                        : isLocked
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-blue-100 text-blue-700'
                    )}
                  >
                    {isPaid ? 'Paid' : isOverdue ? 'Overdue' : isLocked ? 'Locked' : s.status}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

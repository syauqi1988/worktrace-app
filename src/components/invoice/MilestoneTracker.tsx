import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Clock, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SiblingInvoice {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  due_date: string | null;
  paid_date: string | null;
  milestone_stage_number: number | null;
  milestone_total_stages: number | null;
  milestone_stages: any;
}

interface Props {
  invoiceId: string;
  jobId: string;
  userId: string;
}

export function MilestoneTracker({ invoiceId, jobId, userId }: Props) {
  const navigate = useNavigate();
  const [siblings, setSiblings] = useState<SiblingInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total, due_date, paid_date, milestone_stage_number, milestone_total_stages, milestone_stages')
        .eq('job_id', jobId)
        .eq('user_id', userId)
        .not('milestone_stage_number', 'is', null)
        .order('milestone_stage_number', { ascending: true });
      if (!active) return;
      setSiblings((data as any) || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [jobId, userId]);

  if (loading || siblings.length <= 1) return null;

  const paidCount = siblings.filter((s) => s.status === 'Paid').length;
  const totalSum = siblings.reduce((a, s) => a + (Number(s.total) || 0), 0);
  const paidSum = siblings.filter((s) => s.status === 'Paid').reduce((a, s) => a + (Number(s.total) || 0), 0);
  const progress = totalSum > 0 ? (paidSum / totalSum) * 100 : 0;

  const plan = (siblings[0].milestone_stages as Array<{ label: string }>) || [];

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Peringkat Pembayaran</p>
        <span className="text-xs text-muted-foreground">{paidCount} / {siblings.length} dibayar</span>
      </div>

      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div className="bg-green-600 h-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-green-700 font-medium">Dibayar: RM {paidSum.toFixed(2)}</span>
        <span className="text-muted-foreground">Total: RM {totalSum.toFixed(2)}</span>
      </div>

      <div className="space-y-1.5">
        {siblings.map((s, idx) => {
          const isCurrent = s.id === invoiceId;
          const isPaid = s.status === 'Paid';
          const isOverdue = !isPaid && s.due_date && new Date(s.due_date) < new Date(new Date().toDateString());
          const prev = siblings[idx - 1];
          const isLocked = prev && prev.status !== 'Paid' && !isPaid;
          const label = plan[idx]?.label || `Peringkat ${s.milestone_stage_number}`;
          return (
            <button
              key={s.id}
              onClick={() => !isCurrent && navigate(`/invoices/${s.id}`)}
              disabled={isCurrent}
              className={cn(
                'w-full flex items-center gap-2 rounded-lg border p-2 text-left transition-colors',
                isCurrent ? 'border-primary bg-primary/5 cursor-default' : 'border-border hover:bg-accent',
                isPaid && !isCurrent && 'opacity-80',
              )}
            >
              <div className="shrink-0">
                {isPaid ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                 isOverdue ? <AlertCircle className="h-4 w-4 text-red-600" /> :
                 isLocked ? <Lock className="h-4 w-4 text-muted-foreground" /> :
                 <Clock className="h-4 w-4 text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-foreground">Peringkat {s.milestone_stage_number}/{s.milestone_total_stages}</span>
                  <span className="text-xs text-muted-foreground truncate">{label}</span>
                  {isCurrent && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">Semasa</span>}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-foreground">RM {Number(s.total).toFixed(2)}</span>
                  <span className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                    isPaid ? 'bg-green-100 text-green-700' :
                    isOverdue ? 'bg-red-100 text-red-700' :
                    isLocked ? 'bg-slate-100 text-slate-600' :
                    'bg-blue-100 text-blue-700',
                  )}>{isPaid ? 'Dibayar' : isOverdue ? 'Lewat' : isLocked ? 'Terkunci' : s.status}</span>
                </div>
              </div>
              {!isCurrent && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

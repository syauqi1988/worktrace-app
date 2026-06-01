import { Check, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getJobType, type JobType, type WorkflowStepKey } from '@/lib/jobTypes';

interface Props {
  jobType: JobType;
  /** Set of step keys considered completed for this job (caller computes from existing docs). */
  completed?: Set<WorkflowStepKey>;
  /** Current active step (highlighted). */
  active?: WorkflowStepKey;
  lang?: 'ms' | 'en';
}

export function WorkflowBar({ jobType, completed, active, lang = 'ms' }: Props) {
  const def = getJobType(jobType);
  const done = completed ?? new Set();

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {def.steps.map((s, i) => {
        const isDone = done.has(s.key);
        const isActive = active === s.key;
        const isRepeat = !!s.repeats;
        return (
          <div key={`${s.key}-${i}`} className="flex items-center gap-1.5">
            <div
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border whitespace-nowrap',
                isDone && 'bg-emerald-50 border-emerald-200 text-emerald-700',
                !isDone && isActive && 'bg-blue-50 border-blue-300 text-blue-700 font-medium',
                !isDone && !isActive && 'bg-slate-50 border-slate-200 text-slate-400'
              )}
            >
              {isDone ? <Check className="h-3 w-3" /> : isRepeat ? <RotateCw className="h-3 w-3" /> : null}
              {lang === 'en' ? s.labelEn : s.labelMs}
            </div>
            {i < def.steps.length - 1 && (
              <span className="text-slate-300 text-xs select-none">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

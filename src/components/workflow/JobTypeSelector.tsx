import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JOB_TYPES, JOB_TYPE_COLOR_CLASSES, type JobType } from '@/lib/jobTypes';

interface Props {
  value: JobType;
  onChange: (v: JobType) => void;
  lang?: 'ms' | 'en';
}

export function JobTypeSelector({ value, onChange, lang = 'ms' }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {JOB_TYPES.map((t, i) => {
        const c = JOB_TYPE_COLOR_CLASSES[t.color];
        const selected = value === t.id;
        // Last (5th) card spans both columns
        const isLast = i === JOB_TYPES.length - 1;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              'relative text-left rounded-xl border-2 p-3 transition-all',
              isLast && 'col-span-2',
              selected
                ? `${c.border} ${c.bg}`
                : 'border-slate-200 bg-white hover:border-slate-300'
            )}
          >
            {selected && (
              <span className={cn('absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center', c.border, c.bg)}>
                <Check className={cn('h-3.5 w-3.5', c.text)} />
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">{t.icon}</span>
              <span className={cn('font-semibold text-sm', selected ? c.text : 'text-foreground')}>
                {lang === 'en' ? t.nameEn : t.nameMs}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              {lang === 'en' ? t.taglineEn : t.taglineMs}
            </p>
          </button>
        );
      })}
    </div>
  );
}

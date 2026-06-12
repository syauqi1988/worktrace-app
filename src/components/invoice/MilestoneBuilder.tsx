import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { MILESTONE_TEMPLATES, TRIGGER_OPTIONS, type MilestoneTrigger, getTemplate } from '@/lib/milestoneTemplates';
import { cn } from '@/lib/utils';

export interface MilestoneStage {
  label: string;
  percentage: number;
  amount: number;
  trigger: MilestoneTrigger;
  due_date?: string | null;
}

interface Props {
  total: number;
  value: MilestoneStage[];
  onChange: (stages: MilestoneStage[]) => void;
  defaultTemplate?: string;
}

export function MilestoneBuilder({ total, value, onChange, defaultTemplate = '30/40/30' }: Props) {
  const [mode, setMode] = useState<'pct' | 'amt'>('pct');
  const [tplKey, setTplKey] = useState<string>(defaultTemplate);

  // Initialize from template if empty
  useEffect(() => {
    if (value.length === 0) {
      applyTemplate(defaultTemplate);
    }
    // eslint-disable-next-line
  }, []);

  const applyTemplate = (key: string) => {
    setTplKey(key);
    const tpl = getTemplate(key);
    const stages: MilestoneStage[] = tpl.stages.map((s) => ({
      label: s.labelMs,
      percentage: s.percentage,
      amount: round2((s.percentage / 100) * total),
      trigger: s.trigger,
      due_date: null,
    }));
    onChange(stages);
  };

  // Recompute amounts whenever total changes
  useEffect(() => {
    if (value.length === 0) return;
    const next = value.map((s) => ({ ...s, amount: round2((s.percentage / 100) * total) }));
    if (JSON.stringify(next) !== JSON.stringify(value)) onChange(next);
    // eslint-disable-next-line
  }, [total]);

  const sumPct = useMemo(() => round2(value.reduce((a, s) => a + (Number(s.percentage) || 0), 0)), [value]);
  const sumAmt = useMemo(() => round2(value.reduce((a, s) => a + (Number(s.amount) || 0), 0)), [value]);
  const valid = Math.abs(sumPct - 100) < 0.01;

  const updateStage = (i: number, patch: Partial<MilestoneStage>) => {
    const next = value.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    // Auto-balance: if editing pct of non-last row, recompute last row pct
    if ('percentage' in patch && i < next.length - 1) {
      const othersPct = next.slice(0, -1).reduce((a, s) => a + (Number(s.percentage) || 0), 0);
      next[next.length - 1] = { ...next[next.length - 1], percentage: round2(100 - othersPct) };
    }
    if ('amount' in patch && total > 0) {
      // derive pct from amount
      const pct = round2(((patch.amount as number) / total) * 100);
      next[i] = { ...next[i], percentage: pct };
      if (i < next.length - 1) {
        const othersPct = next.slice(0, -1).reduce((a, s) => a + (Number(s.percentage) || 0), 0);
        next[next.length - 1] = { ...next[next.length - 1], percentage: round2(100 - othersPct) };
      }
    }
    // recompute amounts from pct
    const synced = next.map((s) => ({ ...s, amount: round2((s.percentage / 100) * total) }));
    onChange(synced);
  };

  const addStage = () => {
    const next = [...value, { label: `Peringkat ${value.length + 1}`, percentage: 0, amount: 0, trigger: 'mid_progress' as MilestoneTrigger, due_date: null }];
    onChange(next);
  };
  const removeStage = (i: number) => {
    if (value.length <= 1) return;
    onChange(value.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3 bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-semibold text-foreground">Milestone Payment</p>
        <div className="flex bg-muted rounded-md overflow-hidden text-xs">
          <button type="button" onClick={() => setMode('pct')} className={cn('px-2.5 py-1 font-medium', mode === 'pct' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>%</button>
          <button type="button" onClick={() => setMode('amt')} className={cn('px-2.5 py-1 font-medium', mode === 'amt' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>RM</button>
        </div>
      </div>

      <div>
        <Label className="text-xs">Template</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {MILESTONE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.key}
              type="button"
              onClick={() => applyTemplate(tpl.key)}
              className={cn('text-xs px-2.5 py-1 rounded-full border', tplKey === tpl.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:bg-accent')}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {value.map((s, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-start bg-background rounded-lg border border-border p-2">
            <div className="col-span-12 md:col-span-4 space-y-1">
              <Label className="text-[10px] text-muted-foreground">Label</Label>
              <Input value={s.label} onChange={(e) => updateStage(i, { label: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="col-span-4 md:col-span-2 space-y-1">
              <Label className="text-[10px] text-muted-foreground">{mode === 'pct' ? '%' : 'RM'}</Label>
              {mode === 'pct' ? (
                <Input type="number" min={0} max={100} step="0.01" value={s.percentage || ''} onChange={(e) => updateStage(i, { percentage: Number(e.target.value) || 0 })} className="h-8 text-sm" />
              ) : (
                <Input type="number" min={0} step="0.01" value={s.amount || ''} onChange={(e) => updateStage(i, { amount: Number(e.target.value) || 0 })} className="h-8 text-sm" />
              )}
            </div>
            <div className="col-span-8 md:col-span-2 space-y-1">
              <Label className="text-[10px] text-muted-foreground">Amount</Label>
              <div className="h-8 px-2 flex items-center text-xs font-medium bg-muted rounded-md">RM {(s.amount || 0).toFixed(2)}</div>
            </div>
            <div className="col-span-10 md:col-span-3 space-y-1">
              <Label className="text-[10px] text-muted-foreground">Trigger</Label>
              <select value={s.trigger} onChange={(e) => updateStage(i, { trigger: e.target.value as MilestoneTrigger })} className="h-8 w-full text-xs border border-input rounded-md bg-background px-2">
                {TRIGGER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.labelMs}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-1 flex items-end justify-end h-full">
              <button type="button" onClick={() => removeStage(i)} disabled={value.length <= 1} className="text-muted-foreground hover:text-destructive disabled:opacity-30 p-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addStage} className="gap-1 text-xs"><Plus className="h-3.5 w-3.5" /> Add Stage</Button>

      <div className={cn('flex items-center justify-between gap-2 rounded-lg p-2 text-xs font-medium border', valid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700')}>
        <div className="flex items-center gap-1.5">
          {valid ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>Total: {sumPct.toFixed(2)}% — RM {sumAmt.toFixed(2)}</span>
        </div>
        <span>Invoice total: RM {total.toFixed(2)}</span>
      </div>
    </div>
  );
}

function round2(n: number) { return Math.round(n * 100) / 100; }

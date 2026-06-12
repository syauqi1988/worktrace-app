import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface DeductionItem {
  id: string;
  name: string;
  type: 'fixed' | 'percentage';
  value: number;
}

interface Props {
  value: DeductionItem[];
  onChange: (next: DeductionItem[]) => void;
  /** Used to compute % preview only */
  subtotalForPreview?: number;
}

function newRow(): DeductionItem {
  return { id: crypto.randomUUID(), name: '', type: 'fixed', value: 0 };
}

/** Compute total reduction in RM given current subtotal */
export function computeDeductionsTotal(list: DeductionItem[] | undefined | null, subtotal: number): number {
  if (!Array.isArray(list) || list.length === 0) return 0;
  return list.reduce((sum, d) => {
    const v = Number(d.value) || 0;
    if (d.type === 'percentage') return sum + (subtotal * v) / 100;
    return sum + v;
  }, 0);
}

export default function DeductionItemsSection({ value, onChange, subtotalForPreview = 0 }: Props) {
  const list = Array.isArray(value) ? value : [];

  const update = (id: string, patch: Partial<DeductionItem>) => {
    onChange(list.map(d => (d.id === id ? { ...d, ...patch } : d)));
  };
  const remove = (id: string) => onChange(list.filter(d => d.id !== id));
  const add = () => onChange([...list, newRow()]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Potongan / Diskaun</Label>
        {list.length > 0 && (
          <span className="text-xs text-muted-foreground">{list.length} potongan</span>
        )}
      </div>

      {list.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Tambah potongan seperti deposit dibayar, diskaun promosi, dll.
        </p>
      )}

      <div className="space-y-2">
        {list.map(d => {
          const amount = d.type === 'percentage'
            ? (subtotalForPreview * (Number(d.value) || 0)) / 100
            : (Number(d.value) || 0);
          return (
            <div key={d.id} className="grid grid-cols-[1fr_auto_110px_36px] gap-2 items-center">
              <Input
                value={d.name}
                onChange={e => update(d.id, { name: e.target.value })}
                placeholder="Nama potongan (cth. Deposit Pertama)"
                className="text-sm"
                maxLength={80}
              />
              <div className="flex bg-muted rounded-md overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => update(d.id, { type: 'fixed' })}
                  className={cn('px-2.5 py-1 font-medium', d.type === 'fixed' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                >
                  RM
                </button>
                <button
                  type="button"
                  onClick={() => update(d.id, { type: 'percentage' })}
                  className={cn('px-2.5 py-1 font-medium', d.type === 'percentage' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                >
                  %
                </button>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={d.value || ''}
                  onChange={e => update(d.id, { value: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="text-sm pr-8 text-right"
                />
                {d.type === 'percentage' && amount > 0 && (
                  <span className="absolute -bottom-4 right-0 text-[10px] text-muted-foreground">
                    −RM {amount.toFixed(2)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(d.id)}
                className="flex items-center justify-center h-9 text-muted-foreground hover:text-destructive"
                aria-label="Buang potongan"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5 rounded-lg text-xs mt-2">
        <Plus className="h-3.5 w-3.5" /> Tambah Potongan
      </Button>
    </div>
  );
}

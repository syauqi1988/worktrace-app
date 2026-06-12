import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Package } from 'lucide-react';
import { ProductPicker } from '@/components/ProductPicker';

export interface JobProductItem {
  description: string;
  description_detail?: string;
  qty: number;
  uom?: string;
  unit_price: number;
}

interface Props {
  items: JobProductItem[];
  onChange: (items: JobProductItem[]) => void;
}

/**
 * Compact product list editor used inside Job & Preset forms.
 * Stores structured product data (jsonb) so it can auto-fill quotations later.
 * Visually adapted from the quotation items section.
 */
export function JobProductsEditor({ items, onChange }: Props) {
  const update = (i: number, field: keyof JobProductItem, value: string | number) => {
    onChange(items.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const addBlank = () =>
    onChange([...items, { description: '', description_detail: '', qty: 1, uom: 'unit', unit_price: 0 }]);
  const applyProduct = (i: number, p: { description: string; description_detail: string; unit_price: number; uom: string }) => {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  };
  const addFromProduct = (p: { description: string; description_detail: string; unit_price: number; uom: string }) =>
    onChange([...items, { ...p, qty: 1 }]);

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <div className="bg-muted/40 border border-dashed border-border rounded-lg p-4 text-center">
          <Package className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">Tiada produk. Tambah dari senarai produk anda.</p>
        </div>
      )}

      {items.map((it, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-start gap-2">
            <ProductPicker onPick={(p) => applyProduct(i, p)} />
            <div className="flex-1 space-y-1.5">
              <Input
                value={it.description}
                onChange={(e) => update(i, 'description', e.target.value)}
                placeholder="Nama produk / item"
                className="text-sm"
              />
              <Textarea
                value={it.description_detail || ''}
                onChange={(e) => update(i, 'description_detail', e.target.value)}
                placeholder="Butiran tambahan (pilihan)"
                rows={2}
                className="text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-muted-foreground hover:text-destructive p-1.5"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Kuantiti</label>
              <Input
                type="number" min={0}
                value={it.qty || ''}
                onChange={(e) => update(i, 'qty', e.target.value === '' ? 0 : Number(e.target.value))}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">UOM</label>
              <Input
                value={it.uom || ''}
                onChange={(e) => update(i, 'uom', e.target.value)}
                placeholder="unit"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Harga (RM)</label>
              <Input
                type="number" min={0} step="0.01"
                value={it.unit_price || ''}
                onChange={(e) => update(i, 'unit_price', Number(e.target.value) || 0)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <div className="flex-1">
          <ProductPicker onPick={addFromProduct} />
        </div>
        <button
          type="button"
          onClick={addBlank}
          className="flex-1 flex items-center justify-center gap-1 h-10 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:text-primary hover:border-primary"
        >
          <Plus className="h-4 w-4" /> Tambah Baris Kosong
        </button>
      </div>
    </div>
  );
}

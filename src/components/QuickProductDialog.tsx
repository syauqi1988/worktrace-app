import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useL } from '@/i18n/dual';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export const UOM_OPTIONS = ['Unit', 'Set', 'Lot', 'Meter', 'Kaki', 'Jam', 'Hari', 'Bulan'];

export interface NewProductResult {
  description: string;
  description_detail: string;
  unit_price: number;
  uom: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (p: NewProductResult) => void;
}

/** Reusable "add new product" popup used from every item row (via ProductPicker). */
export default function QuickProductDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const l = useL();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('');
  const [uom, setUom] = useState('Unit');
  const [price, setPrice] = useState<number | ''>('');
  const [saveToCatalog, setSaveToCatalog] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(''); setName(''); setDesc(''); setCategory(''); setUom('Unit'); setPrice(''); setSaveToCatalog(true);
  }, [open]);

  const save = async () => {
    if (!user) return;
    if (!name.trim()) { toast.error(l('Item name is required', 'Nama item diperlukan')); return; }
    if (price === '') { toast.error(l('Price is required', 'Harga diperlukan')); return; }
    const unitPrice = Number(price) || 0;
    setSaving(true);
    try {
      if (saveToCatalog) {
        const { error } = await supabase.from('products' as any).insert({
          user_id: user.id, code: code.trim() || null, name: name.trim(),
          description: desc.trim() || null, category: category.trim() || null,
          unit_price: unitPrice, uom, is_active: true,
        } as any);
        if (error) throw error;
        toast.success(l('Product saved to catalog', 'Produk disimpan ke katalog'));
      }
      onCreated({ description: name.trim(), description_detail: desc.trim(), unit_price: unitPrice, uom });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || l('Failed to save product', 'Gagal simpan produk'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{l('Add New Product', 'Tambah Produk Baru')}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{l('Code', 'Kod')}</Label>
              <Input value={code} onChange={e => setCode(e.target.value)} placeholder={l('Optional', 'Pilihan')} maxLength={40} />
            </div>
            <div className="space-y-1.5">
              <Label>{l('Category', 'Kategori')}</Label>
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder={l('Optional', 'Pilihan')} maxLength={60} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{l('Item / service name', 'Nama item / perkhidmatan')} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} maxLength={120} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>{l('Description', 'Penerangan')}</Label>
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} maxLength={500} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>UOM</Label>
              <select value={uom} onChange={e => setUom(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
                {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{l('Price (RM)', 'Harga (RM)')} *</Label>
              <Input type="number" inputMode="decimal" min={0} step="0.01" value={price}
                onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={saveToCatalog} onChange={e => setSaveToCatalog(e.target.checked)} className="h-4 w-4 rounded border-input" />
            {l('Save to product catalog', 'Simpan ke katalog produk')}
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{l('Cancel', 'Batal')}</Button>
          <Button onClick={save} disabled={saving}>{saving ? l('Saving...', 'Menyimpan...') : l('Add to Document', 'Tambah ke Dokumen')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

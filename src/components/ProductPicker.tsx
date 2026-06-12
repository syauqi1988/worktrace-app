import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Package, Search, Plus, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PickedProduct {
  description: string;
  description_detail: string;
  unit_price: number;
  uom: string;
}

interface Product {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  category: string | null;
  unit_price: number;
  uom: string | null;
}

const UOM_OPTIONS = ['Unit', 'Set', 'Lot', 'Meter', 'Kaki', 'Jam', 'Hari', 'Bulan'];

export function ProductPicker({ onPick }: { onPick: (p: PickedProduct) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'new'>('list');

  // New product form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUom, setNewUom] = useState('Unit');
  const [newPrice, setNewPrice] = useState<number | ''>('');
  const [saveToCatalog, setSaveToCatalog] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProducts = () => {
    if (!user) return;
    setLoading(true);
    supabase.from('products' as any)
      .select('id, code, name, description, category, unit_price, uom')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        setItems((data as any) || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!open || !user) return;
    loadProducts();
    setView('list');
    setSearch('');
  }, [open, user]);

  const filtered = search.trim()
    ? items.filter(p => {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.code || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
        );
      })
    : items;

  const resetNew = () => {
    setNewName('');
    setNewDesc('');
    setNewUom('Unit');
    setNewPrice('');
    setSaveToCatalog(true);
  };

  const handleSubmitNew = async () => {
    if (!user) return;
    if (!newName.trim()) {
      toast.error('Nama item diperlukan');
      return;
    }
    const price = Number(newPrice) || 0;
    setSaving(true);
    try {
      if (saveToCatalog) {
        const { error } = await supabase.from('products' as any).insert({
          user_id: user.id,
          name: newName.trim(),
          description: newDesc.trim() || null,
          unit_price: price,
          uom: newUom,
          is_active: true,
        } as any);
        if (error) throw error;
        toast.success('Produk disimpan ke katalog');
      }
      onPick({
        description: newName.trim(),
        description_detail: newDesc.trim(),
        unit_price: price,
        uom: newUom,
      });
      resetNew();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Gagal simpan produk');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Pilih dari Produk"
          className="flex items-center justify-center h-10 w-10 rounded-md border border-input bg-background text-muted-foreground hover:text-primary hover:border-primary"
        >
          <Package className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        {view === 'list' && (
          <>
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari produk..."
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {loading && <p className="px-3 py-2 text-sm text-muted-foreground">Memuatkan...</p>}
              {!loading && filtered.length === 0 && (
                <p className="px-3 py-3 text-sm text-muted-foreground text-center">Tiada produk dijumpai.</p>
              )}
              {!loading && filtered.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onPick({
                      description: p.name,
                      description_detail: p.description || '',
                      unit_price: Number(p.unit_price) || 0,
                      uom: p.uom || '',
                    });
                    setOpen(false);
                    setSearch('');
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-accent border-b border-border last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                    <span className="text-xs font-semibold text-primary shrink-0">RM {Number(p.unit_price).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {p.code && <span>{p.code}</span>}
                    {p.uom && <span>· {p.uom}</span>}
                    {p.category && <span>· {p.category}</span>}
                  </div>
                </button>
              ))}
            </div>
            <div className="p-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={() => setView('new')}
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Produk Baru
              </Button>
            </div>
          </>
        )}

        {view === 'new' && (
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setView('list')} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold">Produk Baru</p>
            </div>
            <div className="space-y-2">
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nama item / perkhidmatan *"
                className="h-9 text-sm"
                autoFocus
                maxLength={120}
              />
              <Input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Penerangan (pilihan)"
                className="h-9 text-sm"
                maxLength={200}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newUom}
                  onChange={e => setNewUom(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Harga (RM) *"
                  className="h-9 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToCatalog}
                  onChange={e => setSaveToCatalog(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Simpan ke katalog produk
              </label>
            </div>
            <Button
              type="button"
              onClick={handleSubmitNew}
              disabled={saving}
              className="w-full h-9 text-sm"
            >
              {saving ? 'Menyimpan...' : 'Tambah ke Dokumen'}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

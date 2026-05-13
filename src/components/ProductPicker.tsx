import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Package, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export function ProductPicker({ onPick }: { onPick: (p: PickedProduct) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
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
        <div className="max-h-72 overflow-y-auto">
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
      </PopoverContent>
    </Popover>
  );
}

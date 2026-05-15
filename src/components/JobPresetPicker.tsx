import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Briefcase, Search, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PickedPreset {
  name: string;
  title: string;
  category: string;
  description: string;
  notes: string;
}

interface Preset {
  id: string;
  name: string;
  title: string;
  category: string;
  description: string | null;
  notes: string | null;
}

export function JobPresetPicker({ onPick }: { onPick: (p: PickedPreset) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Preset[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase.from('job_presets' as any)
      .select('id, name, title, category, description, notes')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        setItems(((data as any) || []) as Preset[]);
        setLoading(false);
      });
  }, [open, user]);

  const filtered = search.trim()
    ? items.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
        );
      })
    : items;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between h-10 rounded-md border border-input bg-background px-3 text-sm text-left hover:border-primary text-muted-foreground"
        >
          <span className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Pilih dari Preset Kerja
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari preset..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading && <p className="px-3 py-2 text-sm text-muted-foreground">Memuatkan...</p>}
          {!loading && filtered.length === 0 && (
            <p className="px-3 py-3 text-sm text-muted-foreground text-center">
              Tiada preset. Tambah di menu "Preset Kerja".
            </p>
          )}
          {!loading && filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onPick({
                  name: p.name,
                  title: p.title,
                  category: p.category || 'Other',
                  description: p.description || '',
                  notes: p.notes || '',
                });
                setOpen(false);
                setSearch('');
              }}
              className="w-full px-3 py-2 text-left hover:bg-accent border-b border-border last:border-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                <span className="text-[10px] font-medium text-primary shrink-0">{p.category}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{p.title}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

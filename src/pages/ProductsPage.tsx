import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Package, Plus, Search, Edit2, Trash2, Tag, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

type Product = {
  id: string;
  user_id: string;
  code: string | null;
  name: string;
  description: string | null;
  category: string | null;
  unit_price: number;
  uom: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const UOM_GROUPS: { label: string; items: { value: string; hint: string }[] }[] = [
  {
    label: 'Perkhidmatan & Masa',
    items: [
      { value: 'unit', hint: 'unit tunggal' },
      { value: 'jam', hint: 'per jam' },
      { value: 'hari', hint: 'per hari' },
      { value: 'trip', hint: 'per kunjungan' },
      { value: 'kontrak', hint: 'pakej kontrak' },
    ],
  },
  {
    label: 'Ukuran Fizikal',
    items: [
      { value: 'meter', hint: 'meter linear' },
      { value: 'kaki', hint: 'kaki linear' },
      { value: 'm²', hint: 'meter persegi' },
      { value: 'kaki²', hint: 'kaki persegi' },
      { value: 'kg', hint: 'kilogram' },
      { value: 'tan', hint: 'tan metrik' },
    ],
  },
  {
    label: 'Pembungkusan',
    items: [
      { value: 'set', hint: 'satu set' },
      { value: 'lot', hint: 'satu lot' },
      { value: 'pasang', hint: 'per pasang' },
      { value: 'kotak', hint: 'per kotak' },
      { value: 'beg', hint: 'per beg' },
      { value: 'tin', hint: 'per tin' },
      { value: 'roll', hint: 'per roll' },
      { value: 'helai', hint: 'per helai' },
    ],
  },
];

const CATEGORY_PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
];

function categoryClasses(name: string | null): string {
  if (!name) return 'bg-muted text-muted-foreground';
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length];
}

const fmtMYR = (n: number) =>
  new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

type FormState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  category: string;
  unit_price: string;
  uom: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  code: '', name: '', description: '', category: '',
  unit_price: '', uom: 'unit', is_active: true,
};

export default function ProductsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Product[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (statusFilter === 'active' && !p.is_active) return false;
      if (statusFilter === 'inactive' && p.is_active) return false;
      if (categoryFilter) {
        if (categoryFilter === '__none__') {
          if (p.category) return false;
        } else if (p.category !== categoryFilter) return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.code ?? '').toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((p) => p.is_active).length;
    const cats = new Set(items.map((p) => p.category).filter(Boolean)).size;
    const latest = items[0]?.created_at;
    return { total, active, cats, latest };
  }, [items]);

  const openCreate = () => { setForm(emptyForm); setErrors({}); setOpen(true); };
  const openEdit = (p: Product) => {
    setForm({
      id: p.id, code: p.code ?? '', name: p.name, description: p.description ?? '',
      category: p.category ?? '', unit_price: String(p.unit_price ?? 0),
      uom: p.uom || 'unit', is_active: p.is_active,
    });
    setErrors({});
    setOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nama produk diperlukan';
    if (form.unit_price === '' || isNaN(Number(form.unit_price)) || Number(form.unit_price) < 0)
      e.unit_price = 'Harga diperlukan';
    if (!form.uom.trim()) e.uom = 'UOM diperlukan';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!user) return;
    if (!validate()) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      code: form.code.trim() || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      unit_price: Number(form.unit_price),
      uom: form.uom.trim(),
      is_active: form.is_active,
    };
    const q = form.id
      ? supabase.from('products').update(payload).eq('id', form.id)
      : supabase.from('products').insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('✓ Produk berjaya disimpan');
    setOpen(false);
    load();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', confirmDelete.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Produk telah dipadam');
    setConfirmDelete(null);
    load();
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Katalog Produk &amp; Perkhidmatan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Senarai item dan perkhidmatan yang boleh dipilih dalam Sebut Harga dan Invois
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-lg">
          <Plus className="h-4 w-4 mr-1" /> Tambah Produk
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Jumlah Produk" value={stats.total} />
        <StatCard label="Aktif" value={stats.active} />
        <StatCard label="Kategori" value={stats.cats} />
        <StatCard
          label="Terbaru"
          value={stats.latest ? new Date(stats.latest).toLocaleDateString('ms-MY') : '—'}
        />
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kod, atau kategori..."
            className="pl-9"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="__none__">Tidak Berkategori</option>
        </select>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-medium ${
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent'
              }`}
            >
              {s === 'all' ? 'Semua' : s === 'active' ? 'Aktif' : 'Tidak Aktif'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Memuatkan...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? 'Belum ada produk. Klik "Tambah Produk" untuk mula.'
              : 'Tiada produk yang sepadan dengan tapisan.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-foreground/20 transition relative flex flex-col"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${categoryClasses(p.category)}`}>
                  <Tag className="inline h-2.5 w-2.5 mr-1" />
                  {p.category || 'Umum'}
                </span>
                {p.code && (
                  <span className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">
                    {p.code}
                  </span>
                )}
              </div>

              <h3 className="text-base font-semibold text-foreground leading-tight">
                {p.name}
                {!p.is_active && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">(tidak aktif)</span>
                )}
              </h3>
              {p.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line">
                  {p.description}
                </p>
              )}

              <div className="border-t border-border my-3" />

              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-primary">RM {fmtMYR(p.unit_price)}</span>
                <span className="text-xs text-muted-foreground">/ {p.uom}</span>
              </div>

              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)}>
                  <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(p)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Padam
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kod Produk (opsional)</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="cth: SVC-001, PKG-AC"
                />
                <p className="text-[11px] text-muted-foreground">Rujukan dalaman — tidak wajib</p>
              </div>
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Input
                  list="prod-categories"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="cth: Aircond, Elektrik, Paip"
                />
                <datalist id="prod-categories">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nama Produk / Perkhidmatan *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth: Servis Aircond 1.5HP"
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Keterangan Lengkap (opsional)</Label>
              <Textarea
                rows={6}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={`Tulis keterangan lengkap perkhidmatan ini...

cth:
- Pembersihan coil evaporator
- Cuci drain pan dan tray
- Semak dan tambah gas R32/R22
- Test run semua mod`}
              />
              <p className="text-[11px] text-muted-foreground">
                Keterangan ini akan dipaparkan dalam PDF Sebut Harga dan Invois di bawah nama item
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Harga Seunit (RM) *</Label>
                <Input
                  type="number" min={0} step="0.01"
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                  placeholder="0.00"
                  aria-invalid={!!errors.unit_price}
                />
                {errors.unit_price && <p className="text-xs text-destructive">{errors.unit_price}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>UOM (Unit Ukuran) *</Label>
                <UomCombo
                  value={form.uom}
                  onChange={(v) => setForm({ ...form, uom: v })}
                  invalid={!!errors.uom}
                />
                {errors.uom && <p className="text-xs text-destructive">{errors.uom}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between bg-muted/40 border border-border rounded-lg p-3">
              <div>
                <p className="text-sm font-medium">Produk Aktif</p>
                <p className="text-xs text-muted-foreground">
                  Produk tidak aktif tidak akan muncul dalam senarai pilihan
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Produk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam Produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk &lsquo;{confirmDelete?.name}&rsquo; akan dipadam. Ini tidak akan mempengaruhi item yang
              telah dimasukkan dalam sebut harga atau invois sedia ada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl md:text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}

function UomCombo({
  value, onChange, invalid,
}: { value: string; onChange: (v: string) => void; invalid?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex gap-1.5">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="cth: unit, jam, meter, m²"
          aria-invalid={invalid}
          className="flex-1"
        />
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" aria-label="Pilih UOM">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-72 p-0 max-h-80 overflow-y-auto" align="end">
        {UOM_GROUPS.map((g) => (
          <div key={g.label} className="py-1">
            <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/50">
              {g.label}
            </div>
            {g.items.map((it) => (
              <button
                key={it.value}
                type="button"
                onClick={() => { onChange(it.value); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center justify-between"
              >
                <span className="font-medium">{it.value}</span>
                <span className="text-xs text-muted-foreground">{it.hint}</span>
              </button>
            ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Plus, Search, Edit2, Trash2, Tag, Package } from 'lucide-react';
import { toast } from 'sonner';
import { JobProductsEditor, type JobProductItem } from '@/components/JobProductsEditor';

const CATEGORIES = ['Renovation', 'Aircond', 'Electrical', 'Plumbing', 'Maintenance', 'Welding', 'Other'];

type Preset = {
  id: string;
  user_id: string;
  name: string;
  title: string;
  category: string;
  description: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

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

type FormState = {
  id?: string;
  name: string;
  title: string;
  category: string;
  description: string;
  notes: string;
  is_active: boolean;
  products: JobProductItem[];
};
const emptyForm: FormState = {
  name: '', title: '', category: 'Other', description: '', notes: '', is_active: true, products: [],
};

export default function JobPresetsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Preset | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('job_presets' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setItems(((data as any) ?? []) as Preset[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (statusFilter === 'active' && !p.is_active) return false;
      if (statusFilter === 'inactive' && p.is_active) return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((p) => p.is_active).length,
    cats: new Set(items.map((p) => p.category)).size,
    latest: items[0]?.created_at,
  }), [items]);

  const openCreate = () => { setForm(emptyForm); setErrors({}); setOpen(true); };
  const openEdit = (p: Preset) => {
    setForm({
      id: p.id, name: p.name, title: p.title, category: p.category || 'Other',
      description: p.description ?? '', notes: p.notes ?? '', is_active: p.is_active,
      products: Array.isArray((p as any).products) ? (p as any).products : [],
    });
    setErrors({}); setOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nama preset diperlukan';
    if (!form.title.trim()) e.title = 'Tajuk kerja diperlukan';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!user || !validate()) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      products: form.products.filter((p) => p.description.trim()) as any,
    };
    const q = form.id
      ? supabase.from('job_presets' as any).update(payload).eq('id', form.id)
      : supabase.from('job_presets' as any).insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('✓ Preset berjaya disimpan');
    setOpen(false);
    load();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from('job_presets' as any).delete().eq('id', confirmDelete.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Preset telah dipadam');
    setConfirmDelete(null);
    load();
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Preset Kerja
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Senarai template kerja yang biasa dilakukan — pilih semasa cipta job baharu untuk auto-isi
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-lg">
          <Plus className="h-4 w-4 mr-1" /> Tambah Preset
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Jumlah Preset" value={stats.total} />
        <StatCard label="Aktif" value={stats.active} />
        <StatCard label="Kategori" value={stats.cats} />
        <StatCard label="Terbaru" value={stats.latest ? new Date(stats.latest).toLocaleDateString('ms-MY') : '—'} />
      </div>

      <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama preset, tajuk..." className="pl-9" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm">
          <option value="">Semua Kategori</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-medium ${
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent'
              }`}>
              {s === 'all' ? 'Semua' : s === 'active' ? 'Aktif' : 'Tidak Aktif'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuatkan...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <Briefcase className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {items.length === 0 ? 'Belum ada preset. Klik "Tambah Preset" untuk mula.' : 'Tiada preset yang sepadan.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id}
              className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-foreground/20 transition relative flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${categoryClasses(p.category)}`}>
                  <Tag className="inline h-2.5 w-2.5 mr-1" />{p.category}
                </span>
                {!p.is_active && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">tidak aktif</span>
                )}
              </div>
              <h3 className="text-base font-semibold text-foreground leading-tight">{p.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Tajuk: {p.title}</p>
              {p.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2 whitespace-pre-line">{p.description}</p>
              )}
              <div className="border-t border-border my-3" />
              <div className="flex gap-2 mt-auto">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)}>
                  <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(p)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Padam
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Preset Kerja' : 'Tambah Preset Kerja'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Preset *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth: Servis Aircond Rumah" aria-invalid={!!errors.name} />
              <p className="text-[11px] text-muted-foreground">Label untuk pilih dalam dropdown</p>
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tajuk Kerja *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="cth: Servis & Cuci Aircond" aria-invalid={!!errors.title} />
                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Keterangan (opsional)</Label>
              <Textarea rows={4} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Skop kerja yang biasa dilakukan..." />
            </div>
            <div className="space-y-1.5">
              <Label>Nota Dalaman (opsional)</Label>
              <Textarea rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Nota untuk rujukan dalaman..." />
            </div>
            <div className="flex items-center justify-between bg-muted/40 border border-border rounded-lg p-3">
              <div>
                <p className="text-sm font-medium">Preset Aktif</p>
                <p className="text-xs text-muted-foreground">Preset tidak aktif tidak akan muncul dalam dropdown</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Preset'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam preset?</AlertDialogTitle>
            <AlertDialogDescription>
              Preset "{confirmDelete?.name}" akan dipadam. Tindakan ini tidak boleh dibuat asal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Padam</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

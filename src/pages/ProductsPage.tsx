import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { getDateLocale } from '@/i18n';
import DataListPage, { ListColumn } from '@/components/list/DataListPage';

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

const UOM_GROUP_DEFS: { key: 'service' | 'physical' | 'packaging'; items: string[] }[] = [
  { key: 'service', items: ['unit', 'jam', 'hari', 'trip', 'kontrak'] },
  { key: 'physical', items: ['meter', 'kaki', 'm²', 'kaki²', 'kg', 'tan'] },
  { key: 'packaging', items: ['set', 'lot', 'pasang', 'kotak', 'beg', 'tin', 'roll', 'helai'] },
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
  const { t } = useTranslation();
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
    if (!form.name.trim()) e.name = t('products.errName');
    if (form.unit_price === '' || isNaN(Number(form.unit_price)) || Number(form.unit_price) < 0)
      e.unit_price = t('products.errPrice');
    if (!form.uom.trim()) e.uom = t('products.errUom');
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
    toast.success(t('products.savedToast'));
    setOpen(false);
    load();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', confirmDelete.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t('products.deletedToast'));
    setConfirmDelete(null);
    load();
  };

  const columns: ListColumn<Product>[] = [
    {
      key: 'code',
      header: t('products.codeLabel'),
      sortValue: (p) => p.code || '',
      render: (p) => p.code
        ? <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{p.code}</span>
        : '—',
    },
    {
      key: 'name',
      header: t('products.nameLabel'),
      sortValue: (p) => p.name.toLowerCase(),
      render: (p) => (
        <div>
          <p className="font-medium text-foreground">
            {p.name}
            {!p.is_active && (
              <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                {t('products.inactiveTag')}
              </span>
            )}
          </p>
          {p.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: t('products.categoryLabel'),
      sortValue: (p) => p.category || '',
      render: (p) => (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${categoryClasses(p.category)}`}>
          <Tag className="inline h-2.5 w-2.5 mr-1" />
          {p.category || t('products.general')}
        </span>
      ),
    },
    { key: 'uom', header: t('products.uomLabel'), sortValue: (p) => p.uom || '', render: (p) => p.uom },
    {
      key: 'amount',
      header: t('products.priceLabel'),
      align: 'right',
      sortValue: (p) => p.unit_price || 0,
      render: (p) => <span className="font-semibold">RM {fmtMYR(p.unit_price)}</span>,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <DataListPage<Product>
        title={t('products.title')}
        description={t('products.subtitle')}
        newLabel={t('products.add')}
        onNew={openCreate}
        rows={items}
        loading={loading}
        emptyMessage={items.length === 0 ? t('products.emptyFirst') : t('products.emptyFiltered')}
        getRowId={(p) => p.id}
        columns={columns}
        searchValues={(p) => [p.name, p.code, p.category, p.description]}
        getDate={(p) => p.created_at}
        getAmount={(p) => p.unit_price || 0}
        amountHeader={t('products.priceLabel')}
        filters={[
          {
            label: t('products.categoryLabel'),
            options: [
              ...categories.map((c) => ({ value: c, label: c })),
              { value: '__none__', label: t('products.uncategorized') },
            ],
            match: (p, v) => v === '__none__' ? !p.category : p.category === v,
          },
          {
            label: t('products.active'),
            options: [
              { value: 'active', label: t('products.active') },
              { value: 'inactive', label: t('products.inactive') },
            ],
            match: (p, v) => v === 'active' ? p.is_active : !p.is_active,
          },
        ]}
        rowActions={(p) => (
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(p)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      />


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? t('products.editTitle') : t('products.addTitle')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('products.codeLabel')}</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder={t('products.codePlaceholder')}
                />
                <p className="text-[11px] text-muted-foreground">{t('products.codeHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t('products.categoryLabel')}</Label>
                <Input
                  list="prod-categories"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder={t('products.categoryPlaceholder')}
                />
                <datalist id="prod-categories">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('products.nameLabel')}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('products.namePlaceholder')}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>{t('products.descLabel')}</Label>
              <Textarea
                rows={6}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('products.descPlaceholder')}
              />
              <p className="text-[11px] text-muted-foreground">{t('products.descHint')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('products.priceLabel')}</Label>
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
                <Label>{t('products.uomLabel')}</Label>
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
                <p className="text-sm font-medium">{t('products.activeToggle')}</p>
                <p className="text-xs text-muted-foreground">{t('products.activeToggleHint')}</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>{t('products.cancel')}</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? t('products.saving') : t('products.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('products.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('products.deleteDesc', { name: confirmDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('products.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('products.deleteConfirm')}
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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex gap-1.5">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('products.uomPlaceholder')}
          aria-invalid={invalid}
          className="flex-1"
        />
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" aria-label={t('products.selectUom')}>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-72 p-0 max-h-80 overflow-y-auto" align="end">
        {UOM_GROUP_DEFS.map((g) => (
          <div key={g.key} className="py-1">
            <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/50">
              {t(`products.uomGroup.${g.key}`)}
            </div>
            {g.items.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => { onChange(v); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center justify-between"
              >
                <span className="font-medium">{v}</span>
                <span className="text-xs text-muted-foreground">{t(`products.uomHint.${v}`)}</span>
              </button>
            ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

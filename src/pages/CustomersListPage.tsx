import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Plus, Search, X, Phone, Briefcase, CheckSquare, Square } from 'lucide-react';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import BulkActionBar from '@/components/BulkActionBar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';

import { ColoredTag, normalizeTags, TagBadge } from '@/components/customers/TagBadge';

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  tags: ColoredTag[];
  jobCount: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const ALL = '__all__';

export default function CustomersListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string>(ALL);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function fetch() {
      const [custRes, jobsRes] = await Promise.all([
        supabase.from('customers').select('id, name, phone, tags, tags_v2').order('name'),
        supabase.from('jobs').select('id, customer_id'),
      ]);
      const jobCounts: Record<string, number> = {};
      (jobsRes.data || []).forEach((j: any) => {
        if (j.customer_id) jobCounts[j.customer_id] = (jobCounts[j.customer_id] || 0) + 1;
      });
      const rows: CustomerRow[] = ((custRes.data as any[]) || []).map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        tags: normalizeTags(c.tags_v2, c.tags),
        jobCount: jobCounts[c.id] || 0,
      }));
      setCustomers(rows);
      setLoading(false);
    }
    fetch();
  }, [user]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => (c.tags || []).forEach(tg => set.add(tg.label)));
    return Array.from(set).sort();
  }, [customers]);

  const filtered = useMemo(() => {
    let result = customers;
    if (tagFilter !== ALL) {
      result = result.filter(c => (c.tags || []).some(tg => tg.label === tagFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
      );
    }
    return result;
  }, [customers, tagFilter, search]);

  const bulk = useBulkSelection(filtered);

  async function handleBulkDelete() {
    setDeleting(true);
    const ids = Array.from(bulk.selected);
    const { error } = await supabase.from('customers').delete().in('id', ids);
    setDeleting(false);
    setConfirmOpen(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCustomers(prev => prev.filter(c => !ids.includes(c.id)));
    toast.success(t('customers.deletedToast', { count: ids.length }));
    bulk.exit();
  }

  function handleCardClick(id: string) {
    if (bulk.selectionMode) bulk.toggle(id);
    else navigate(`/customers/${id}`);
  }
  let pressTimer: any = null;
  function handlePressStart(id: string) { pressTimer = setTimeout(() => bulk.enter(id), 500); }
  function handlePressEnd() { if (pressTimer) clearTimeout(pressTimer); }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {bulk.selectionMode && (
        <BulkActionBar
          count={bulk.selected.size}
          total={filtered.length}
          onSelectAll={bulk.selectAll}
          onClear={bulk.clear}
          onDelete={() => setConfirmOpen(true)}
          onExit={bulk.exit}
          deleting={deleting}
          label={t('customers.label')}
        />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{t('customers.title')}</h1>
        <div className="flex gap-2">
          {!bulk.selectionMode && filtered.length > 0 && (
            <Button onClick={() => bulk.enter()} variant="outline" size="sm" className="rounded-lg gap-1.5">
              <CheckSquare className="h-4 w-4" /> {t('common2.select')}
            </Button>
          )}
          <Button data-tutorial="customers-new-btn" onClick={() => navigate('/customers/new')} size="sm" className="rounded-lg gap-1.5 hidden sm:flex">
            <Plus className="h-4 w-4" /> {t('customers.newCustomer')}
          </Button>
        </div>
      </div>

      <div data-tutorial="customers-search" className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('customers.searchPlaceholder')} className="pl-9 pr-9 rounded-lg" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div data-tutorial="customers-tags" className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        <button
          onClick={() => setTagFilter(ALL)}
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0 ${
            tagFilter === ALL ? 'bg-primary text-primary-foreground' : 'bg-sidebar-background text-muted-foreground hover:bg-sidebar-accent'
          }`}
        >
          {t('customers.all')}
        </button>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setTagFilter(tag)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0 ${
              tagFilter === tag ? 'bg-primary text-primary-foreground' : 'bg-sidebar-background text-muted-foreground hover:bg-sidebar-accent'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center bg-card">
          <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground mb-4">
            {customers.length === 0 ? t('customers.empty') : t('customers.notFound')}
          </p>
          {customers.length === 0 && (
            <Button onClick={() => navigate('/customers/new')} className="rounded-lg gap-2">
              <Plus className="h-4 w-4" /> {t('customers.addFirst')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const isSelected = bulk.selected.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => handleCardClick(c.id)}
                onMouseDown={() => handlePressStart(c.id)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={() => handlePressStart(c.id)}
                onTouchEnd={handlePressEnd}
                className={`w-full bg-card rounded-xl border p-4 hover:bg-sidebar-background transition-colors text-left flex items-center gap-3 ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                {bulk.selectionMode && (
                  <div className="shrink-0">
                    {isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                  </div>
                )}
                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[15px] font-medium shrink-0">
                  {getInitials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                  {c.phone && (
                    <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {(c.tags || []).length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {c.tags!.map(tag => (
                        <TagBadge key={tag.label} tag={tag} size="xs" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-sidebar-background text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {t('customers.jobCount', { count: c.jobCount })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!bulk.selectionMode && (
        <button
          onClick={() => navigate('/customers/new')}
          className="sm:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('customers.deleteTitle')}
        body={t('common2.deleteConfirm', { count: bulk.selected.size, label: t('customers.label') })}
        confirmLabel={t('common.delete')}
        confirmVariant="danger"
        isLoading={deleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}

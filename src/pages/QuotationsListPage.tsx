import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus, Search, X, User, Briefcase, CalendarDays, CheckSquare, Square } from 'lucide-react';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import BulkActionBar from '@/components/BulkActionBar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';
import { getDateLocale } from '@/i18n';

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-[#F1F5F9] text-[#64748B]',
  Sent: 'bg-[#DBEAFE] text-[#1D4ED8]',
  Accepted: 'bg-[#DCFCE7] text-[#15803D]',
  Rejected: 'bg-[#FEE2E2] text-[#B91C1C]',
};

const STATUS_KEYS = ['all', 'Draft', 'Sent', 'Accepted', 'Rejected'] as const;

interface QuotationRow {
  id: string;
  quote_number: string;
  status: string;
  total: number;
  valid_until: string | null;
  created_at: string;
  jobs: { job_number: string; customers: { name: string } | null } | null;
}

export default function QuotationsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function fetch() {
      const { data } = await supabase
        .from('quotations')
        .select('id, quote_number, status, total, valid_until, created_at, jobs(job_number, customers(name))')
        .order('created_at', { ascending: false });
      setQuotations((data as unknown as QuotationRow[]) || []);
      setLoading(false);
    }
    fetch();
  }, [user]);

  const filtered = useMemo(() => {
    let result = quotations;
    if (statusFilter !== 'all') result = result.filter(q => q.status === statusFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(q =>
        q.quote_number.toLowerCase().includes(s) ||
        (q.jobs?.customers?.name || '').toLowerCase().includes(s)
      );
    }
    return result;
  }, [quotations, statusFilter, search]);

  const bulk = useBulkSelection(filtered);

  async function handleBulkDelete() {
    setDeleting(true);
    const ids = Array.from(bulk.selected);
    const { error } = await supabase.from('quotations').delete().in('id', ids);
    setDeleting(false);
    setConfirmOpen(false);
    if (error) { toast.error(error.message); return; }
    setQuotations(prev => prev.filter(q => !ids.includes(q.id)));
    toast.success(t('quotations.deletedToast', { count: ids.length }));
    bulk.exit();
  }

  function handleCardClick(id: string) {
    if (bulk.selectionMode) bulk.toggle(id);
    else navigate(`/quotations/${id}`);
  }
  let pressTimer: any = null;
  function handlePressStart(id: string) { pressTimer = setTimeout(() => bulk.enter(id), 500); }
  function handlePressEnd() { if (pressTimer) clearTimeout(pressTimer); }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });

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
          label={t('quotations.label')}
        />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{t('quotations.title')}</h1>
        <div className="flex gap-2">
          {!bulk.selectionMode && filtered.length > 0 && (
            <Button onClick={() => bulk.enter()} variant="outline" size="sm" className="rounded-lg gap-1.5">
              <CheckSquare className="h-4 w-4" /> {t('common2.select')}
            </Button>
          )}
          <Button data-tutorial="quotations-new-btn" onClick={() => navigate('/quotations/new')} size="sm" className="rounded-lg gap-1.5 hidden sm:flex">
            <Plus className="h-4 w-4" /> {t('quotations.newQuotation')}
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('quotations.searchPlaceholder')} className="pl-9 pr-9 rounded-lg" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div data-tutorial="quotations-status-tabs" className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        {STATUS_KEYS.map(key => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              statusFilter === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            {t(`quotations.statusTabs.${key}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-xl border border-border p-4">
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-3 w-40 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center bg-card">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground mb-4">
            {quotations.length === 0 ? t('quotations.empty') : t('quotations.notFound')}
          </p>
          {quotations.length === 0 && (
            <Button onClick={() => navigate('/quotations/new')} className="rounded-lg gap-2">
              <Plus className="h-4 w-4" /> {t('quotations.create')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(q => {
            const isSelected = bulk.selected.has(q.id);
            return (
              <button
                key={q.id}
                onClick={() => handleCardClick(q.id)}
                onMouseDown={() => handlePressStart(q.id)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={() => handlePressStart(q.id)}
                onTouchEnd={handlePressEnd}
                className={`w-full bg-card rounded-xl border p-4 hover:shadow-md transition-all text-left flex gap-3 ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                {bulk.selectionMode && (
                  <div className="shrink-0 pt-0.5">
                    {isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-primary">{q.quote_number}</span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[q.status] || STATUS_COLORS.Draft}`}>
                      {q.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>{q.jobs?.customers?.name || t('common2.noCustomer')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span>{q.jobs?.job_number || '-'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    {q.valid_until && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span className="text-[13px]">{t('quotations.validUntil', { date: formatDate(q.valid_until) })}</span>
                      </div>
                    )}
                    <span className="text-sm font-bold text-foreground ml-auto">RM {Number(q.total).toFixed(2)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!bulk.selectionMode && (
        <button
          onClick={() => navigate('/quotations/new')}
          className="sm:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('quotations.deleteTitle')}
        body={t('common2.deleteConfirm', { count: bulk.selected.size, label: t('quotations.label') })}
        confirmLabel={t('common.delete')}
        confirmVariant="danger"
        isLoading={deleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}

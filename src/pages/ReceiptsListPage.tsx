import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, Search, X, User, CalendarDays } from 'lucide-react';
import { getDateLocale } from '@/i18n';

interface ReceiptRow {
  id: string;
  invoice_number: string;
  receipt_number: string | null;
  total: number;
  paid_date: string | null;
  created_at: string;
  jobs: { customers: { name: string } | null } | null;
}

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ReceiptsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('invoices')
      .select('id, invoice_number, receipt_number, total, paid_date, created_at, jobs(customers(name))')
      .eq('status', 'Paid')
      .order('paid_date', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        setRows((data as unknown as ReceiptRow[]) || []);
        setLoading(false);
      });
  }, [user]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(r =>
      (r.receipt_number || '').toLowerCase().includes(s) ||
      r.invoice_number.toLowerCase().includes(s) ||
      (r.jobs?.customers?.name || '').toLowerCase().includes(s)
    );
  }, [rows, search]);

  const totalPaid = useMemo(() => filtered.reduce((sum, r) => sum + Number(r.total || 0), 0), [filtered]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t('receipts.title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('receipts.subtitle')}</p>
      </div>

      <div data-tutorial="receipts-summary" className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{t('receipts.totalCount')}</p>
          <p className="text-lg font-semibold text-foreground">{filtered.length}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{t('receipts.totalReceived')}</p>
          <p className="text-lg font-semibold text-foreground">RM {totalPaid.toFixed(2)}</p>
        </div>
      </div>

      <div data-tutorial="receipts-search" className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('receipts.searchPlaceholder')}
          className="pl-9 pr-9 rounded-lg"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-xl border border-border p-4">
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center bg-card">
          <Receipt className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">
            {rows.length === 0 ? t('receipts.empty') : t('receipts.notFound')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <button
              key={r.id}
              onClick={() => navigate(`/invoices/${r.id}`)}
              className="w-full bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-sm font-bold text-primary">{r.receipt_number || t('receipts.noNumber')}</span>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{t('receipts.invoiceLabel', { number: r.invoice_number })}</p>
                </div>
                <span className="text-sm font-bold text-foreground shrink-0">RM {Number(r.total).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{r.jobs?.customers?.name || t('common2.noCustomer')}</span>
                </div>
                <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{formatDate(r.paid_date)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

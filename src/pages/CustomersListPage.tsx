import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import DataListPage, { ListColumn } from '@/components/list/DataListPage';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';

import { ColoredTag, normalizeTags, TagBadge } from '@/components/customers/TagBadge';

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tags: ColoredTag[];
  jobCount: number;
  created_at: string | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function CustomersListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState<{ ids: string[]; clear: () => void } | null>(null);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      const [custRes, jobsRes] = await Promise.all([
        supabase.from('customers').select('id, name, phone, email, tags, tags_v2, created_at').order('name'),
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
        email: c.email,
        tags: normalizeTags(c.tags_v2, c.tags),
        jobCount: jobCounts[c.id] || 0,
        created_at: c.created_at,
      }));
      setCustomers(rows);
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const allTags = Array.from(
    new Set(customers.flatMap(c => (c.tags || []).map(tg => tg.label)))
  ).sort();

  async function handleBulkDelete() {
    if (!pending) return;
    setDeleting(true);
    const ids = pending.ids;
    const { error } = await supabase.from('customers').delete().in('id', ids);
    setDeleting(false);
    setConfirmOpen(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCustomers(prev => prev.filter(c => !ids.includes(c.id)));
    toast.success(t('customers.deletedToast', { count: ids.length }));
    pending.clear();
    setPending(null);
  }

  const columns: ListColumn<CustomerRow>[] = [
    {
      key: 'name',
      header: t('customers.title'),
      sortValue: r => r.name.toLowerCase(),
      render: r => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium shrink-0">
            {getInitials(r.name)}
          </div>
          <span className="font-medium text-foreground">{r.name}</span>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', sortValue: r => r.phone || '', render: r => r.phone || '—' },
    { key: 'email', header: 'Email', sortValue: r => r.email || '', render: r => r.email || '—' },
    {
      key: 'tags',
      header: 'Tags',
      render: r => (
        <div className="flex gap-1 flex-wrap">
          {(r.tags || []).length ? r.tags.map(tag => <TagBadge key={tag.label} tag={tag} size="xs" />) : '—'}
        </div>
      ),
    },
    {
      key: 'jobs',
      header: 'Jobs',
      align: 'right',
      sortValue: r => r.jobCount,
      render: r => r.jobCount,
    },
  ];

  return (
    <>
      <DataListPage<CustomerRow>
        title={t('customers.title')}
        newLabel={t('customers.newCustomer')}
        onNew={() => navigate('/customers/new')}
        rows={customers}
        loading={loading}
        emptyMessage={t('customers.empty')}
        getRowId={r => r.id}
        onRowClick={r => navigate(`/customers/${r.id}`)}
        columns={columns}
        searchValues={r => [r.name, r.phone, r.email]}
        getDate={r => r.created_at}
        filters={[
          {
            label: 'Tag',
            options: allTags.map(tg => ({ value: tg, label: tg })),
            match: (r, v) => (r.tags || []).some(tg => tg.label === v),
          },
        ]}
        selectable
        bulkActions={(selectedRows, clear) => (
          <Button
            size="sm"
            variant="destructive"
            className="gap-1"
            onClick={() => { setPending({ ids: selectedRows.map(r => r.id), clear }); setConfirmOpen(true); }}
          >
            <Trash2 className="h-3.5 w-3.5" /> {t('common.delete')}
          </Button>
        )}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('customers.deleteTitle')}
        body={t('common2.deleteConfirm', { count: pending?.ids.length || 0, label: t('customers.label') })}
        confirmLabel={t('common.delete')}
        confirmVariant="danger"
        isLoading={deleting}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}

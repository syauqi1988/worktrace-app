import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import DataListPage, { ListColumn } from '@/components/list/DataListPage';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';
import { useL, useTx } from '@/i18n/dual';

type SupplierRow = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string | null;
};

export default function SuppliersListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tx = useTx();
  const l = useL();
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState<{ ids: string[]; clear: () => void } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('suppliers')
        .select('id, name, company, phone, email, is_active, created_at')
        .order('name');
      setRows((data as SupplierRow[]) || []);
      setLoading(false);
    })();
  }, [user]);

  async function handleBulkDelete() {
    if (!pending) return;
    setDeleting(true);
    const ids = pending.ids;
    const { error } = await (supabase as any).from('suppliers').delete().in('id', ids);
    setDeleting(false);
    setConfirmOpen(false);
    if (error) { toast.error(error.message); return; }
    setRows(prev => prev.filter(r => !ids.includes(r.id)));
    toast.success(tx('Suppliers deleted'));
    pending.clear();
    setPending(null);
  }

  const columns: ListColumn<SupplierRow>[] = [
    { key: 'name', header: 'Supplier', sortValue: r => r.name.toLowerCase(), render: r => <span className="font-medium text-foreground">{r.name}</span> },
    { key: 'company', header: 'Company', sortValue: r => r.company || '', render: r => r.company || '—' },
    { key: 'phone', header: 'Phone', render: r => r.phone || '—' },
    { key: 'email', header: 'Email', render: r => r.email || '—' },
    { key: 'status', header: 'Status', render: r => tx(r.is_active ? 'Active' : 'Inactive') },
  ];

  return (
    <>
      <DataListPage<SupplierRow>
        breadcrumb="Contacts"
        title={tx('Suppliers')}
        newLabel="New Supplier"
        onNew={() => navigate('/suppliers/new')}
        rows={rows}
        loading={loading}
        emptyMessage="No suppliers yet."
        getRowId={r => r.id}
        onRowClick={r => navigate(`/suppliers/${r.id}/edit`)}
        columns={columns}
        searchValues={r => [r.name, r.company, r.phone, r.email]}
        getDate={r => r.created_at}
        filters={[{
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }],
          match: (r, v) => (v === 'active' ? r.is_active : !r.is_active),
        }]}
        selectable
        bulkActions={(sel, clear) => (
          <Button size="sm" variant="destructive" className="gap-1"
            onClick={() => { setPending({ ids: sel.map(r => r.id), clear }); setConfirmOpen(true); }}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        )}
      />
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={tx('Delete suppliers')}
        body={l(`Delete ${pending?.ids.length || 0} supplier(s)?`, `Padam ${pending?.ids.length || 0} pembekal?`)}
        confirmLabel={tx('Delete')}
        confirmVariant="danger"
        isLoading={deleting}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}

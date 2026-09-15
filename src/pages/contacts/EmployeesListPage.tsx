import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import DataListPage, { ListColumn } from '@/components/list/DataListPage';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';

type EmployeeRow = {
  id: string;
  name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string | null;
};

export default function EmployeesListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState<{ ids: string[]; clear: () => void } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('employees')
        .select('id, name, position, phone, email, is_active, created_at')
        .order('name');
      setRows((data as EmployeeRow[]) || []);
      setLoading(false);
    })();
  }, [user]);

  async function handleBulkDelete() {
    if (!pending) return;
    setDeleting(true);
    const ids = pending.ids;
    const { error } = await (supabase as any).from('employees').delete().in('id', ids);
    setDeleting(false);
    setConfirmOpen(false);
    if (error) { toast.error(error.message); return; }
    setRows(prev => prev.filter(r => !ids.includes(r.id)));
    toast.success('Employees deleted');
    pending.clear();
    setPending(null);
  }

  const columns: ListColumn<EmployeeRow>[] = [
    { key: 'name', header: 'Employee', sortValue: r => r.name.toLowerCase(), render: r => <span className="font-medium text-foreground">{r.name}</span> },
    { key: 'position', header: 'Position', sortValue: r => r.position || '', render: r => r.position || '—' },
    { key: 'phone', header: 'Phone', render: r => r.phone || '—' },
    { key: 'email', header: 'Email', render: r => r.email || '—' },
    { key: 'status', header: 'Status', render: r => (r.is_active ? 'Active' : 'Inactive') },
  ];

  return (
    <>
      <DataListPage<EmployeeRow>
        breadcrumb="Contacts"
        title="Employees"
        newLabel="New Employee"
        onNew={() => navigate('/employees/new')}
        rows={rows}
        loading={loading}
        emptyMessage="No employees yet."
        getRowId={r => r.id}
        onRowClick={r => navigate(`/employees/${r.id}/edit`)}
        columns={columns}
        searchValues={r => [r.name, r.position, r.phone, r.email]}
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
        title="Delete employees"
        body={`Delete ${pending?.ids.length || 0} employee(s)?`}
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={deleting}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}

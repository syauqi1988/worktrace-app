import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DataListPage from '@/components/list/DataListPage';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useL, useTx } from '@/i18n/dual';
import { PURCHASE_CONFIG, PurchaseDoc, PurchaseType, statusBadge } from './shared';
import { downloadPurchasePdf } from './purchasePdf';

const db = supabase as any;

export default function PurchaseListPage({ type }: { type: PurchaseType }) {
  const cfg = PURCHASE_CONFIG[type];
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const l = useL();
  const tx = useTx();
  const [rows, setRows] = useState<PurchaseDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await db.from('purchase_documents')
      .select('id, doc_number, party, reference, doc_date, status, total')
      .eq('user_id', user.id).eq('doc_type', type).order('doc_date', { ascending: false });
    if (error) toast.error(l('Could not load records', 'Gagal memuatkan rekod'));
    setRows((data || []).map((r: any) => ({
      id: r.id, number: r.doc_number, party: r.party, reference: r.reference || '',
      date: r.doc_date, status: r.status, amount: Number(r.total) || 0,
    })));
    setLoading(false);
  };
  useEffect(() => { load(); }, [user, type]);

  const remove = async (ids: string[]) => {
    if (!confirm(l(`Delete ${ids.length} record(s)?`, `Padam ${ids.length} rekod?`))) return;
    const { error } = await db.from('purchase_documents').delete().in('id', ids);
    if (error) { toast.error(l('Delete failed', 'Gagal memadam')); return; }
    toast.success(l('Deleted', 'Dipadam'));
    load();
  };

  const pdf = async (id: string) => {
    try { await downloadPurchasePdf(id, profile); }
    catch { toast.error(l('Could not create PDF', 'Gagal mencipta PDF')); }
  };

  const parties = Array.from(new Set(rows.map(r => r.party))).sort();

  return (
    <DataListPage<PurchaseDoc>
      breadcrumb="Purchases"
      title={cfg.listTitle}
      newLabel={cfg.newLabel}
      onNew={() => navigate(`${cfg.path}/new`)}
      rows={rows}
      loading={loading}
      getRowId={r => r.id}
      onRowClick={r => navigate(`${cfg.path}/${r.id}/edit`)}
      emptyMessage={cfg.empty}
      searchValues={r => [r.number, r.party, r.reference]}
      getDate={r => r.date}
      getAmount={r => r.amount}
      amountHeader="Amount"
      selectable
      bulkActions={(sel, clear) => (
        <Button size="sm" variant="destructive" className="gap-1" onClick={async () => { await remove(sel.map(s => s.id)); clear(); }}>
          <Trash2 className="h-4 w-4" /> {l('Delete', 'Padam')}
        </Button>
      )}
      rowActions={r => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Button size="icon" variant="ghost" aria-label="PDF" title="PDF" onClick={() => pdf(r.id)}><FileDown className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" aria-label={l('Delete', 'Padam')} onClick={() => remove([r.id])}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      )}
      filters={[
        { label: 'Supplier', options: parties.map(p => ({ value: p, label: p })), match: (r, v) => r.party === v, placeholder: 'All suppliers' },
        { label: 'Status', options: cfg.statuses.map(s => ({ value: s, label: tx(s) })), match: (r, v) => r.status === v },
      ]}
      columns={[
        { key: 'date', header: 'Date', sortValue: r => r.date, render: r => r.date },
        { key: 'number', header: cfg.numberHeader, sortValue: r => r.number, render: r => r.number },
        { key: 'party', header: 'Supplier', sortValue: r => r.party, render: r => r.party },
        { key: 'reference', header: 'Reference', render: r => r.reference || '-' },
        { key: 'status', header: 'Status', align: 'center', render: r => statusBadge(r.status) },
        { key: 'amount', header: 'Amount', align: 'right', sortValue: r => r.amount, render: r => `RM ${r.amount.toFixed(2)}` },
      ]}
    />
  );
}

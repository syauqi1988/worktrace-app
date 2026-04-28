import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ApprovalRow {
  id: string;
  document_id: string;
  document_type: 'quotation' | 'work_order' | 'completion_report';
  token: string;
  pdf_url: string | null;
  customer_name: string | null;
  action: string | null;
  reason: string | null;
  expires_at: string | null;
  responded_at: string | null;
  user_id: string;
}

export default function PublicApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ApprovalRow | null>(null);
  const [doc, setDoc] = useState<any>(null);
  const [company, setCompany] = useState<{ company_name: string | null; logo_url: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data } = await supabase
        .from('customer_approvals')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (!data) {
        setLoading(false);
        return;
      }
      const r = data as ApprovalRow;
      setRow(r);

      // Mark viewed once
      if (!r.action) {
        await supabase
          .from('customer_approvals')
          .update({ viewed_at: new Date().toISOString() } as any)
          .eq('token', token);
      }

      // Load company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name, logo_url')
        .eq('id', r.user_id)
        .maybeSingle();
      if (profile) setCompany(profile as any);

      // Load doc summary (only fields needed for display)
      const tableName =
        r.document_type === 'quotation' ? 'quotations'
        : r.document_type === 'work_order' ? 'work_orders'
        : 'completion_reports';
      const numberCol =
        r.document_type === 'quotation' ? 'quote_number'
        : r.document_type === 'work_order' ? 'wo_number'
        : 'report_number';
      const selectCols = r.document_type === 'completion_report'
        ? `id, ${numberCol}, created_at, status`
        : `id, ${numberCol}, total, created_at, status`;
      const { data: docData } = await supabase
        .from(tableName as any)
        .select(selectCols)
        .eq('id', r.document_id)
        .maybeSingle();
      setDoc(docData);
      setLoading(false);
    })();
  }, [token]);

  const respond = async (action: 'accepted' | 'rejected') => {
    if (!row) return;
    if (action === 'rejected' && !reason.trim()) {
      toast.error('Sila nyatakan sebab penolakan.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from('customer_approvals')
      .update({
        action,
        reason: action === 'rejected' ? reason.trim() : null,
        responded_at: new Date().toISOString(),
      } as any)
      .eq('token', row.token);

    if (error) {
      toast.error('Gagal menghantar respons');
      setSubmitting(false);
      return;
    }

    // Mirror status to source document
    const tableName = row.document_type === 'quotation' ? 'quotations' : 'work_orders';
    const newStatus = action === 'accepted' ? 'Accepted' : 'Rejected';
    const updates: any = { status: newStatus };
    if (row.document_type === 'work_order') {
      if (action === 'accepted') updates.accepted_at = new Date().toISOString();
      else { updates.rejected_at = new Date().toISOString(); updates.rejection_reason = reason.trim() || null; }
    }
    await supabase.from(tableName as any).update(updates).eq('id', row.document_id);

    setRow({ ...row, action, responded_at: new Date().toISOString(), reason });
    setSubmitting(false);
    toast.success(action === 'accepted' ? 'Terima kasih! Pengesahan dihantar.' : 'Respons dihantar.');
  };

  if (loading) {
    return <div className="min-h-screen p-6 max-w-xl mx-auto space-y-3">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>;
  }

  if (!row) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-1">Pautan tidak sah</h1>
          <p className="text-muted-foreground text-sm">Pautan pengesahan ini tidak dijumpai atau telah tamat tempoh.</p>
        </div>
      </div>
    );
  }

  const expired = row.expires_at && new Date(row.expires_at) < new Date();
  const docLabel = row.document_type === 'quotation' ? 'Sebut Harga' : 'Work Order';
  const numberCol = row.document_type === 'quotation' ? 'quote_number' : 'wo_number';

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="logo" className="h-12 w-12 rounded object-contain" />
          ) : (
            <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Daripada</p>
            <p className="font-semibold text-foreground">{company?.company_name || 'Syarikat'}</p>
          </div>
        </div>

        {/* Doc summary */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{docLabel}</p>
            <p className="text-lg font-bold text-foreground">{doc?.[numberCol] || '-'}</p>
          </div>
          {doc?.total != null && (
            <div>
              <p className="text-xs text-muted-foreground">Jumlah</p>
              <p className="text-2xl font-bold text-primary">RM {Number(doc.total || 0).toFixed(2)}</p>
            </div>
          )}
          {row.pdf_url && (
            <Button asChild variant="outline" className="w-full rounded-lg gap-2">
              <a href={row.pdf_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" /> Lihat / Muat Turun PDF
              </a>
            </Button>
          )}
        </div>

        {/* Action */}
        {row.action ? (
          <div className={`border rounded-xl p-4 text-center ${row.action === 'accepted' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {row.action === 'accepted' ? <CheckCircle2 className="h-10 w-10 mx-auto mb-2" /> : <XCircle className="h-10 w-10 mx-auto mb-2" />}
            <p className="font-bold">
              {row.action === 'accepted' ? 'Anda telah mengesahkan dokumen ini' : 'Anda telah menolak dokumen ini'}
            </p>
            {row.reason && <p className="text-sm mt-2">Sebab: {row.reason}</p>}
            {row.responded_at && (
              <p className="text-xs mt-2 opacity-75">{new Date(row.responded_at).toLocaleString('ms-MY')}</p>
            )}
          </div>
        ) : expired ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center text-amber-800">
            <p className="font-medium">Pautan ini telah tamat tempoh. Sila hubungi syarikat.</p>
          </div>
        ) : rejectMode ? (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">Sila nyatakan sebab penolakan:</p>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Contoh: Harga terlalu tinggi..." />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRejectMode(false)} disabled={submitting}>Batal</Button>
              <Button variant="destructive" className="flex-1" onClick={() => respond('rejected')} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hantar'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => respond('accepted')} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white rounded-lg gap-2 h-12">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} Terima
            </Button>
            <Button onClick={() => setRejectMode(true)} variant="outline" disabled={submitting} className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg gap-2 h-12">
              <XCircle className="h-5 w-5" /> Tolak
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">Powered by WorkTrace</p>
      </div>
    </div>
  );
}

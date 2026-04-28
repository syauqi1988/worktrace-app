import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Upload, Loader2, Receipt } from 'lucide-react';
import { toast } from 'sonner';

interface ProofRow {
  id: string;
  invoice_id: string;
  user_id: string;
  token: string;
  payer_name: string | null;
  amount_paid: number | null;
  payment_method: string | null;
  payment_date: string | null;
  bank_name: string | null;
  reference_number: string | null;
  receipt_url: string | null;
  notes: string | null;
  status: string;
  submitted_at: string | null;
  rejection_reason: string | null;
}

export default function PublicPaymentProofPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ProofRow | null>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [payerName, setPayerName] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bankName, setBankName] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data } = await supabase.from('payment_proofs').select('*').eq('token', token).maybeSingle();
      if (!data) { setLoading(false); return; }
      const r = data as ProofRow;
      setRow(r);

      if (r.submitted_at) {
        // Already submitted — fill form readonly view
        setPayerName(r.payer_name || '');
        setAmount(String(r.amount_paid ?? ''));
        setMethod(r.payment_method || 'bank_transfer');
        setPayDate(r.payment_date || '');
        setBankName(r.bank_name || '');
        setReference(r.reference_number || '');
        setNotes(r.notes || '');
        setReceiptUrl(r.receipt_url);
      }

      const { data: inv } = await supabase
        .from('invoices')
        .select('invoice_number, total, jobs(customers(name))')
        .eq('id', r.invoice_id)
        .maybeSingle();
      if (inv) {
        setInvoice(inv);
        if (!r.submitted_at) {
          setAmount(String((inv as any).total || ''));
          setPayerName((inv as any)?.jobs?.customers?.name || '');
        }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name, logo_url, payment_methods')
        .eq('id', r.user_id)
        .maybeSingle();
      setCompany(profile);

      setLoading(false);
    })();
  }, [token]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !row) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Saiz fail melebihi 5MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${row.user_id}/${row.invoice_id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('payment-receipts').upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from('payment-receipts').createSignedUrl(path, 60 * 60 * 24 * 365);
      setReceiptUrl(signed?.signedUrl ?? null);
      toast.success('Resit dimuat naik');
    } catch (err: any) {
      toast.error(err.message || 'Gagal muat naik');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!row) return;
    if (!payerName.trim() || !amount || !payDate) {
      toast.error('Sila lengkapkan nama, jumlah dan tarikh');
      return;
    }
    if (!receiptUrl) {
      toast.error('Sila muat naik resit / bukti bayaran terlebih dahulu');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from('payment_proofs')
      .update({
        payer_name: payerName.trim(),
        amount_paid: Number(amount) || 0,
        payment_method: method,
        payment_date: payDate,
        bank_name: bankName.trim() || null,
        reference_number: reference.trim() || null,
        receipt_url: receiptUrl,
        notes: notes.trim() || null,
        submitted_at: new Date().toISOString(),
        status: 'pending',
        rejection_reason: null,
      } as any)
      .eq('token', row.token);
    setSubmitting(false);
    if (error) { toast.error('Gagal menghantar'); return; }
    toast.success('Bukti pembayaran dihantar!');
    setRow({ ...row, submitted_at: new Date().toISOString(), status: 'pending', rejection_reason: null });
  };

  if (loading) {
    return <div className="min-h-screen p-6 max-w-xl mx-auto space-y-3">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>;
  }

  if (!row) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-1">Pautan tidak sah</h1>
          <p className="text-muted-foreground text-sm">Pautan ini tidak dijumpai.</p>
        </div>
      </div>
    );
  }

  const verified = row.status === 'verified';
  const rejected = row.status === 'rejected';
  // Locked when submitted, EXCEPT when previously rejected (allow resubmit)
  const isSubmitted = !!row.submitted_at && !rejected;
  const paymentMethods: any[] = Array.isArray(company?.payment_methods) ? company.payment_methods : [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="logo" className="h-12 w-12 rounded object-contain" />
          ) : (
            <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Bayaran kepada</p>
            <p className="font-semibold">{company?.company_name || 'Syarikat'}</p>
          </div>
        </div>

        {invoice && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Invois</p>
            <p className="text-lg font-bold">{invoice.invoice_number}</p>
            <p className="text-2xl font-bold text-primary mt-1">RM {Number(invoice.total || 0).toFixed(2)}</p>
          </div>
        )}

        {/* Status banner */}
        {verified && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-green-800">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2" />
            <p className="font-bold">Bayaran disahkan</p>
            <p className="text-sm mt-1">Terima kasih!</p>
          </div>
        )}
        {rejected && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-red-800">
            <XCircle className="h-10 w-10 mx-auto mb-2" />
            <p className="font-bold">Bukti pembayaran ditolak</p>
            {row.rejection_reason && <p className="text-sm mt-1">{row.rejection_reason}</p>}
          </div>
        )}
        {isSubmitted && !verified && !rejected && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center text-blue-800">
            <p className="font-bold">Bukti diterima — menunggu pengesahan</p>
            <p className="text-sm mt-1">Anda akan dimaklumkan apabila disahkan.</p>
          </div>
        )}

        {/* Payment instructions */}
        {!isSubmitted && paymentMethods.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cara Bayar</p>
            {paymentMethods.filter((m: any) => m.type === 'bank_transfer').map((b: any) => (
              <div key={b.id} className="text-sm border rounded-lg p-2">
                <p className="font-medium">🏦 {b.bank_name}</p>
                <p>{b.account_name}</p>
                <p className="font-mono">{b.account_number}</p>
              </div>
            ))}
          </div>
        )}

        {/* Form */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold">{isSubmitted ? 'Maklumat Bayaran Anda' : 'Hantar Bukti Pembayaran'}</p>

          <div>
            <Label>Nama Pembayar *</Label>
            <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} disabled={isSubmitted} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Jumlah Dibayar (RM) *</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={isSubmitted} />
            </div>
            <div>
              <Label>Tarikh Bayaran *</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} disabled={isSubmitted} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Kaedah</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value)} disabled={isSubmitted}>
                <option value="bank_transfer">Pindahan Bank</option>
                <option value="qr_payment">QR Payment</option>
                <option value="cash">Tunai</option>
                <option value="cheque">Cek</option>
              </select>
            </div>
            <div>
              <Label>Bank (jika ada)</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} disabled={isSubmitted} />
            </div>
          </div>
          <div>
            <Label>No. Rujukan</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} disabled={isSubmitted} />
          </div>
          <div>
            <Label>Nota</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isSubmitted} />
          </div>

          <div>
            <Label>Resit / Bukti Bayaran</Label>
            {receiptUrl && (
              <div className="mt-1">
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">Lihat fail dimuat naik</a>
              </div>
            )}
            {!isSubmitted && (
              <div className="mt-2">
                <Input type="file" accept="image/*,application/pdf" onChange={handleUpload} disabled={uploading} />
                {uploading && <p className="text-xs text-muted-foreground mt-1">Memuat naik...</p>}
              </div>
            )}
          </div>

          {!isSubmitted && (
            <Button onClick={handleSubmit} disabled={submitting || !receiptUrl} className="w-full rounded-lg gap-2 h-12">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {receiptUrl ? 'Hantar Bukti Pembayaran' : 'Muat naik resit dahulu'}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">Powered by WorkTrace</p>
      </div>
    </div>
  );
}

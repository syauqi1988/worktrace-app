import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Upload, Loader2, Receipt, Download, Eye } from 'lucide-react';
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
  invoice_pdf_url: string | null;
  milestone_stage: number | null;
  milestone_label: string | null;
}

export default function PublicPaymentProofPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ProofRow | null>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [payerName, setPayerName] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bankName, setBankName] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptUploaded, setReceiptUploaded] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data } = await supabase.rpc('get_payment_proof_by_token', { p_token: token });
      const payload: any = data;
      if (!payload?.proof) { setLoading(false); return; }
      const r = payload.proof as ProofRow;
      setRow(r);

      if (r.submitted_at) {
        setPayerName(r.payer_name || '');
        setAmount(String(r.amount_paid ?? ''));
        setMethod(r.payment_method || 'bank_transfer');
        setPayDate(r.payment_date || '');
        setBankName(r.bank_name || '');
        setReference(r.reference_number || '');
        setNotes(r.notes || '');
        setReceiptUrl(r.receipt_url);
        setReceiptUploaded(!!r.receipt_url);
      }

      if (payload.invoice) {
        setInvoice(payload.invoice);
        if (!r.submitted_at) {
          setAmount(String(payload.invoice.total || ''));
          setPayerName(payload.invoice.customer_name || '');
        }
      }
      setCompany(payload.company || null);

      setLoading(false);
    })();
  }, [token]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !row) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('publicProof.errSize'));
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `proof/${row.token}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('payment-receipts').upload(path, file, { contentType: file.type });
      if (error) throw error;
      setReceiptUrl(path);
      setReceiptUploaded(true);
      toast.success(t('publicProof.uploadedToast'));
    } catch (err: any) {
      toast.error(err.message || t('publicProof.errUpload'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!row) return;
    if (!payerName.trim() || !amount || !payDate) {
      toast.error(t('publicProof.errFields'));
      return;
    }
    if (!receiptUrl) {
      toast.error(t('publicProof.errReceipt'));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc('submit_payment_proof', {
      p_token: row.token,
      p_payer_name: payerName.trim(),
      p_amount: Number(amount) || 0,
      p_method: method,
      p_payment_date: payDate,
      p_bank_name: bankName.trim() || null,
      p_reference: reference.trim() || null,
      p_receipt_url: receiptUrl,
      p_notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (error) { toast.error(t('publicProof.errSubmit')); return; }
    toast.success(t('publicProof.submittedToast'));
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
          <h1 className="text-xl font-bold mb-1">{t('publicProof.invalidLinkTitle')}</h1>
          <p className="text-muted-foreground text-sm">{t('publicProof.invalidLinkBody')}</p>
        </div>
      </div>
    );
  }

  const verified = row.status === 'verified';
  const rejected = row.status === 'rejected';
  const canEdit = !row.submitted_at || rejected;
  const isLocked = !canEdit;
  const isSubmitted = isLocked;
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
            <p className="text-xs text-muted-foreground">{t('publicProof.payTo')}</p>
            <p className="font-semibold">{company?.company_name || t('publicProof.company')}</p>
          </div>
        </div>

        {invoice && (
          <div className="bg-card border border-border rounded-xl p-4">
            {row.milestone_stage && (
              <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Pembayaran Berperingkat</p>
                <p className="text-sm font-bold text-blue-900 mt-0.5">
                  Peringkat {row.milestone_stage}{row.milestone_label ? ` — ${row.milestone_label}` : ''}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('publicProof.invoice')}</p>
            <p className="text-lg font-bold">{invoice.invoice_number}</p>
            <p className="text-2xl font-bold text-primary mt-1">RM {Number(invoice.total || 0).toFixed(2)}</p>
            {row.invoice_pdf_url && (
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={row.invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/5">
                  <Eye className="h-4 w-4" /> {t('publicProof.viewInvoice')}
                </a>
                <a href={row.invoice_pdf_url} download className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-border text-foreground hover:bg-muted">
                  <Download className="h-4 w-4" /> {t('publicProof.downloadPdf')}
                </a>
              </div>
            )}
          </div>
        )}

        {verified && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-green-800">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2" />
            <p className="font-bold">{t('publicProof.verified')}</p>
            <p className="text-sm mt-1">{t('publicProof.thanks')}</p>
          </div>
        )}
        {rejected && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-red-800">
            <XCircle className="h-10 w-10 mx-auto mb-2" />
            <p className="font-bold">{t('publicProof.rejectedTitle')}</p>
            {row.rejection_reason && <p className="text-sm mt-1">{t('publicProof.rejectedReason')} {row.rejection_reason}</p>}
            <p className="text-sm mt-2">{t('publicProof.rejectedHelp')}</p>
          </div>
        )}
        {isSubmitted && !verified && !rejected && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center text-blue-800">
            <p className="font-bold">{t('publicProof.submittedTitle')}</p>
            <p className="text-sm mt-1">{t('publicProof.submittedHelp')}</p>
          </div>
        )}

        {!isSubmitted && paymentMethods.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('publicProof.howToPay')}</p>
            {paymentMethods.filter((m: any) => m.type === 'bank_transfer').map((b: any) => (
              <div key={b.id} className="text-sm border rounded-lg p-2">
                <p className="font-medium">🏦 {b.bank_name}</p>
                <p>{b.account_name}</p>
                <p className="font-mono">{b.account_number}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold">{isLocked ? t('publicProof.yourInfoTitle') : (rejected ? t('publicProof.resubmitTitle') : t('publicProof.submitTitle'))}</p>

          <div>
            <Label>{t('publicProof.payerName')} *</Label>
            <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} disabled={isSubmitted} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{t('publicProof.amountPaid')} *</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={isSubmitted} />
            </div>
            <div>
              <Label>{t('publicProof.payDate')} *</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} disabled={isSubmitted} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{t('publicProof.method')}</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value)} disabled={isSubmitted}>
                <option value="bank_transfer">{t('publicProof.mBank')}</option>
                <option value="qr_payment">{t('publicProof.mQr')}</option>
                <option value="cash">{t('publicProof.mCash')}</option>
                <option value="cheque">{t('publicProof.mCheque')}</option>
              </select>
            </div>
            <div>
              <Label>{t('publicProof.bank')}</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} disabled={isSubmitted} />
            </div>
          </div>
          <div>
            <Label>{t('publicProof.reference')}</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} disabled={isSubmitted} />
          </div>
          <div>
            <Label>{t('publicProof.notes')}</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isSubmitted} />
          </div>

          <div>
            <Label>{t('publicProof.receipt')}</Label>
            {receiptUploaded && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" /> {t('publicProof.uploaded')}
              </div>
            )}
            {!isSubmitted && (
              <div className="mt-2">
                <Input type="file" accept="image/*,application/pdf" onChange={handleUpload} disabled={uploading} />
                {uploading && <p className="text-xs text-muted-foreground mt-1">{t('publicProof.uploading')}</p>}
              </div>
            )}
          </div>

          {!isLocked && (
            <Button onClick={handleSubmit} disabled={submitting || !receiptUrl} className="w-full rounded-lg gap-2 h-12">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {receiptUrl ? (rejected ? t('publicProof.resubmit') : t('publicProof.submit')) : t('publicProof.uploadFirst')}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">{t('publicProof.poweredBy')}</p>
      </div>
    </div>
  );
}

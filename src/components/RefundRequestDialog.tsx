import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { getRefundEligibility, eligibilityToDbValue } from '@/lib/refundEligibility';
import { Link } from 'react-router-dom';

interface Props {
  open: boolean;
  onClose: () => void;
}

const REASON_OPTIONS = [
  { key: 'within_14_days', label: 'Dalam tempoh 14 hari (jaminan)' },
  { key: 'double_charge', label: 'Caj berganda' },
  { key: 'unauthorized', label: 'Caj tidak dibenarkan' },
  { key: 'major_outage', label: 'Platform tidak boleh diakses > 7 hari' },
  { key: 'no_longer_needed', label: 'Tidak lagi diperlukan' },
  { key: 'other', label: 'Lain-lain' },
];

const SUPPORT_EMAIL = 'customerservice@worktrace.my';

export default function RefundRequestDialog({ open, onClose }: Props) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [reasonKey, setReasonKey] = useState('');
  const [notes, setNotes] = useState('');
  const [txnRef, setTxnRef] = useState('');
  const [loading, setLoading] = useState(false);

  const eligibility = useMemo(
    () => getRefundEligibility({
      plan: profile?.plan,
      billing_period: profile?.billing_period,
      subscription_start_date: profile?.subscription_start_date,
    }),
    [profile?.plan, profile?.billing_period, profile?.subscription_start_date],
  );

  const reset = () => { setStep(1); setReasonKey(''); setNotes(''); setTxnRef(''); };
  const close = () => { reset(); onClose(); };

  const fmt = (d: Date | null) => d ? d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const headline = (() => {
    switch (eligibility.status) {
      case 'full': return { icon: <CheckCircle2 className="h-6 w-6 text-emerald-600" />, title: 'Anda layak bayaran balik PENUH', body: `Berdasarkan tarikh pembayaran (${fmt(eligibility.fullRefundUntil ? new Date(eligibility.fullRefundUntil.getTime() - 14*24*60*60*1000) : null)}), anda masih dalam tempoh jaminan 14 hari sehingga ${fmt(eligibility.fullRefundUntil)}.` };
      case 'prorated': return { icon: <AlertTriangle className="h-6 w-6 text-amber-600" />, title: 'Anda layak bayaran balik PRO-RATED', body: `Untuk pelan tahunan, bayaran balik pro-rated boleh dimohon sehingga ${fmt(eligibility.proratedRefundUntil)} (30 hari dari pembayaran). Bayaran balik dikira mengikut bulan penuh yang belum digunakan.` };
      case 'none_free': return { icon: <XCircle className="h-6 w-6 text-muted-foreground" />, title: 'Tiada bayaran untuk dikembalikan', body: 'Anda berada di pelan percuma — tiada caj telah dikenakan.' };
      case 'none_window': return { icon: <XCircle className="h-6 w-6 text-destructive" />, title: 'Tempoh bayaran balik telah tamat', body: 'Tempoh kelayakan bayaran balik telah berlalu. Anda masih boleh hantar permohonan untuk situasi khas (caj berganda, caj tidak dibenarkan, gangguan major).' };
      default: return { icon: null, title: '', body: '' };
    }
  })();

  const submit = async () => {
    if (!user || !reasonKey) return;
    setLoading(true);
    try {
      const isSpecial = ['double_charge', 'unauthorized', 'major_outage'].includes(reasonKey);
      const dbEligibility = isSpecial ? 'special' : eligibilityToDbValue(eligibility.status);

      const { error } = await supabase.from('refund_requests').insert({
        user_id: user.id,
        user_email: user.email ?? '',
        account_name: profile?.company_name ?? null,
        billplz_bill_id: profile?.billplz_bill_id ?? null,
        payment_date: profile?.subscription_start_date ? profile.subscription_start_date.slice(0, 10) : null,
        amount_myr: null,
        plan: profile?.plan ?? null,
        billing_period: profile?.billing_period ?? null,
        eligibility: dbEligibility,
        reason_category: reasonKey,
        notes: notes || null,
        transaction_ref: txnRef || null,
      });
      if (error) throw error;

      const subject = `Permohonan Bayaran Balik — ${profile?.company_name || user.email}`;
      const body = [
        `Saya ingin memohon bayaran balik untuk akaun WorkTrace saya.`,
        ``,
        `Akaun: ${profile?.company_name || '-'}`,
        `Email: ${user.email}`,
        `Pelan: ${profile?.plan} (${profile?.billing_period})`,
        `Tarikh pembayaran: ${profile?.subscription_start_date?.slice(0, 10) || '-'}`,
        `BillPlz Bill ID: ${profile?.billplz_bill_id || '-'}`,
        `Rujukan transaksi: ${txnRef || '-'}`,
        `Sebab: ${REASON_OPTIONS.find(r => r.key === reasonKey)?.label}`,
        `Kelayakan auto: ${dbEligibility}`,
        ``,
        `Nota: ${notes || '-'}`,
      ].join('\n');
      const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;

      toast.success('Permohonan dihantar. Kami akan balas dalam 1 hari bekerja.');
      close();
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menghantar permohonan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && close()}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
          <DialogDescription>
            As per the <Link to="/refund-policy" className="underline">WorkTrace Refund Policy</Link>.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30">
              {headline.icon}
              <div>
                <p className="font-semibold text-foreground">{headline.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{headline.body}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close}>Batal</Button>
              <Button onClick={() => setStep(2)}>Teruskan</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Sebab</label>
              <div className="space-y-1.5">
                {REASON_OPTIONS.map(r => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setReasonKey(r.key)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                      reasonKey === r.key ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-foreground hover:bg-accent'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Rujukan transaksi BillPlz (jika ada)</label>
              <Input value={txnRef} onChange={e => setTxnRef(e.target.value)} placeholder="cth: BP-XXXXXX" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nota tambahan (pilihan)</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>Kembali</Button>
              <Button onClick={submit} disabled={!reasonKey || loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Hantar Permohonan
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Kami akan buka emel anda untuk hantar salinan ke {SUPPORT_EMAIL}.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

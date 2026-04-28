import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { tx } from '@/lib/tx';

interface Props {
  open: boolean;
  onClose: () => void;
}

const REASONS = [
  tx('Tidak guna WorkTrace lagi'),
  'Berpindah ke aplikasi lain',
  'Terlalu mahal',
  'Aplikasi tidak memenuhi keperluan',
  'Perniagaan ditutup',
  'Lain-lain (nyatakan)',
];

interface DataCounts {
  jobs: number;
  customers: number;
  quotations: number;
  work_orders: number;
  invoices: number;
  reports: number;
  receipts: number;
}

export default function AccountDeletionDialog({ open, onClose }: Props) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [counts, setCounts] = useState<DataCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setReason('');
      setOtherReason('');
      setConfirmText('');
      setAgreed(false);
      setCounts(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && step === 2 && !counts && user) {
      setLoadingCounts(true);
      Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('quotations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('completion_reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('receipt_number', 'is', null),
      ]).then(([j, c, q, w, inv, r, rc]) => {
        setCounts({
          jobs: j.count ?? 0,
          customers: c.count ?? 0,
          quotations: q.count ?? 0,
          work_orders: w.count ?? 0,
          invoices: inv.count ?? 0,
          reports: r.count ?? 0,
          receipts: rc.count ?? 0,
        });
        setLoadingCounts(false);
      });
    }
  }, [open, step, counts, user]);

  const finalReason = reason === 'Lain-lain (nyatakan)' ? otherReason.trim() : reason;
  const hasPaidPlan = profile?.plan === 'pro' || profile?.plan === 'team';

  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + 14);
  const scheduledStr = scheduledAt.toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const handleConfirm = async () => {
    if (!user || confirmText !== tx('PADAM') || !agreed) return;
    setSubmitting(true);
    try {
      const scheduledIso = scheduledAt.toISOString();

      // 1. Update profile
      const profileUpdate: any = {
        account_status: 'pending_deletion',
        deletion_requested_at: new Date().toISOString(),
        deletion_scheduled_at: scheduledIso,
        deletion_reason: finalReason,
      };
      if (hasPaidPlan) {
        profileUpdate.subscription_cancelled = true;
        profileUpdate.subscription_status = 'cancelled';
      }
      const { error: profErr } = await supabase.from('profiles').update(profileUpdate).eq('id', user.id);
      if (profErr) throw profErr;

      // 2. Insert deletion request
      await supabase.from('account_deletion_requests').insert({
        user_id: user.id,
        user_email: user.email || '',
        user_name: profile?.company_name || null,
        user_plan: profile?.plan || null,
        reason: finalReason,
        status: 'pending',
        scheduled_at: scheduledIso,
      } as any);

      // 3. Subscription event (if Pro/Team)
      if (hasPaidPlan) {
        await supabase.from('subscription_events').insert({
          user_id: user.id,
          event_type: 'cancelled',
          plan: profile?.plan,
          notes: 'Cancelled — account deletion',
        } as any);
      }

      // 4. Notify admin via send-ticket-email
      try {
        await supabase.functions.invoke('send-ticket-email', {
          body: {
            ticket_number: `PEMADAMAN-${Date.now().toString(36).toUpperCase()}`,
            ticket_id: user.id,
            user_plan: profile?.plan || 'free',
            category: 'account',
            priority: 'high',
            subject: `[PEMADAMAN] ${profile?.company_name || user.email} meminta pemadaman akaun`,
            description:
`Pengguna meminta pemadaman akaun.

Pengguna: ${profile?.company_name || '-'}
Emel: ${user.email}
Pelan: ${profile?.plan || '-'}
Sebab: ${finalReason}
Dijadualkan dipadam: ${scheduledIso}

Untuk batalkan secara manual, kemaskini account_deletion_requests.status = 'cancelled' dan profiles.account_status = 'active' bagi user_id: ${user.id}`,
          },
        });
      } catch (e) {
        console.warn('Admin notification failed', e);
      }

      // 5. Persist for goodbye page + sign out
      localStorage.setItem('worktrace_deletion_scheduled', scheduledIso);
      await signOut();
      navigate('/goodbye', { replace: true });
    } catch (e: any) {
      toast.error(e.message || 'Gagal memproses pemadaman');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {tx('Padam Akaun WorkTrace')}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">Langkah {step} daripada 3</p>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
              <p className="text-sm font-medium text-red-700">{tx('Memadamkan akaun akan:')}</p>
              <ul className="text-sm text-red-700 space-y-0.5">
                <li>✕ Memadam semua kerja dan pelanggan</li>
                <li>✕ Memadam semua quotation & invois</li>
                <li>✕ Memadam semua work order & laporan</li>
                <li>✕ Membatalkan langganan Pro anda</li>
                <li>✕ Memadam semua fail yang dimuat naik</li>
              </ul>
              <p className="text-sm text-red-700 mt-2">⏱ Anda ada <strong>{tx('14 hari')}</strong> {tx('untuk membatalkan sebelum data dipadam kekal.')}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Sebab pemadaman *</p>
              <div className="flex flex-wrap gap-2">
                {REASONS.map(r => (
                  <button key={r} onClick={() => setReason(r)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                      reason === r ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-accent'
                    }`}>
                    {r}
                  </button>
                ))}
              </div>
              {reason === 'Lain-lain (nyatakan)' && (
                <Textarea value={otherReason} onChange={e => setOtherReason(e.target.value)} rows={2} placeholder="Nyatakan sebab..." />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={onClose}>{tx('Batal')}</Button>
              <Button variant="destructive" onClick={() => setStep(2)}
                disabled={!reason || (reason === 'Lain-lain (nyatakan)' && !otherReason.trim())}>
                Teruskan →
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{tx('Data yang akan dipadam:')}</p>
            {loadingCounts || !counts ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
                {[
                  ['📋 Kerja', counts.jobs],
                  ['👥 Pelanggan', counts.customers],
                  ['📄 Sebut Harga', counts.quotations],
                  ['📋 Work Order', counts.work_orders],
                  ['🧾 Invois', counts.invoices],
                  ['📷 Laporan Siap', counts.reports],
                  ['🧾 Resit', counts.receipts],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between">
                    <span>{label}</span>
                    <span className="font-medium">{val} rekod</span>
                  </div>
                ))}
              </div>
            )}

            {hasPaidPlan && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                ⚠️ Anda mempunyai langganan Pro aktif. Langganan akan dibatalkan serta-merta. Tiada bayaran balik untuk tempoh yang tidak digunakan.
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              💡 Sebelum memadam, pertimbangkan:
              <ul className="mt-1 ml-4 list-disc">
                <li>{tx('Export / screenshot invois penting')}</li>
                <li>{tx('Simpan maklumat pelanggan')}</li>
                <li>{tx('Download laporan yang diperlukan')}</li>
              </ul>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>← Kembali</Button>
              <Button variant="destructive" onClick={() => setStep(3)}>Teruskan →</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm">{tx('Akaun anda akan dipadam kekal pada:')}</p>
            <div className="text-center py-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-base font-bold text-blue-700">{scheduledStr}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {tx('Sebelum tarikh tersebut, anda boleh:')}
              <br />• Log masuk dan batalkan permintaan
              <br />• Hubungi <a href="mailto:customerservice@worktrace.my" className="underline">customerservice@worktrace.my</a>
            </p>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Taip <strong>{tx('PADAM')}</strong> {tx('untuk mengesahkan:')}</p>
              <Input value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())}
                placeholder={tx("Taip PADAM di sini")}
                className={confirmText === tx('PADAM') ? 'border-green-500' : confirmText ? 'border-destructive' : ''} />
            </div>

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={agreed} onCheckedChange={v => setAgreed(!!v)} className="mt-0.5" />
              <span>{tx('Saya faham bahawa tindakan ini tidak boleh dibatalkan selepas 14 hari dan semua data saya akan dipadam kekal.')}</span>
            </label>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>← Kembali</Button>
              <Button variant="destructive" onClick={handleConfirm}
                disabled={submitting || confirmText !== tx('PADAM') || !agreed}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Memproses...</> : tx('Sahkan Pemadaman')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

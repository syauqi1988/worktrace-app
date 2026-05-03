import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { getDateLocale } from '@/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
}

const REASON_KEYS = ['noUse', 'switching', 'expensive', 'missing', 'closed', 'other'] as const;

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reasonKey, setReasonKey] = useState<string>('');
  const [otherReason, setOtherReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [counts, setCounts] = useState<DataCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const deleteKeyword = t('dialog.deleteKeyword');

  useEffect(() => {
    if (!open) {
      setStep(1);
      setReasonKey('');
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

  const finalReason = reasonKey === 'other' ? otherReason.trim() : t(`dialog.reasons.${reasonKey}`);
  const hasPaidPlan = profile?.plan === 'pro' || profile?.plan === 'team';

  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + 14);
  const scheduledStr = scheduledAt.toLocaleDateString(getDateLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const handleConfirm = async () => {
    if (!user || confirmText !== deleteKeyword || !agreed) return;
    setSubmitting(true);
    try {
      const scheduledIso = scheduledAt.toISOString();

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

      await supabase.from('account_deletion_requests').insert({
        user_id: user.id,
        user_email: user.email || '',
        user_name: profile?.company_name || null,
        user_plan: profile?.plan || null,
        reason: finalReason,
        status: 'pending',
        scheduled_at: scheduledIso,
      } as any);

      if (hasPaidPlan) {
        await supabase.from('subscription_events').insert({
          user_id: user.id,
          event_type: 'cancelled',
          plan: profile?.plan,
          notes: 'Cancelled — account deletion',
        } as any);
      }

      try {
        await supabase.functions.invoke('send-ticket-email', {
          body: {
            ticket_number: `PEMADAMAN-${Date.now().toString(36).toUpperCase()}`,
            ticket_id: user.id,
            user_plan: profile?.plan || 'free',
            category: 'account',
            priority: 'high',
            subject: `[DELETION] ${profile?.company_name || user.email} requested account deletion`,
            description:
`User requested account deletion.

User: ${profile?.company_name || '-'}
Email: ${user.email}
Plan: ${profile?.plan || '-'}
Reason: ${finalReason}
Scheduled deletion: ${scheduledIso}

To cancel manually, update account_deletion_requests.status = 'cancelled' and profiles.account_status = 'active' for user_id: ${user.id}`,
          },
        });
      } catch (e) {
        console.warn('Admin notification failed', e);
      }

      localStorage.setItem('worktrace_deletion_scheduled', scheduledIso);
      await signOut();
      navigate('/goodbye', { replace: true });
    } catch (e: any) {
      toast.error(e.message || t('dialog.deleteFailed'));
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t('dialog.deleteAccountTitle')}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{t('dialog.stepXofY', { step })}</p>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
              <p className="text-sm font-medium text-red-700">{t('dialog.deleteWill')}</p>
              <ul className="text-sm text-red-700 space-y-0.5">
                <li>{t('dialog.deleteJobs')}</li>
                <li>{t('dialog.deleteQuotes')}</li>
                <li>{t('dialog.deleteWos')}</li>
                <li>{t('dialog.cancelSub')}</li>
                <li>{t('dialog.deleteFiles')}</li>
              </ul>
              <p className="text-sm text-red-700 mt-2">
                <Trans i18nKey="dialog.have14" components={[<strong key="0" />]} />
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t('dialog.reasonLabel')}</p>
              <div className="flex flex-wrap gap-2">
                {REASON_KEYS.map(k => (
                  <button key={k} onClick={() => setReasonKey(k)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                      reasonKey === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-accent'
                    }`}>
                    {t(`dialog.reasons.${k}`)}
                  </button>
                ))}
              </div>
              {reasonKey === 'other' && (
                <Textarea value={otherReason} onChange={e => setOtherReason(e.target.value)} rows={2} placeholder={t('dialog.otherPlaceholder')} />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={onClose}>{t('dialog.cancel')}</Button>
              <Button variant="destructive" onClick={() => setStep(2)}
                disabled={!reasonKey || (reasonKey === 'other' && !otherReason.trim())}>
                {t('dialog.continue')}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{t('dialog.dataLabel')}</p>
            {loadingCounts || !counts ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
                {([
                  ['jobs', counts.jobs],
                  ['customers', counts.customers],
                  ['quotations', counts.quotations],
                  ['workOrders', counts.work_orders],
                  ['invoices', counts.invoices],
                  ['reports', counts.reports],
                  ['receipts', counts.receipts],
                ] as const).map(([k, val]) => (
                  <div key={k} className="flex justify-between">
                    <span>{t(`dialog.${k}`)}</span>
                    <span className="font-medium">{t('dialog.records', { count: val })}</span>
                  </div>
                ))}
              </div>
            )}

            {hasPaidPlan && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                {t('dialog.paidPlanWarn')}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              {t('dialog.considerTitle')}
              <ul className="mt-1 ml-4 list-disc">
                <li>{t('dialog.considerExport')}</li>
                <li>{t('dialog.considerCustomers')}</li>
                <li>{t('dialog.considerReports')}</li>
              </ul>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>{t('dialog.back')}</Button>
              <Button variant="destructive" onClick={() => setStep(3)}>{t('dialog.continue')}</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm">{t('dialog.scheduledOn')}</p>
            <div className="text-center py-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-base font-bold text-blue-700">{scheduledStr}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('dialog.beforeThat')}
              <br />• {t('dialog.loginCancel')}
              <br />• {t('dialog.contactUs')} <a href="mailto:customerservice@worktrace.my" className="underline">customerservice@worktrace.my</a>
            </p>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">
                <Trans i18nKey="dialog.typeToConfirm" components={[<strong key="0" />]} />
              </p>
              <Input value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())}
                placeholder={t('dialog.typeHere')}
                className={confirmText === deleteKeyword ? 'border-green-500' : confirmText ? 'border-destructive' : ''} />
            </div>

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={agreed} onCheckedChange={v => setAgreed(!!v)} className="mt-0.5" />
              <span>{t('dialog.iUnderstand')}</span>
            </label>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>{t('dialog.back')}</Button>
              <Button variant="destructive" onClick={handleConfirm}
                disabled={submitting || confirmText !== deleteKeyword || !agreed}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> {t('dialog.processing')}</> : t('dialog.confirmDelete')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
import { getDateLocale } from '@/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  onCancelled: () => void;
}

const REASON_KEYS = ['expensive', 'noUse', 'missing', 'switching', 'paused', 'other'] as const;
const LOSE_KEYS = ['unlimitedJobs', 'unlimitedCustomers', 'shareWa', 'logoPdf', 'paymentInvoice', 'referral'] as const;

export default function CancellationDialog({ open, onClose, onCancelled }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [reasonKey, setReasonKey] = useState<string>('');
  const [otherReason, setOtherReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const endDateStr = profile?.subscription_end_date
    ? new Date(profile.subscription_end_date).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const finalReason = reasonKey === 'other' ? otherReason : t(`dialog.cancelReasons.${reasonKey}`);
  const cancelKeyword = t('dialog.cancelKeyword');

  const handleConfirm = async () => {
    if (confirmText !== cancelKeyword || !user) return;
    setLoading(true);
    try {
      await supabase.from('profiles').update({
        subscription_cancelled: true,
        cancel_requested_at: new Date().toISOString(),
        cancel_reason: finalReason,
      } as any).eq('id', user.id);

      await refreshProfile();
      toast.success(t('dialog.cancelSuccess', { date: endDateStr }), { duration: 8000 });
      onCancelled();
      resetAndClose();
    } catch {
      toast.error(t('dialog.cancelFailed'));
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setReasonKey('');
    setOtherReason('');
    setConfirmText('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetAndClose(); }}>
      <DialogContent className="max-w-[420px] rounded-xl p-0 gap-0">
        {step === 1 && (
          <div className="p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">{t('dialog.cancelTitle')}</h3>
            <div className="flex flex-wrap gap-2">
              {REASON_KEYS.map(k => (
                <button
                  key={k}
                  onClick={() => setReasonKey(k)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    reasonKey === k
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-foreground hover:bg-accent'
                  }`}
                >
                  {t(`dialog.cancelReasons.${k}`)}
                </button>
              ))}
            </div>
            {reasonKey === 'other' && (
              <textarea
                value={otherReason}
                onChange={e => setOtherReason(e.target.value)}
                placeholder={t('dialog.cancelOtherPlaceholder')}
                className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" onClick={resetAndClose} className="text-sm">{t('dialog.cancel')}</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!reasonKey || (reasonKey === 'other' && !otherReason.trim())}
                className="rounded-lg"
              >
                {t('dialog.cancelNext')}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">{t('dialog.dontGo')}</h3>
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-sm text-muted-foreground mb-2">{t('dialog.loseList')}</p>
              {LOSE_KEYS.map(k => (
                <div key={k} className="flex items-center gap-2 text-sm text-foreground">
                  <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                  {t(`dialog.loseItems.${k}`)}
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm text-blue-800">
                <Trans i18nKey="dialog.stillActive" values={{ date: endDateStr }} components={[<strong key="0" />]} />
              </p>
            </div>
            <Button onClick={resetAndClose} className="w-full rounded-lg">{t('dialog.stayPro')}</Button>
            <Button
              variant="outline"
              onClick={() => setStep(3)}
              className="w-full rounded-lg text-destructive border-destructive hover:bg-destructive/5"
            >
              {t('dialog.yesCancel')}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">{t('dialog.cancelConfirmTitle')}</h3>
            <p className="text-sm text-muted-foreground">
              <Trans i18nKey="dialog.cancelConfirmBody" values={{ date: endDateStr }} components={[<strong key="0" />]} />
            </p>
            <p className="text-sm text-muted-foreground">
              <Trans i18nKey="dialog.dataKept" components={[<strong key="0" />]} />
            </p>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('dialog.typeCancelConfirm')}</label>
              <Input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={t('dialog.typeCancelHere')}
                className={`h-11 rounded-lg ${confirmText === cancelKeyword ? 'border-green-500 focus-visible:ring-green-500' : confirmText ? 'border-destructive' : ''}`}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 rounded-lg">{t('dialog.kembali')}</Button>
              <Button
                onClick={handleConfirm}
                disabled={confirmText !== cancelKeyword || loading}
                className="flex-1 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t('dialog.confirmCancel')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

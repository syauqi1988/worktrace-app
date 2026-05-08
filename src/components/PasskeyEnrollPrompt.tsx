import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Fingerprint } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isPasskeySupported, enrollPasskey } from '@/lib/passkeys';
import { toast } from 'sonner';

export default function PasskeyEnrollPrompt() {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function maybeShow() {
      if (!user || !profile) return;
      if ((profile as any).passkey_prompt_dismissed) return;
      const supported = await isPasskeySupported();
      if (!supported) return;
      const { count } = await supabase
        .from('user_passkeys')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (cancelled) return;
      if ((count ?? 0) === 0) setOpen(true);
    }
    maybeShow();
    return () => { cancelled = true; };
  }, [user, profile]);

  const dismiss = async (permanent: boolean) => {
    setOpen(false);
    if (permanent && user) {
      await supabase.from('profiles').update({ passkey_prompt_dismissed: true } as any).eq('id', user.id);
      await refreshProfile();
    }
  };

  const enroll = async () => {
    setBusy(true);
    const res = await enrollPasskey();
    setBusy(false);
    if (res.ok) {
      toast.success(t('passkey.enrolledOk'));
      await dismiss(true);
    } else {
      toast.error(t('passkey.enrollFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Fingerprint className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{t('passkey.promptTitle')}</DialogTitle>
          <DialogDescription className="text-center">{t('passkey.promptBody')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={enroll} disabled={busy} className="w-full">
            {busy ? t('passkey.enrolling') : t('passkey.enableNow')}
          </Button>
          <Button variant="ghost" onClick={() => dismiss(false)} className="w-full">{t('passkey.notNow')}</Button>
          <button onClick={() => dismiss(true)} className="text-xs text-muted-foreground hover:underline">
            {t('passkey.dontAskAgain')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

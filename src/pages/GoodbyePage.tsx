import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { getDateLocale } from '@/i18n';

export default function GoodbyePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [scheduledDate, setScheduledDate] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('worktrace_deletion_scheduled');
    if (stored) {
      try {
        const d = new Date(stored);
        setScheduledDate(d.toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'long', year: 'numeric' }));
      } catch { /* ignore */ }
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-card border border-border rounded-2xl shadow-sm max-w-md w-full p-8 text-center space-y-4">
        <div className="text-5xl">😢</div>
        <h1 className="text-2xl font-bold text-foreground">{t('goodbye.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('goodbye.willDeleteOn')}</p>
        {scheduledDate ? (
          <p className="text-lg font-bold text-primary">{scheduledDate}</p>
        ) : (
          <p className="text-lg font-bold text-primary">{t('goodbye.in14Days')}</p>
        )}
        <p className="text-sm text-muted-foreground">{t('goodbye.untilThen')}</p>
        <Button onClick={() => navigate('/login')} className="w-full rounded-lg">
          {t('goodbye.loginToCancel')}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t('goodbye.inquiry')} <a href="mailto:customerservice@worktrace.my" className="underline">customerservice@worktrace.my</a>
        </p>
        <p className="text-xs text-muted-foreground">{t('goodbye.thanks')}</p>
      </div>
    </div>
  );
}

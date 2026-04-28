import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export default function AccountDeletedPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-card border border-border rounded-2xl shadow-sm max-w-md w-full p-8 text-center space-y-4">
        <div className="text-5xl">🗑️</div>
        <h1 className="text-2xl font-bold text-foreground">{t('accountDeleted.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('accountDeleted.body')}</p>
        <p className="text-sm text-muted-foreground">
          {t('accountDeleted.contact')}{' '}
          <a href="mailto:customerservice@worktrace.my" className="underline text-foreground">
            customerservice@worktrace.my
          </a>
        </p>
        <Button onClick={() => navigate('/login')} className="w-full rounded-lg">
          {t('accountDeleted.registerNew')}
        </Button>
      </div>
    </div>
  );
}

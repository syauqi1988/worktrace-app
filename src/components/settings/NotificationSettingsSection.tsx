import { Bell, BellOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function NotificationSettingsSection() {
  const { supported, status, busy, enable, disable } = usePushNotifications();
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{t('settings.deviceNotifications.heading')}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {t('settings.deviceNotifications.body')}
        </p>
      </div>

      {!supported && (
        <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
          {t('settings.deviceNotifications.unsupported')}
        </p>
      )}

      {supported && status === 'denied' && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-3">
          {t('settings.deviceNotifications.blocked')}
        </p>
      )}

      {supported && status !== 'denied' && (
        <button
          disabled={busy}
          onClick={status === 'subscribed' ? disable : enable}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            status === 'subscribed'
              ? 'border-border text-foreground hover:bg-sidebar-background'
              : 'bg-primary text-primary-foreground border-primary hover:opacity-90'
          }`}
        >
          {status === 'subscribed' ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {busy
            ? t('settings.deviceNotifications.wait')
            : status === 'subscribed'
            ? t('settings.deviceNotifications.disable')
            : t('settings.deviceNotifications.enable')}
        </button>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle2, XCircle, MessageSquare, Wallet, Check, Megaphone, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';

function iconFor(type: string) {
  switch (type) {
    case 'approval_accepted': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'approval_rejected': return <XCircle className="h-4 w-4 text-destructive" />;
    case 'payment_proof': return <Wallet className="h-4 w-4 text-primary" />;
    case 'ticket_reply': return <MessageSquare className="h-4 w-4 text-primary" />;
    case 'announcement': return <Megaphone className="h-4 w-4 text-primary" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function timeAgo(iso: string, justNow: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return justNow;
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const justNow = i18n.language === 'en' ? 'just now' : 'baru sahaja';

  // Listen for SW navigation messages (push click)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'navigate' && event.data.link) navigate(event.data.link);
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [navigate]);

  const onClick = async (n: AppNotification) => {
    setOpen(false);
    if (!n.read_at) markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative mr-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative h-8 w-8 rounded-full border border-border bg-transparent text-muted-foreground flex items-center justify-center hover:bg-accent transition-colors"
            aria-label={t('notifications.title')}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] font-bold h-4 min-w-[16px] rounded-full flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{t('notifications.title')}</TooltipContent>
      </Tooltip>

      {open && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/20 md:bg-transparent" onClick={() => setOpen(false)} />
          <div
            className="fixed left-2 right-2 top-[3.5rem] md:absolute md:left-auto md:right-0 md:top-auto md:mt-2 md:w-[360px] bg-card rounded-xl border border-border z-[70] overflow-hidden"
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{t('notifications.title')}</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
                  <Check className="h-3 w-3" /> {t('notifications.markAllRead')}
                </button>
              )}
            </div>
            <div className="max-h-[70vh] md:max-h-[420px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t('notifications.empty')}
                </div>
              ) : (
                items.map((n) => {
                  const lang = i18n.language === 'en' ? 'en' : 'ms';
                  const title = n.i18n?.title?.[lang] || n.title;
                  const body = n.i18n?.body?.[lang] || n.body;
                  return (
                  <button
                    key={n.id}
                    onClick={() => onClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-sidebar-background transition-colors flex gap-3 ${
                      !n.read_at ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">{iconFor(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{title}</p>
                      {body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{body}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at, justNow)}</p>
                    </div>
                    {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />}
                  </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

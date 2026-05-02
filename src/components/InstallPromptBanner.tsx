import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPromptBanner() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    try { if (window.self !== window.top) return; } catch { return; }
    if (window.location.hostname.includes('id-preview--')) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((navigator as any).standalone === true) return;
    const dismissedAt = localStorage.getItem('install-dismissed-at');
    if (dismissedAt && Date.now() - Number(dismissedAt) < 24 * 60 * 60 * 1000) return;

    const ua = navigator.userAgent;
    const iosDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iosDevice);
    if (iosDevice) {
      const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
      if (isSafari) setShowBanner(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowBanner(false);
    localStorage.setItem('install-dismissed-at', String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 text-sm relative z-[60]">
      {isIOS ? (
        <>
          <Share className="h-5 w-5 shrink-0" />
          <p className="flex-1" dangerouslySetInnerHTML={{ __html: t('install.iosBody') }} />
        </>
      ) : (
        <>
          <Download className="h-5 w-5 shrink-0" />
          <p className="flex-1">{t('install.androidBody')}</p>
          <button
            onClick={handleInstall}
            className="shrink-0 px-3 py-1 rounded-md bg-primary-foreground text-primary text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            {t('install.install')}
          </button>
        </>
      )}
      <button onClick={dismiss} className="shrink-0 hover:opacity-70 transition-opacity" aria-label={t('install.close')}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

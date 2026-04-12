import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Skip in iframe or preview domain
    try {
      if (window.self !== window.top) return;
    } catch { return; }
    if (window.location.hostname.includes('id-preview--') || window.location.hostname.includes('lovableproject.com')) return;

    // Already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((navigator as any).standalone === true) return;

    // Already dismissed this session
    if (sessionStorage.getItem('install-dismissed')) return;

    // Detect iOS
    const ua = navigator.userAgent;
    const iosDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iosDevice);

    if (iosDevice) {
      // On iOS Safari, show manual instructions
      const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
      if (isSafari) setShowBanner(true);
      return;
    }

    // Android/Chrome: listen for beforeinstallprompt
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
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('install-dismissed', '1');
  };

  if (!showBanner) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 text-sm relative z-[60]">
      {isIOS ? (
        <>
          <Share className="h-5 w-5 shrink-0" />
          <p className="flex-1">
            Pasang WorkTrace: ketik <strong>Share</strong> <Share className="inline h-3.5 w-3.5" /> → <strong>Add to Home Screen</strong>
          </p>
        </>
      ) : (
        <>
          <Download className="h-5 w-5 shrink-0" />
          <p className="flex-1">Pasang WorkTrace untuk akses pantas dari skrin utama.</p>
          <button
            onClick={handleInstall}
            className="shrink-0 px-3 py-1 rounded-md bg-primary-foreground text-primary text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Pasang
          </button>
        </>
      )}
      <button onClick={dismiss} className="shrink-0 hover:opacity-70 transition-opacity" aria-label="Tutup">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

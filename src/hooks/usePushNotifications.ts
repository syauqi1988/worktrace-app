import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from '@/lib/pushConfig';

type Status = 'unsupported' | 'denied' | 'default' | 'subscribed' | 'unsubscribed';

export function usePushNotifications() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>('default');
  const [busy, setBusy] = useState(false);

  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const refresh = useCallback(async () => {
    if (!supported) { setStatus('unsupported'); return; }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) setStatus('subscribed');
      else setStatus(Notification.permission === 'granted' ? 'unsubscribed' : 'default');
    } catch {
      setStatus('default');
    }
  }, [supported]);

  useEffect(() => { refresh(); }, [refresh]);

  const enable = async () => {
    if (!supported || !user) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus(perm === 'denied' ? 'denied' : 'default'); return; }
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json: any = sub.toJSON();
      await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: 'endpoint' }
      );
      setStatus('subscribed');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      }
      setStatus('unsubscribed');
    } finally {
      setBusy(false);
    }
  };

  return { supported, status, busy, enable, disable, refresh };
}

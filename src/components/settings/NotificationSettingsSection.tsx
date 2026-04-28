import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { tx } from '@/lib/tx';

export default function NotificationSettingsSection() {
  const { supported, status, busy, enable, disable } = usePushNotifications();

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Notifikasi Peranti</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Terima notifikasi pada telefon atau komputer anda apabila pelanggan mengesahkan/menolak dokumen,
          menghantar bukti pembayaran, atau pasukan sokongan membalas tiket anda.
        </p>
      </div>

      {!supported && (
        <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
          Pelayar anda tidak menyokong notifikasi. Untuk iPhone, sila pasang aplikasi ke skrin utama dahulu.
        </p>
      )}

      {supported && status === 'denied' && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-3">
          {tx('Notifikasi telah disekat. Sila benarkan dalam tetapan pelayar anda untuk laman ini.')}
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
            ? 'Sila tunggu…'
            : status === 'subscribed'
            ? 'Matikan notifikasi peranti'
            : 'Aktifkan notifikasi peranti'}
        </button>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Fingerprint, Trash2 } from 'lucide-react';
import { isPasskeySupported, listMyPasskeys, enrollPasskey, deletePasskey } from '@/lib/passkeys';
import { toast } from 'sonner';

type Row = { id: string; device_label: string | null; created_at: string; last_used_at: string | null };

export default function SecuritySection() {
  const { t, i18n } = useTranslation();
  const [supported, setSupported] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try { setRows((await listMyPasskeys()) as Row[]); } catch {}
    setLoading(false);
  };

  useEffect(() => {
    isPasskeySupported().then(setSupported);
    refresh();
  }, []);

  const add = async () => {
    setBusy(true);
    const res = await enrollPasskey();
    setBusy(false);
    if (res.ok) { toast.success(t('passkey.enrolledOk')); refresh(); }
    else toast.error(t('passkey.enrollFailed'));
  };

  const remove = async (id: string) => {
    try { await deletePasskey(id); toast.success(t('passkey.removed')); refresh(); }
    catch { toast.error(t('passkey.enrollFailed')); }
  };

  const fmt = (iso: string | null) => {
    if (!iso) return t('passkey.neverUsed');
    try { return new Date(iso).toLocaleDateString(i18n.language); } catch { return iso; }
  };

  return (
    <div className="space-y-4">
      {!supported && (
        <p className="text-sm text-muted-foreground">{t('passkey.notSupported')}</p>
      )}
      <Button onClick={add} disabled={!supported || busy} className="w-full sm:w-auto">
        <Fingerprint className="h-4 w-4 mr-2" />
        {busy ? t('passkey.enrolling') : t('passkey.addThisDevice')}
      </Button>

      {loading ? null : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('passkey.noDevices')}</p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 p-3">
              <Fingerprint className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.device_label || 'Device'}</p>
                <p className="text-xs text-muted-foreground">{t('passkey.lastUsed', { when: fmt(r.last_used_at) })}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(r.id)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-1" /> {t('passkey.remove')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

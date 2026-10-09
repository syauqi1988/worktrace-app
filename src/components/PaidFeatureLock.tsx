import { createContext, useContext, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useL } from '@/i18n/dual';
import UpgradeModal from '@/components/UpgradeModal';

type Ctx = { readOnly: boolean; requestUpgrade: () => void };
const ReadOnlyCtx = createContext<Ctx>({ readOnly: false, requestUpgrade: () => {} });
export const useReadOnly = () => useContext(ReadOnlyCtx);

/** Wraps Purchases, Bank, Accounting and Reports: free users can view but not add, edit or delete. */
export default function PaidFeatureLock() {
  const { profile } = useAuth();
  const L = useL();
  const readOnly = !profile || profile.plan === 'free';
  const [open, setOpen] = useState(false);
  const requestUpgrade = () => setOpen(true);

  return (
    <ReadOnlyCtx.Provider value={{ readOnly, requestUpgrade }}>
      {readOnly && (
        <div className="mx-4 mt-4 md:mx-6 rounded-xl border border-border bg-muted/50 p-3 flex items-center gap-3">
          <Lock className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-foreground flex-1">
            {L('View only on the Free plan. Upgrade to add, edit or delete.', 'Lihat sahaja untuk pelan Percuma. Naik taraf untuk tambah, sunting atau padam.')}
          </p>
          <Button size="sm" onClick={requestUpgrade}>{L('Upgrade', 'Naik Taraf')}</Button>
        </div>
      )}
      <Outlet />
      <UpgradeModal open={open} onClose={() => setOpen(false)} reason={L('This feature needs a paid plan.', 'Ciri ini memerlukan pelan berbayar.')} />
    </ReadOnlyCtx.Provider>
  );
}

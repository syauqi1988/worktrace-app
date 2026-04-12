import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Lock } from 'lucide-react';
import { useBillPlz } from '@/hooks/useBillPlz';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

const PRO_FEATURES = [
  'Kerja aktif tanpa had',
  'Pelanggan tanpa had',
  'WhatsApp share',
  'Logo di PDF',
  'Sistem referral',
];

export default function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  const { initiatePayment, isLoading } = useBillPlz();

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[420px] rounded-xl p-6">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3">
            <Lock className="h-10 w-10 text-primary mx-auto" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Had Pelan Free Dicapai
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            {reason || 'Anda telah mencapai had pelan Free. Naik taraf ke Pro untuk akses tanpa had.'}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 my-4">
          {PRO_FEATURES.map(f => (
            <li key={f} className="flex items-center gap-2 text-sm text-foreground">
              <Check className="h-4 w-4 text-green-600 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <div className="text-center mb-4">
          <span className="text-sm text-muted-foreground line-through">RM79</span>{' '}
          <span className="text-2xl font-bold text-primary">RM49</span>
          <span className="text-sm text-muted-foreground">/bulan</span>
          <p className="text-xs text-green-600 font-medium mt-1">Early bird terhad masa!</p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => initiatePayment('pro', 'monthly')}
            disabled={isLoading}
            className="w-full rounded-lg"
          >
            {isLoading ? 'Memproses...' : 'Upgrade ke Pro — RM49/bulan'}
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full rounded-lg text-muted-foreground">
            Mungkin lain kali
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

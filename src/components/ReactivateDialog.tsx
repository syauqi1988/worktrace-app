import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBillPlz } from '@/hooks/useBillPlz';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ReactivateDialog({ open, onClose }: Props) {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const { initiatePayment, isLoading } = useBillPlz();
  const price = period === 'monthly' ? 49 : 468;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[400px] rounded-xl">
        <h3 className="text-base font-bold text-foreground">Aktifkan Semula Langganan Pro</h3>
        <p className="text-sm text-muted-foreground">
          Aktifkan semula langganan Pro anda dan nikmati semua ciri premium.
        </p>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setPeriod('monthly')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${period === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
          >
            Bulanan
          </button>
          <button
            onClick={() => setPeriod('yearly')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${period === 'yearly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
          >
            Tahunan -20%
          </button>
        </div>
        <Button
          onClick={() => initiatePayment('pro', period)}
          disabled={isLoading}
          className="w-full rounded-lg"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Bayar RM{price}/{period === 'monthly' ? 'bulan' : 'tahun'}
        </Button>
        <Button variant="outline" onClick={onClose} className="w-full rounded-lg">Batal</Button>
      </DialogContent>
    </Dialog>
  );
}

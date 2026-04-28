import { useNavigate } from 'react-router-dom';
import { XCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tx } from '@/lib/tx';

export default function PaymentFailedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border p-8 max-w-md w-full text-center space-y-6">
        <XCircle className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">{tx('Pembayaran Tidak Berjaya')}</h1>
        <p className="text-muted-foreground">
          {tx('Pembayaran tidak dapat diproses. Tiada bayaran akan dikenakan.')}
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => navigate('/settings')} className="w-full rounded-lg">
            {tx('Cuba Lagi')}
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-lg gap-2"
            onClick={() => window.open('https://wa.me/60123456789?text=Saya+perlu+bantuan+pembayaran+WorkTrace', '_blank')}
          >
            <MessageCircle className="h-4 w-4" /> {tx('Hubungi Sokongan via WhatsApp')}
          </Button>
        </div>
      </div>
    </div>
  );
}

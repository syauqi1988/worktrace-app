import { useNavigate } from 'react-router-dom';
import { openWhatsApp, buildWhatsAppUrl } from '@/lib/whatsapp';
import { useTranslation } from 'react-i18next';
import { XCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaymentFailedPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border p-8 max-w-md w-full text-center space-y-6">
        <XCircle className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">{t('paymentFailed.title')}</h1>
        <p className="text-muted-foreground">{t('paymentFailed.body')}</p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => navigate('/settings')} className="w-full rounded-lg">
            {t('paymentFailed.tryAgain')}
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-lg gap-2"
            onClick={() => openWhatsApp('60123456789', 'Saya perlu bantuan pembayaran WorkTrace')}
          >
            <MessageCircle className="h-4 w-4" /> {t('paymentFailed.contactSupport')}
          </Button>
        </div>
      </div>
    </div>
  );
}

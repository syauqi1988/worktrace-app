import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Megaphone, AlertTriangle, CheckCircle2, Info, AlertOctagon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useActiveAnnouncement } from '@/hooks/useActiveAnnouncement';

function severityStyles(sev: string) {
  switch (sev) {
    case 'warning':
      return { icon: <AlertTriangle className="h-5 w-5 text-amber-500" />, bar: 'bg-amber-500' };
    case 'success':
      return { icon: <CheckCircle2 className="h-5 w-5 text-green-600" />, bar: 'bg-green-600' };
    case 'critical':
      return { icon: <AlertOctagon className="h-5 w-5 text-destructive" />, bar: 'bg-destructive' };
    case 'info':
      return { icon: <Info className="h-5 w-5 text-primary" />, bar: 'bg-primary' };
    default:
      return { icon: <Megaphone className="h-5 w-5 text-primary" />, bar: 'bg-primary' };
  }
}

export default function AnnouncementModal() {
  const { announcement, dismiss } = useActiveAnnouncement();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  if (!announcement) return null;
  const isEn = i18n.language === 'en';
  const title = isEn ? announcement.title_en : announcement.title_ms;
  const body = isEn ? announcement.body_en : announcement.body_ms;
  const { icon, bar } = severityStyles(announcement.severity);

  const handleLink = () => {
    const link = announcement.link!;
    dismiss();
    if (/^https?:\/\//i.test(link)) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      navigate(link);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <div className={`h-1 w-full ${bar}`} />
        <div className="p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {icon}
              <DialogTitle>{title}</DialogTitle>
            </div>
            {body && <DialogDescription className="whitespace-pre-line pt-2">{body}</DialogDescription>}
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            {announcement.link && (
              <Button onClick={handleLink}>
                {t('announcement.viewMore', { defaultValue: isEn ? 'Learn more' : 'Lihat lagi' })}
              </Button>
            )}
            <Button variant="outline" onClick={() => dismiss()}>
              {t('announcement.dismiss', { defaultValue: isEn ? 'Dismiss' : 'Tutup' })}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

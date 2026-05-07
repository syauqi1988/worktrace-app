import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Megaphone, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useActiveAnnouncement } from '@/hooks/useActiveAnnouncement';

function iconFor(sev: string) {
  if (sev === 'warning') return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  if (sev === 'success') return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (sev === 'info') return <Info className="h-5 w-5 text-primary" />;
  return <Megaphone className="h-5 w-5 text-primary" />;
}

export default function AnnouncementModal() {
  const { announcement, dismiss } = useActiveAnnouncement();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  if (!announcement) return null;
  const isEn = i18n.language === 'en';
  const title = isEn ? announcement.title_en : announcement.title_ms;
  const body = isEn ? announcement.body_en : announcement.body_ms;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {iconFor(announcement.severity)}
            <DialogTitle>{title}</DialogTitle>
          </div>
          {body && <DialogDescription className="whitespace-pre-line pt-2">{body}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2">
          {announcement.link && (
            <Button onClick={() => { const link = announcement.link!; dismiss(); navigate(link); }}>
              {t('announcement.viewMore', { defaultValue: isEn ? 'Learn more' : 'Lihat lagi' })}
            </Button>
          )}
          <Button variant="outline" onClick={() => dismiss()}>
            {t('announcement.dismiss', { defaultValue: isEn ? 'Dismiss' : 'Tutup' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

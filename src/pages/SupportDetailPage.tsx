import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Paperclip, X, CheckCircle2, Mail } from 'lucide-react';
import { getDateLocale } from '@/i18n';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

const BUCKET = 'ticket-attachments';

function storagePath(url: string) {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  const raw = i >= 0 ? url.slice(i + marker.length).split('?')[0] : url;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

function Attachment({ url, index }: { url: string; index: number }) {
  const { t } = useTranslation();
  const [signed, setSigned] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.storage.from(BUCKET).createSignedUrl(storagePath(url), 3600).then(({ data }) => {
      if (active) setSigned(data?.signedUrl ?? null);
    });
    return () => { active = false; };
  }, [url]);

  const href = signed || url;
  const isImage = /\.(png|jpe?g|gif|webp|heic|bmp)$/i.test(storagePath(url));

  return (
    <div className="space-y-1">
      <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
        <Paperclip className="h-3 w-3" />
        {t('supportDetail.fileN', { n: index + 1 })}
      </a>
      {isImage && signed && (
        <a href={signed} target="_blank" rel="noopener noreferrer" className="block">
          <img src={signed} alt={t('supportDetail.fileN', { n: index + 1 })} className="max-h-64 rounded-lg border border-border object-contain" loading="lazy" />
        </a>
      )}
    </div>
  );
}

export default function SupportDetailPage() {

  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showBanner, setShowBanner] = useState(searchParams.get('new') === 'true');

  const fetchData = async () => {
    if (!id || !user) return;
    const [{ data: tk }, { data: r }] = await Promise.all([
      supabase.from('support_tickets').select('*').eq('id', id).single(),
      supabase.from('ticket_replies').select('*').eq('ticket_id', id).order('created_at', { ascending: true }),
    ]);
    setTicket(tk);
    setReplies(r || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id, user]);

  useEffect(() => {
    if (showBanner) {
      const timer = setTimeout(() => setShowBanner(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [showBanner]);

  const handleReply = async () => {
    if (!replyText.trim() || !user || !id) return;
    setSending(true);
    try {
      await supabase.from('ticket_replies').insert({
        ticket_id: id,
        user_id: user.id,
        sender_type: 'user',
        message: replyText.trim(),
      } as any);
      await supabase.from('support_tickets').update({ updated_at: new Date().toISOString() } as any).eq('id', id);
      setReplyText('');
      await fetchData();
      toast.success(t('supportDetail.replySent'));
    } catch {
      toast.error(t('supportDetail.replyFailed'));
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!id) return;
    setClosing(true);
    try {
      await supabase.from('support_tickets').update({ status: 'closed', resolved_at: new Date().toISOString() } as any).eq('id', id);
      await fetchData();
      toast.success(t('supportDetail.ticketClosed'));
    } catch {
      toast.error(t('supportDetail.closeFailed'));
    } finally {
      setClosing(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground text-sm">{t('supportDetail.loading')}</div>;
  if (!ticket) return <div className="p-6 text-center text-muted-foreground">{t('supportDetail.notFound')}</div>;

  const attachments: string[] = Array.isArray(ticket.attachments) ? ticket.attachments : [];
  const locale = getDateLocale();


  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-muted-foreground">{ticket.ticket_number}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[ticket.status] || ''}`}>
              {t(`supportDetail.status.${ticket.status}`, { defaultValue: ticket.status })}
            </span>
          </div>
        </div>
      </div>

      {showBanner && (
        <div className="rounded-xl border p-4 flex items-start gap-3" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <Mail className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#166534' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#166534' }}>{t('supportDetail.successBannerTitle')}</p>
            <p className="text-sm mt-1" style={{ color: '#166534' }}>
              {t('supportDetail.ticketNumber')} <strong>{ticket.ticket_number}</strong>
            </p>
            <p className="text-xs mt-1" style={{ color: '#15803d' }}>
              {t('supportDetail.confirmationSent', { email: ticket.user_email })}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#15803d' }}>
              {t('supportDetail.replyWithin')}
            </p>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-4 space-y-2 text-sm">
        <p><span className="text-muted-foreground">{t('supportDetail.category')}</span> {t(`supportNew.category.${ticket.category}`, { defaultValue: ticket.category })}</p>
        <p><span className="text-muted-foreground">{t('supportDetail.priority')}</span> {t(`supportNew.priority.${ticket.priority}`, { defaultValue: ticket.priority })}</p>
        <p><span className="text-muted-foreground">{t('supportDetail.submitted')}</span> {new Date(ticket.created_at).toLocaleString(locale)}</p>
        <p><span className="text-muted-foreground">{t('supportDetail.updated')}</span> {new Date(ticket.updated_at).toLocaleString(locale)}</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h2 className="text-base font-bold text-foreground">{ticket.subject}</h2>
        <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.description}</p>
        {attachments.length > 0 && (
          <div className="space-y-1 pt-2">
            <p className="text-xs text-muted-foreground font-medium">{t('supportDetail.attachments')}</p>
            {attachments.map((url: string, i: number) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                <Paperclip className="h-3 w-3" />
                {t('supportDetail.fileN', { n: i + 1 })}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">{t('supportDetail.replies')}</h3>
        {replies.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t('supportDetail.noReplies')}</p>
        ) : (
          replies.map(r => (
            <div
              key={r.id}
              className="rounded-xl p-4 space-y-1"
              style={{
                backgroundColor: r.sender_type === 'admin' ? '#F0FDF4' : '#EFF6FF',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">
                  {r.sender_type === 'admin' ? t('supportDetail.supportName') : t('supportDetail.you')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString(locale)}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{r.message}</p>
            </div>
          ))
        )}
      </div>

      {ticket.status !== 'closed' && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <Textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder={t('supportDetail.replyPlaceholder')}
            rows={3}
          />
          <Button onClick={handleReply} disabled={sending || !replyText.trim()} className="rounded-lg">
            {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t('supportDetail.sendReply')}
          </Button>
        </div>
      )}

      {ticket.status === 'resolved' && (
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={closing}
          className="w-full rounded-lg text-green-600 border-green-300 hover:bg-green-50"
        >
          {closing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          <CheckCircle2 className="h-4 w-4 mr-1" /> {t('supportDetail.markResolved')}
        </Button>
      )}
    </div>
  );
}

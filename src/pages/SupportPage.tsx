import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, PartyPopper } from 'lucide-react';
import { getDateLocale } from '@/i18n';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'text-gray-500',
  normal: 'text-blue-600',
  high: 'text-amber-600',
  urgent: 'text-red-600',
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: '🐛 Bug',
  billing: '💳 Billing',
  feature: '💡 Suggestion',
  account: '👤 Account',
  general: '❓ General',
};

export default function SupportPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { t: tr, i18n } = useTranslation();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const priorityLabels: Record<string, string> = i18n.language === 'en'
    ? { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' }
    : { low: 'Rendah', normal: 'Normal', high: 'Tinggi', urgent: 'Urgent' };

  useEffect(() => {
    if (!user) return;
    // Update last_support_visit
    supabase.from('profiles').update({ last_support_visit: new Date().toISOString() } as any).eq('id', user.id).then(() => {});

    supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTickets(data || []);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{tr('support.title')}</h1>
        <Button data-tutorial="support-new-btn" onClick={() => navigate('/support/new')} className="rounded-lg gap-1.5" size="sm">
          <Plus className="h-4 w-4" /> {tr('support.newTicket')}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">{tr('common.loading')}</div>
      ) : tickets.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center space-y-3">
          <PartyPopper className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-base font-medium text-foreground">{tr('support.empty')}</p>
          <p className="text-sm text-muted-foreground">{tr('support.emptyDesc')}</p>
          <Button onClick={() => navigate('/support/new')} className="rounded-lg gap-1.5">
            <Plus className="h-4 w-4" /> {tr('support.createTicket')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <button
              key={t.id}
              onClick={() => navigate(`/support/${t.id}`)}
              className="w-full text-left bg-card rounded-xl border border-border p-4 space-y-2 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground">{t.ticket_number}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[t.status] || STATUS_STYLES.open}`}>
                  {STATUS_LABELS[t.status] || t.status}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">{t.subject}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{CATEGORY_LABELS[t.category] || t.category}</span>
                <span>•</span>
                <span className={PRIORITY_STYLES[t.priority] || ''}>
                  {priorityLabels[t.priority] || priorityLabels.normal}
                </span>
                <span>•</span>
                <span>{new Date(t.created_at).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Announcement = {
  id: string;
  title_ms: string;
  title_en: string;
  body_ms: string | null;
  body_en: string | null;
  link: string | null;
  severity: string;
  show_popup: boolean;
  expires_at: string | null;
  published_at: string;
};

export function useActiveAnnouncement() {
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  const load = useCallback(async () => {
    if (!user) { setAnnouncement(null); return; }
    const { data: reads } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', user.id);
    const seenIds = (reads || []).map((r: any) => r.announcement_id);

    let q = supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .eq('show_popup', true)
      .order('published_at', { ascending: false })
      .limit(1);
    if (seenIds.length) q = q.not('id', 'in', `(${seenIds.join(',')})`);

    const { data } = await q;
    const row = data?.[0] as Announcement | undefined;
    if (row && (!row.expires_at || new Date(row.expires_at) > new Date())) {
      setAnnouncement(row);
    } else {
      setAnnouncement(null);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const dismiss = useCallback(async () => {
    if (!user || !announcement) return;
    setAnnouncement(null);
    await supabase
      .from('announcement_reads')
      .insert({ announcement_id: announcement.id, user_id: user.id });
  }, [user, announcement]);

  return { announcement, dismiss };
}

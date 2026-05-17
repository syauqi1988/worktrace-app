import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RealtimeSub {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

/**
 * Subscribe to postgres_changes on one or more tables and call `onChange`
 * whenever any of them fire. Channel is created/cleaned per-key change.
 */
export function useRealtimeRefetch(
  channelKey: string | null | undefined,
  subs: RealtimeSub[],
  onChange: () => void,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled || !channelKey) return;
    const ch = supabase.channel(`rt-${channelKey}`);
    subs.forEach((s) => {
      ch.on(
        'postgres_changes' as any,
        { event: s.event ?? '*', schema: 'public', table: s.table, ...(s.filter ? { filter: s.filter } : {}) } as any,
        () => onChange(),
      );
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelKey, enabled]);
}

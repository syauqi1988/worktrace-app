import { supabase } from '@/integrations/supabase/client';

function randomCode(len = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Returns a short URL like https://yourapp.com/r/Ab12Cd that redirects to targetUrl.
 * Reuses an existing code for the same (user, target) when possible.
 */
export async function getOrCreateShortLink(params: {
  userId: string;
  targetUrl: string;
  kind?: string;
}): Promise<string> {
  const { userId, targetUrl, kind = 'generic' } = params;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Reuse existing
  const { data: existing } = await supabase
    .from('short_links')
    .select('code')
    .eq('user_id', userId)
    .eq('target_url', targetUrl)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.code) return `${origin}/r/${existing.code}`;

  // Create new with retries on collision
  for (let i = 0; i < 5; i++) {
    const code = randomCode(6);
    const { error } = await supabase
      .from('short_links')
      .insert({ code, target_url: targetUrl, user_id: userId, kind } as any);
    if (!error) return `${origin}/r/${code}`;
    // 23505 = unique violation; retry. Anything else: bail with full url.
    if ((error as any).code !== '23505') break;
  }
  return targetUrl;
}

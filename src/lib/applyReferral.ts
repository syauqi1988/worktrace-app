import { supabase } from '@/integrations/supabase/client';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

export async function applyReferralFromUrl() {
  const ref = new URL(window.location.href).searchParams.get('ref');
  if (!ref) return;

  // must be called after user is authenticated
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session) return;

  const res = await fetch(
    `${supabaseUrl}/functions/v1/apply-referral?ref=${encodeURIComponent(ref)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? 'Failed to apply referral');
}

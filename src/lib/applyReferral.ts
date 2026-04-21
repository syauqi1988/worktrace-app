import { supabase } from '@/integrations/supabase/client';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

export async function applyReferralFromUrl() {
  const ref = new URL(window.location.href).searchParams.get('ref');
  console.log('applyReferralFromUrl ref:', ref);
  if (!ref) return;

  // must be called after user is authenticated
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  console.log('session exists:', !!session);
  console.log('access_token length:', session?.access_token?.length);
  console.log('access_token startsWith:', session?.access_token?.slice(0, 10));

  if (error || !session?.access_token) {
    console.error('No session/access_token yet', error);
    return;
  }

  const token = session.access_token;
  const res = await fetch(
    `${supabaseUrl}/functions/v1/apply-referral?ref=${encodeURIComponent(ref)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const bodyText = await res.text();
  console.log('applyReferral status:', res.status);
  console.log('applyReferral body:', bodyText);

  if (!res.ok) {
    let msg = bodyText;
    try { msg = JSON.parse(bodyText)?.error ?? bodyText; } catch {}
    throw new Error(msg || 'Failed to apply referral');
  }
}

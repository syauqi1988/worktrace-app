import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('id, plan, subscription_end_date, subscription_status, free_months_earned, free_months_used')
      .eq('id', user.id)
      .single();

    if (profErr || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!profile.plan || profile.plan === 'free') {
      return new Response(JSON.stringify({ error: 'Hanya pengguna pelan berbayar boleh menggunakan bulan percuma. Sila upgrade dahulu.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const balance = (profile.free_months_earned || 0) - (profile.free_months_used || 0);
    if (balance <= 0) {
      return new Response(JSON.stringify({ error: 'Tiada baki bulan percuma' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extend from current end date if active, otherwise from now
    const now = new Date();
    const existingEnd = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
    const base = existingEnd && existingEnd.getTime() > now.getTime() ? existingEnd : now;
    const newEnd = new Date(base);
    newEnd.setMonth(newEnd.getMonth() + balance);

    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        subscription_end_date: newEnd.toISOString(),
        free_months_used: (profile.free_months_used || 0) + balance,
        subscription_status: 'active',
      })
      .eq('id', user.id);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await admin.from('subscription_events').insert({
      user_id: user.id,
      event_type: 'free_months_applied',
      plan: profile.plan,
      notes: `Applied ${balance} free month(s) from referrals`,
    });

    return new Response(JSON.stringify({
      ok: true,
      monthsApplied: balance,
      newEndDate: newEnd.toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

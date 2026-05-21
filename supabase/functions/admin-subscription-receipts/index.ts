// Admin API for the separate admin app to manage HS Partnership PLT
// subscription receipts.
//
// Auth: requires an admin JWT (admin_users.is_active = true) OR the project's
// SERVICE ROLE key.
//
// Endpoints (all on this single function, action via `?action=` or POST body):
//   GET    ?action=list&search=&status=&limit=&offset=
//   GET    ?action=get&id=<uuid>
//   GET    ?action=download&id=<uuid>     -> { signed_url }
//   POST   { action: 'update', id, patch: { status?, admin_notes? } }
//   POST   { action: 'regenerate', id, resend_email?: boolean }
//   POST   { action: 'resend_email', id }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

async function requireAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.replace('Bearer ', '');
  if (token === SERVICE_ROLE) return true;
  const userClient = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data: { user } } = await userClient.auth.getUser(token);
  if (!user) return false;
  const { data: adm } = await admin
    .from('admin_users').select('id').eq('user_id', user.id).eq('is_active', true).maybeSingle();
  return !!adm;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!await requireAdmin(req)) return json({ error: 'Unauthorized' }, 401);

    const url = new URL(req.url);
    const action = (url.searchParams.get('action') || (req.method === 'POST' ? (await req.clone().json().catch(() => ({}))).action : '') || '').toString();

    if (req.method === 'GET' && action === 'list') {
      const search = url.searchParams.get('search') || '';
      const status = url.searchParams.get('status') || '';
      const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
      const offset = Number(url.searchParams.get('offset') || 0);
      let q = admin.from('subscription_receipts').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      if (search) q = q.or(`receipt_number.ilike.%${search}%,user_email.ilike.%${search}%,user_name.ilike.%${search}%,billplz_bill_id.ilike.%${search}%`);
      q = q.range(offset, offset + limit - 1);
      const { data, count, error } = await q;
      if (error) throw error;
      return json({ items: data, total: count });
    }

    if (req.method === 'GET' && action === 'get') {
      const id = url.searchParams.get('id') || '';
      const { data, error } = await admin.from('subscription_receipts').select('*').eq('id', id).single();
      if (error) throw error;
      return json({ item: data });
    }

    if (req.method === 'GET' && action === 'download') {
      const id = url.searchParams.get('id') || '';
      const { data: row, error } = await admin.from('subscription_receipts').select('pdf_path').eq('id', id).single();
      if (error) throw error;
      if (!row?.pdf_path) return json({ error: 'PDF not available' }, 404);
      const { data: signed, error: sErr } = await admin.storage.from('subscription-receipts').createSignedUrl(row.pdf_path, 60 * 10);
      if (sErr) throw sErr;
      return json({ signed_url: signed.signedUrl });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const id: string = body.id;
      if (!id) return json({ error: 'id required' }, 400);

      if (body.action === 'update') {
        const patch: any = {};
        if (typeof body.patch?.status === 'string') patch.status = body.patch.status;
        if (typeof body.patch?.admin_notes === 'string') patch.admin_notes = body.patch.admin_notes;
        const { data, error } = await admin.from('subscription_receipts').update(patch).eq('id', id).select('*').single();
        if (error) throw error;
        return json({ item: data });
      }

      if (body.action === 'regenerate' || body.action === 'resend_email') {
        const callBody = { regenerate_id: id, force: true };
        const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-subscription-receipt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}` },
          body: JSON.stringify(callBody),
        });
        const out = await res.json();
        return json(out, res.status);
      }
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    console.error('admin-subscription-receipts error:', err);
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});

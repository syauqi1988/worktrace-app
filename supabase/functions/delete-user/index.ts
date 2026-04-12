import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userId = user.id

    // Delete data in order
    await supabaseAdmin.from('invoices').delete().eq('user_id', userId)
    await supabaseAdmin.from('quotations').delete().eq('user_id', userId)
    await supabaseAdmin.from('jobs').delete().eq('user_id', userId)
    await supabaseAdmin.from('customers').delete().eq('user_id', userId)
    await supabaseAdmin.from('referrals').delete().eq('referrer_id', userId)
    await supabaseAdmin.from('referrals').delete().eq('referred_id', userId)
    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    // Delete storage files
    const buckets = ['quotation-pdfs', 'invoice-pdfs', 'payment-qr']
    for (const bucket of buckets) {
      const { data: files } = await supabaseAdmin.storage.from(bucket).list(userId + '/')
      if (files && files.length > 0) {
        const paths = files.map(f => userId + '/' + f.name)
        await supabaseAdmin.storage.from(bucket).remove(paths)
      }
    }

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

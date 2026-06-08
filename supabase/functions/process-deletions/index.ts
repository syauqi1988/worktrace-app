import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STORAGE_BUCKETS = [
  'quotation-pdfs',
  'invoice-pdfs',
  'work-order-pdfs',
  'completion-report-pdfs',
  'completion-photos',
  'receipts',
  'logos',
  'payment-qr',
  'ticket-attachments',
  'payment-receipts',
]

async function deleteUserStorage(supabase: any, bucket: string, userId: string, errors: string[]) {
  try {
    const stack: string[] = [userId]
    const allPaths: string[] = []
    while (stack.length) {
      const prefix = stack.pop()!
      const { data: items, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
      if (error) { errors.push(`list ${bucket}/${prefix}: ${error.message}`); continue }
      if (!items) continue
      for (const item of items) {
        const fullPath = `${prefix}/${item.name}`
        if (item.id) {
          allPaths.push(fullPath)
        } else {
          stack.push(fullPath)
        }
      }
    }
    if (allPaths.length > 0) {
      for (let i = 0; i < allPaths.length; i += 100) {
        const batch = allPaths.slice(i, i + 100)
        const { error } = await supabase.storage.from(bucket).remove(batch)
        if (error) errors.push(`remove ${bucket}: ${error.message}`)
      }
    }
  } catch (e: any) {
    errors.push(`bucket ${bucket}: ${e.message}`)
  }
}

async function deleteUserData(supabase: any, userId: string) {
  const errors: string[] = []
  let storageDeleted = 0
  let recordsDeleted = 0

  // 1. Storage
  for (const bucket of STORAGE_BUCKETS) {
    await deleteUserStorage(supabase, bucket, userId, errors)
    storageDeleted++
  }

  // 2. Database records (children first)
  const tables = [
    'ticket_replies',
    'support_tickets',
    'completion_reports',
    'work_orders',
    'invoices',
    'quotations',
    'jobs',
    'customers',
    'subscription_events',
    'notifications',
    'push_subscriptions',
    'payment_proofs',
    'customer_approvals',
    'short_links',
  ]
  for (const t of tables) {
    try {
      const { error } = await supabase.from(t).delete().eq('user_id', userId)
      if (error) errors.push(`delete ${t}: ${error.message}`)
      else recordsDeleted++
    } catch (e: any) {
      errors.push(`delete ${t}: ${e.message}`)
    }
  }

  // Referrals (different columns)
  try {
    await supabase.from('referrals').delete().eq('referrer_id', userId)
    await supabase.from('referrals').delete().eq('referred_id', userId)
  } catch (e: any) {
    errors.push(`delete referrals: ${e.message}`)
  }

  // admin_users (in case)
  try {
    await supabase.from('admin_users').delete().eq('user_id', userId)
  } catch (e: any) {
    errors.push(`delete admin_users: ${e.message}`)
  }

  // 3. Mark deletion request(s) completed BEFORE wiping profile
  try {
    await supabase.from('account_deletion_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('status', ['pending', 'force_deleted'])
  } catch (e: any) {
    errors.push(`update deletion_request: ${e.message}`)
  }

  // 4. Profile
  try {
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (error) errors.push(`delete profile: ${error.message}`)
  } catch (e: any) {
    errors.push(`delete profile: ${e.message}`)
  }

  // 5. Cleanup auth helpers
  try {
    await supabase.rpc('cleanup_deleted_user_email', { p_user_id: userId })
  } catch (e: any) {
    errors.push(`cleanup_deleted_user_email: ${e.message}`)
  }

  // 6. Hard delete the auth user (last)
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) errors.push(`auth deleteUser: ${error.message}`)
  } catch (e: any) {
    errors.push(`auth deleteUser: ${e.message}`)
  }

  return { errors, storageDeleted, recordsDeleted }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Require service-role authorization (cron uses service role; admin tools also use it).
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const authHeader = req.headers.get('Authorization') ?? ''
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!SERVICE_ROLE_KEY || bearer !== SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    )

    // Parse body for optional manual targeting
    let body: any = {}
    try { body = await req.json() } catch { /* ignore */ }

    const targetUserId: string | undefined = body?.user_id
    const targetEmail: string | undefined = body?.email


    let due: any[] = []

    if (targetUserId || targetEmail) {
      // Manual purge for a single user (force-delete from admin)
      let q = supabase.from('account_deletion_requests')
        .select('id, user_id, user_email')
      if (targetUserId) q = q.eq('user_id', targetUserId)
      if (targetEmail) q = q.eq('user_email', targetEmail)
      const { data, error } = await q
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      due = data || []

      // If no deletion request exists but a user_id was passed, still purge
      if (due.length === 0 && targetUserId) {
        due = [{ user_id: targetUserId, user_email: targetEmail ?? null }]
      }
    } else {
      // Scheduled run: pick up due pending requests AND any force_deleted requests
      const nowIso = new Date().toISOString()
      const { data: pendingDue, error: e1 } = await supabase
        .from('account_deletion_requests')
        .select('id, user_id, user_email')
        .eq('status', 'pending')
        .lte('scheduled_at', nowIso)
      if (e1) {
        return new Response(JSON.stringify({ error: e1.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: forced, error: e2 } = await supabase
        .from('account_deletion_requests')
        .select('id, user_id, user_email')
        .eq('status', 'force_deleted')
      if (e2) {
        return new Response(JSON.stringify({ error: e2.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      due = [...(pendingDue || []), ...(forced || [])]
    }

    const results: any[] = []
    for (const r of due) {
      const out = await deleteUserData(supabase, r.user_id)
      results.push({ user_id: r.user_id, user_email: r.user_email, ...out })
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

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
]

async function deleteUserStorage(supabase: any, bucket: string, userId: string, errors: string[]) {
  try {
    // Recursively list and remove files in the user's folder
    const stack: string[] = [userId]
    const allPaths: string[] = []
    while (stack.length) {
      const prefix = stack.pop()!
      const { data: items, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
      if (error) { errors.push(`list ${bucket}/${prefix}: ${error.message}`); continue }
      if (!items) continue
      for (const item of items) {
        const fullPath = `${prefix}/${item.name}`
        // No id => folder
        if (item.id) {
          allPaths.push(fullPath)
        } else {
          stack.push(fullPath)
        }
      }
    }
    if (allPaths.length > 0) {
      // Remove in batches of 100
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

  // 1. Delete storage files first (best effort)
  for (const bucket of STORAGE_BUCKETS) {
    await deleteUserStorage(supabase, bucket, userId, errors)
    storageDeleted++
  }

  // 2. Delete database records (children first)
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

  // 3. Mark deletion request completed BEFORE we wipe profile (reads need user_id reference)
  try {
    await supabase.from('account_deletion_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('user_id', userId).eq('status', 'pending')
  } catch (e: any) {
    errors.push(`update deletion_request: ${e.message}`)
  }

  // 4. Delete profile
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    )

    // Find all due deletion requests
    const nowIso = new Date().toISOString()
    const { data: due, error: fetchErr } = await supabase
      .from('account_deletion_requests')
      .select('id, user_id, user_email')
      .eq('status', 'pending')
      .lte('scheduled_at', nowIso)

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results: any[] = []
    for (const req of due || []) {
      const r = await deleteUserData(supabase, (req as any).user_id)
      results.push({
        user_id: (req as any).user_id,
        user_email: (req as any).user_email,
        ...r,
      })
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

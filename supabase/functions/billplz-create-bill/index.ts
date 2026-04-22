import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { plan, billing_period, user_email, user_name, user_id, redirect_base_url } = await req.json()

    if (!plan || !user_email || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (plan === 'free') {
      return new Response(
        JSON.stringify({ error: 'Free plan does not require payment' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const period: 'monthly' | 'yearly' = billing_period === 'yearly' ? 'yearly' : 'monthly'

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Look up plan from pricing_plans table
    const { data: planRow, error: planError } = await supabaseAdmin
      .from('pricing_plans')
      .select('plan_key, name, monthly_price, yearly_price, is_active')
      .eq('plan_key', plan)
      .eq('is_active', true)
      .maybeSingle()

    if (planError || !planRow) {
      console.error('Plan lookup failed:', planError, 'plan:', plan)
      return new Response(
        JSON.stringify({ error: `Plan '${plan}' not found or inactive` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const priceMyr = period === 'yearly' ? Number(planRow.yearly_price) : Number(planRow.monthly_price)
    const amount = Math.round(priceMyr * 100) // sen

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan price' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const BILLPLZ_API_KEY = Deno.env.get('BILLPLZ_API_KEY') ?? ''
    const BILLPLZ_COLLECTION_ID = Deno.env.get('BILLPLZ_COLLECTION_ID') ?? ''
    const SANDBOX = Deno.env.get('BILLPLZ_SANDBOX') === 'true'

    const baseUrl = SANDBOX
      ? 'https://billplz-sandbox.com/api/v3'
      : 'https://www.billplz.com/api/v3'

    const description = period === 'yearly'
      ? `WorkTrace ${planRow.name} — Tahunan (20% diskaun)`
      : `WorkTrace ${planRow.name} — Bulanan`

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const callbackUrl = `${SUPABASE_URL}/functions/v1/billplz-callback`

    const toOrigin = (value: string | null | undefined) => {
      if (!value) return null
      try {
        return new URL(value).origin
      } catch {
        return null
      }
    }

    const appUrl =
      toOrigin(redirect_base_url) ||
      toOrigin(req.headers.get('origin')) ||
      toOrigin(req.headers.get('referer')) ||
      Deno.env.get('APP_URL') ||
      'https://worktraceapp.lovable.app'

    const redirectUrl = new URL('/payment/success', appUrl)
    redirectUrl.searchParams.set('plan', plan)
    redirectUrl.searchParams.set('period', period)

    console.log('Resolved redirect URL:', redirectUrl.toString(), 'amount(sen):', amount)

    const formData = new URLSearchParams()
    formData.append('collection_id', BILLPLZ_COLLECTION_ID)
    formData.append('email', user_email)
    formData.append('name', user_name || 'WorkTrace User')
    formData.append('amount', amount.toString())
    formData.append('description', description)
    formData.append('callback_url', callbackUrl)
    formData.append('redirect_url', redirectUrl.toString())
    formData.append('reference_1_label', 'User ID')
    formData.append('reference_1', user_id)
    formData.append('reference_2_label', 'Plan')
    formData.append('reference_2', `${plan}_${period}`)

    const credentials = btoa(`${BILLPLZ_API_KEY}:`)

    const response = await fetch(`${baseUrl}/bills`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const bill = await response.json()
    console.log('BillPlz response status:', response.status, 'body:', JSON.stringify(bill))

    if (!response.ok) {
      throw new Error(bill.error?.message || JSON.stringify(bill) || 'BillPlz error')
    }

    await supabaseAdmin
      .from('profiles')
      .update({ billplz_bill_id: bill.id })
      .eq('id', user_id)

    return new Response(
      JSON.stringify({ bill_id: bill.id, payment_url: bill.url, amount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

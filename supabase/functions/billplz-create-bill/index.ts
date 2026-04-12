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
    const { plan, billing_period, user_email, user_name, user_id } = await req.json()

    if (!plan || !user_email || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const BILLPLZ_API_KEY = Deno.env.get('BILLPLZ_API_KEY') ?? ''
    const BILLPLZ_COLLECTION_ID = Deno.env.get('BILLPLZ_COLLECTION_ID') ?? ''
    const SANDBOX = Deno.env.get('BILLPLZ_SANDBOX') === 'true'

    const baseUrl = SANDBOX
      ? 'https://billplz-sandbox.com/api/v3'
      : 'https://www.billplz.com/api/v3'

    const prices: Record<string, number> = {
      pro_monthly: 4900,
      pro_yearly: 47040,
      team_monthly: 9900,
      team_yearly: 95040,
    }

    const priceKey = `${plan}_${billing_period || 'monthly'}`
    const amount = prices[priceKey] ?? 4900

    const description = billing_period === 'yearly'
      ? `WorkTrace ${plan} — Tahunan (20% diskaun)`
      : `WorkTrace ${plan} — Bulanan`

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const callbackUrl = `${SUPABASE_URL}/functions/v1/billplz-callback`
    const appUrl = Deno.env.get('APP_URL') || 'https://worktraceapp.lovable.app'
    const redirectUrl = `${appUrl}/payment/success?plan=${plan}&period=${billing_period || 'monthly'}`

    const formData = new URLSearchParams()
    formData.append('collection_id', BILLPLZ_COLLECTION_ID)
    formData.append('email', user_email)
    formData.append('name', user_name || 'WorkTrace User')
    formData.append('amount', amount.toString())
    formData.append('description', description)
    formData.append('callback_url', callbackUrl)
    formData.append('redirect_url', redirectUrl)
    formData.append('reference_1_label', 'User ID')
    formData.append('reference_1', user_id)
    formData.append('reference_2_label', 'Plan')
    formData.append('reference_2', `${plan}_${billing_period || 'monthly'}`)

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

    if (!response.ok) {
      throw new Error(bill.error?.message || JSON.stringify(bill) || 'BillPlz error')
    }

    // Store bill ID
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const params: Record<string, string> = {}

    const rawBody = await req.text()
    const searchParams = new URLSearchParams(rawBody)

    for (const [key, value] of searchParams.entries()) {
      params[key] = value
    }

    console.log('Callback params:', JSON.stringify(params))

    const billId = params['id']

    if (!billId) {
      return new Response('Missing bill id', { status: 400 })
    }

    const BILLPLZ_API_KEY = Deno.env.get('BILLPLZ_API_KEY') ?? ''
    const SANDBOX = Deno.env.get('BILLPLZ_SANDBOX') === 'true'
    const baseUrl = SANDBOX
      ? 'https://billplz-sandbox.com/api/v3'
      : 'https://www.billplz.com/api/v3'
    const credentials = btoa(`${BILLPLZ_API_KEY}:`)

    const billResponse = await fetch(`${baseUrl}/bills/${billId}`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    })

    const bill = await billResponse.json()
    console.log('Bill lookup status:', billResponse.status, 'body:', JSON.stringify(bill))

    if (!billResponse.ok) {
      throw new Error(bill.error?.message || JSON.stringify(bill) || 'Failed to fetch BillPlz bill')
    }

    const isPaid = bill?.paid === true || bill?.state === 'paid'

    if (!isPaid) {
      console.log('Payment not paid yet, skipping update')
      return new Response('ok', { status: 200 })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const startDate = new Date()
    const endDate = new Date()

    let userId = bill?.reference_1 || ''
    let plan = 'pro'
    let billing_period: 'monthly' | 'yearly' = 'monthly'
    let resolved = false

    if (typeof bill?.reference_2 === 'string' && bill.reference_2.includes('_')) {
      const [resolvedPlan, resolvedBillingPeriod] = bill.reference_2.split('_')
      plan = resolvedPlan || plan
      billing_period = resolvedBillingPeriod === 'yearly' ? 'yearly' : 'monthly'
      resolved = true
    }

    // Fallback: lookup by amount in pricing_plans
    if (!resolved) {
      const amountSen = Number(bill?.amount ?? params['amount'] ?? 0)
      if (amountSen > 0) {
        const amountMyr = amountSen / 100
        const { data: matchPlans } = await supabaseAdmin
          .from('pricing_plans')
          .select('plan_key, monthly_price, yearly_price')
          .eq('is_active', true)

        const match = (matchPlans ?? []).find((p: any) => {
          return Math.round(Number(p.monthly_price) * 100) === amountSen
            || Math.round(Number(p.yearly_price) * 100) === amountSen
        })

        if (match) {
          plan = match.plan_key
          billing_period = Math.round(Number(match.yearly_price) * 100) === amountSen ? 'yearly' : 'monthly'
          console.log('Resolved plan via amount fallback:', plan, billing_period, amountMyr)
        } else {
          console.error('Could not resolve plan from amount:', amountSen)
        }
      }
    }

    if (!userId) {
      const { data: matchedProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('billplz_bill_id', billId)
        .maybeSingle()

      userId = matchedProfile?.id || ''
    }

    if (!userId) {
      console.error('Unable to resolve user for paid bill', { billId, bill })
      return new Response('Unable to resolve bill owner', { status: 400 })
    }

    // Fetch profile first so we can extend from existing end date if still active
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('free_months_earned, free_months_used, plan, billing_period, subscription_status, billplz_bill_id, subscription_end_date')
      .eq('id', userId)
      .single()

    if (
      profile?.subscription_status === 'active' &&
      profile?.billplz_bill_id === billId &&
      profile?.plan === plan &&
      profile?.billing_period === billing_period
    ) {
      console.log('Payment already processed, skipping duplicate update')
      return new Response('ok', { status: 200 })
    }

    // Base the new end date on existing subscription_end_date if it's still in the future,
    // so renewals/upgrades stack on top of remaining balance instead of resetting from now.
    const existingEnd = profile?.subscription_end_date
      ? new Date(profile.subscription_end_date)
      : null
    if (existingEnd && existingEnd.getTime() > endDate.getTime()) {
      endDate.setTime(existingEnd.getTime())
      console.log('Extending from existing end date:', existingEnd.toISOString())
    }

    if (billing_period === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    } else {
      endDate.setMonth(endDate.getMonth() + 1)
    }

    const freeBalance = profile
      ? (profile.free_months_earned || 0) - (profile.free_months_used || 0)
      : 0

    if (freeBalance > 0) {
      endDate.setMonth(endDate.getMonth() + freeBalance)
    }

    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        plan,
        billing_period,
        subscription_status: 'active',
        subscription_start_date: startDate.toISOString(),
        subscription_end_date: endDate.toISOString(),
        free_months_used: freeBalance > 0
          ? (profile?.free_months_used || 0) + freeBalance
          : (profile?.free_months_used || 0),
        billplz_bill_id: billId,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return new Response('Update failed', { status: 500 })
    }

    console.log(`Payment success: user ${userId} upgraded to ${plan} (${billing_period})`)

    // Trigger referral reward
    const { error: refError } = await supabaseAdmin.rpc('complete_referral_reward', { p_referred_id: userId, p_billing_period: billing_period })
    if (refError) {
      console.error('Referral reward error:', refError)
    } else {
      console.log('Referral reward processed for:', userId)
    }

    // Log subscription event
    await supabaseAdmin.from('subscription_events').insert({
      user_id: userId,
      event_type: 'payment_success',
      plan,
      billing_period,
      amount: Number(bill?.amount || 0),
    })

    return new Response('ok', { status: 200 })
  } catch (error) {
    console.error('Callback error:', error)
    return new Response('Error', { status: 500 })
  }
})

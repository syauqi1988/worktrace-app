import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'node:crypto'

Deno.serve(async (req) => {
  try {
    // BillPlz sends callback as application/x-www-form-urlencoded
    const formData = await req.formData()
    const params: Record<string, string> = {}

    for (const [key, value] of formData.entries()) {
      params[key] = value as string
    }

    console.log('Callback params:', JSON.stringify(params))

    const xSignature = params['x_signature']
    delete params['x_signature']

    const XSIG_KEY = Deno.env.get('BILLPLZ_XSIGNATURE_KEY') ?? ''

    // BillPlz signature: sort keys alphabetically, join as key=value pairs with |
    const sortedKeys = Object.keys(params).sort()
    const rawString = sortedKeys.map(k => `${k}${params[k]}`).join('|')

    const expectedSig = createHmac('sha256', XSIG_KEY)
      .update(rawString)
      .digest('hex')

    if (expectedSig !== xSignature) {
      console.error('Invalid signature', { expected: expectedSig, got: xSignature, rawString })
      return new Response('Invalid signature', { status: 401 })
    }

    const billId = params['id']
    const paid = params['paid']
    const userId = params['reference_1']
    const planPeriod = params['reference_2']

    // Only process successful payments
    if (paid !== 'true') {
      console.log('Payment not paid yet, skipping update')
      return new Response('ok', { status: 200 })
    }

    const [plan, billing_period] = (planPeriod || 'pro_monthly').split('_')

    const startDate = new Date()
    const endDate = new Date()
    if (billing_period === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    } else {
      endDate.setMonth(endDate.getMonth() + 1)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check free months from referral
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('free_months_earned, free_months_used')
      .eq('id', userId)
      .single()

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
    await supabaseAdmin.rpc('complete_referral_reward', { p_referred_id: userId })

    return new Response('ok', { status: 200 })
  } catch (error) {
    console.error('Callback error:', error)
    return new Response('Error', { status: 500 })
  }
})

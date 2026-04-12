import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'node:crypto'

Deno.serve(async (req) => {
  try {
    const formData = await req.formData()

    const billId = formData.get('id') as string
    const paid = formData.get('paid') as string
    const xSignature = formData.get('x_signature') as string
    const userId = formData.get('reference_1') as string
    const planPeriod = formData.get('reference_2') as string

    const XSIG_KEY = Deno.env.get('BILLPLZ_XSIGNATURE_KEY') ?? ''

    // Verify X Signature
    const rawString = `${billId}|${paid}`
    const expectedSig = createHmac('sha256', XSIG_KEY)
      .update(rawString)
      .digest('hex')

    if (expectedSig !== xSignature) {
      console.error('Invalid signature', { expected: expectedSig, got: xSignature })
      return new Response('Invalid signature', { status: 401 })
    }

    // Only process successful payments
    if (paid !== 'true') {
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
    await supabaseAdmin
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

    // Trigger referral reward
    await supabaseAdmin.rpc('complete_referral_reward', { p_referred_id: userId })

    return new Response('ok', { status: 200 })
  } catch (error) {
    console.error('Callback error:', error)
    return new Response('Error', { status: 500 })
  }
})

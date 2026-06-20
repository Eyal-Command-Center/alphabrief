import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature')

  // Verify the webhook came from Lemon Squeezy
  const hmac = crypto.createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET!)
  hmac.update(rawBody)
  const digest = hmac.digest('hex')

  if (signature !== digest) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const eventName = payload.meta?.event_name
  const userId = payload.meta?.custom_data?.user_id
  const subscriptionId = String(payload.data?.id ?? '')

  if (!userId) return Response.json({ ok: true })

  if (eventName === 'subscription_created') {
    await supabase.from('portfolios').upsert({
      user_id: userId,
      is_pro: true,
      lemon_subscription_id: subscriptionId,
    }, { onConflict: 'user_id' })
  }

  if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
    await supabase.from('portfolios')
      .update({ is_pro: false, lemon_subscription_id: null })
      .eq('user_id', userId)
  }

  return Response.json({ ok: true })
}

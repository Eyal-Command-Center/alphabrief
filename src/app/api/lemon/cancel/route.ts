import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Get subscription ID
  const { data: portfolio } = await adminSupabase
    .from('portfolios')
    .select('lemon_subscription_id')
    .eq('user_id', user.id)
    .single()

  const subId = portfolio?.lemon_subscription_id
  if (!subId) return Response.json({ error: 'No active subscription' }, { status: 400 })

  // Cancel at end of billing period
  const res = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      'Accept': 'application/vnd.api+json',
    },
  })

  if (!res.ok) {
    return Response.json({ error: 'Failed to cancel' }, { status: 500 })
  }

  // Mark as cancelled in DB (will expire at period end via webhook)
  await adminSupabase.from('portfolios')
    .update({ is_pro: false, lemon_subscription_id: null })
    .eq('user_id', user.id)

  return Response.json({ ok: true })
}

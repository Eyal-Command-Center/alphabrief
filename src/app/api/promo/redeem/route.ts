import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json()
  if (!code?.trim()) return Response.json({ error: 'No code provided' }, { status: 400 })

  const normalized = code.trim().toUpperCase()

  // Reject suspiciously long codes — valid promo codes are short
  if (normalized.length > 50) {
    return Response.json({ error: 'Invalid promo code.' }, { status: 400 })
  }

  // Check if already Pro
  const { data: portfolio } = await adminSupabase
    .from('portfolios')
    .select('is_pro')
    .eq('user_id', user.id)
    .single()

  if (portfolio?.is_pro) {
    return Response.json({ error: 'You already have Pro.' }, { status: 400 })
  }

  // Validate code
  const { data: promo } = await adminSupabase
    .from('promo_codes')
    .select('code, max_uses, use_count, used_by_emails')
    .eq('code', normalized)
    .single()

  if (!promo) {
    return Response.json({ error: 'Invalid promo code.' }, { status: 400 })
  }

  if (promo.use_count >= promo.max_uses) {
    return Response.json({ error: 'This code has reached its usage limit.' }, { status: 400 })
  }

  // Grant Pro + increment use count (both in parallel)
  await Promise.all([
    adminSupabase.from('portfolios').upsert({
      user_id: user.id,
      is_pro: true,
      user_email: user.email,
    }, { onConflict: 'user_id' }),
    adminSupabase.from('promo_codes')
      .update({
        use_count: promo.use_count + 1,
        used_by_emails: [...(promo.used_by_emails ?? []), user.email],
      })
      .eq('code', normalized),
  ])

  return Response.json({ ok: true })
}

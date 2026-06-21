import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { symbol, rating } = await req.json()

  if (!symbol || !['up', 'down'].includes(rating)) {
    return Response.json({ error: 'Invalid' }, { status: 400 })
  }

  const safeSymbol = String(symbol).trim().toUpperCase()
  if (!/^[A-Z0-9.\-]{1,10}$/.test(safeSymbol)) {
    return Response.json({ error: 'Invalid symbol' }, { status: 400 })
  }

  // Get user if logged in (optional — feedback works for guests too)
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()

  await adminSupabase.from('brief_feedback').insert({
    symbol: safeSymbol,
    user_id: user?.id ?? null,
    rating,
  })

  return Response.json({ ok: true })
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

async function makeSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

export async function GET() {
  const supabase = await makeSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('portfolios')
    .select('alert_tickers, tickers')
    .eq('user_id', user.id)
    .single()

  return Response.json({
    alert_tickers: data?.alert_tickers ?? [],
    tickers: data?.tickers ?? [],
  })
}

export async function POST(req: NextRequest) {
  const supabase = await makeSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { alert_tickers } = await req.json()
  const capped = (alert_tickers as string[]).slice(0, 10)

  await supabase.from('portfolios').upsert({
    user_id: user.id,
    alert_tickers: capped,
  }, { onConflict: 'user_id' })

  return Response.json({ ok: true })
}

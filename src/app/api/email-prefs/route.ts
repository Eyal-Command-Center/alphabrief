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
    .select('email_enabled, email_frequency')
    .eq('user_id', user.id)
    .single()

  return Response.json({
    enabled: data?.email_enabled ?? false,
    frequency: data?.email_frequency ?? 'weekly',
  })
}

export async function POST(req: NextRequest) {
  const supabase = await makeSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { enabled, frequency } = await req.json()

  await supabase.from('portfolios').upsert({
    user_id: user.id,
    email_enabled: enabled,
    email_frequency: frequency ?? 'weekly',
    user_email: user.email,
  }, { onConflict: 'user_id' })

  return Response.json({ ok: true })
}

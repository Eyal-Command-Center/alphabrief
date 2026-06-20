import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getStoreId(): Promise<string> {
  const res = await fetch('https://api.lemonsqueezy.com/v1/stores', {
    headers: {
      'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      'Accept': 'application/vnd.api+json',
    },
    next: { revalidate: 3600 },
  })
  const data = await res.json()
  return data.data?.[0]?.id ?? ''
}

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const storeId = await getStoreId()
  if (!storeId) return Response.json({ error: 'Store not found' }, { status: 500 })

  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: user.email,
            custom: { user_id: user.id },
          },
          product_options: {
            redirect_url: 'https://alphabrief.io/app/settings?upgraded=true',
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId } },
          variant: { data: { type: 'variants', id: process.env.LEMONSQUEEZY_VARIANT_ID! } },
        },
      },
    }),
  })

  const data = await res.json()
  const url = data.data?.attributes?.url

  if (!url) return Response.json({ error: 'Failed to create checkout' }, { status: 500 })
  return Response.json({ url })
}

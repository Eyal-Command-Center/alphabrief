const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!symbol || !from || !to) {
    return Response.json({ error: 'Missing params' }, { status: 400 })
  }

  const res = await fetch(
    `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&symbol=${symbol}&token=${FINNHUB_TOKEN}`
  )
  const data = await res.json()

  const events = (data.earningsCalendar ?? []).map((e: {
    symbol: string
    date: string
    epsEstimate: number | null
    revenueEstimate: number | null
    hour: string
  }) => ({
    symbol: e.symbol,
    date: e.date,
    epsEstimate: e.epsEstimate ?? null,
    revenueEstimate: e.revenueEstimate ?? null,
    hour: e.hour ?? '',
  }))

  return Response.json({ events })
}

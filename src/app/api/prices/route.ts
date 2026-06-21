// Returns current price snapshot for a list of symbols via Massive REST API.
// Called by client-side polling every 10s during market hours.

const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY

function isMarketOpen(): boolean {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false

  // ET offset: UTC-5 (EST) or UTC-4 (EDT)
  // Simplified: use Eastern time by checking UTC offset
  // 9:30 AM ET = 14:30 UTC (EST) or 13:30 UTC (EDT)
  // 4:00 PM ET = 21:00 UTC (EST) or 20:00 UTC (EDT)
  // Use a rough check: 13:30–21:00 UTC covers both
  const hour = now.getUTCHours()
  const min = now.getUTCMinutes()
  const totalMin = hour * 60 + min
  const openMin = 13 * 60 + 30  // 13:30 UTC (EDT 9:30 ET)
  const closeMin = 21 * 60       // 21:00 UTC (EDT 4pm ET)
  return totalMin >= openMin && totalMin < closeMin
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbolsParam = searchParams.get('symbols')

  if (!symbolsParam) return Response.json({ error: 'Missing symbols' }, { status: 400 })

  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z0-9.\-]{1,10}$/.test(s))
    .slice(0, 20)

  if (!symbols.length) return Response.json({ error: 'No valid symbols' }, { status: 400 })

  const marketOpen = isMarketOpen()

  if (!marketOpen) {
    // Market closed — return status without fetching
    return Response.json({ marketOpen: false, prices: {} })
  }

  if (!MASSIVE_API_KEY) {
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }

  try {
    // Massive snapshot endpoint (Polygon.io-compatible)
    const tickersParam = symbols.join(',')
    const url = `https://api.massive.com/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickersParam}&apiKey=${MASSIVE_API_KEY}`

    const res = await fetch(url, { next: { revalidate: 0 } })
    const data = await res.json()

    const prices: Record<string, { price: number; change: number }> = {}

    if (data?.tickers && Array.isArray(data.tickers)) {
      for (const t of data.tickers) {
        if (t.ticker && t.day?.c != null) {
          prices[t.ticker] = {
            price: t.day.c,
            change: t.todaysChangePerc ?? 0,
          }
        } else if (t.ticker && t.lastTrade?.p != null) {
          prices[t.ticker] = {
            price: t.lastTrade.p,
            change: t.todaysChangePerc ?? 0,
          }
        }
      }
    }

    return Response.json({ marketOpen: true, prices }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json({ error: 'Failed to fetch prices' }, { status: 502 })
  }
}

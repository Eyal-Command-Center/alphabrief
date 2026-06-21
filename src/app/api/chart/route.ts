const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY

const TTL_MS = 60 * 60 * 1000 // 1 hour
const cache = new Map<string, { data: unknown; ts: number }>()

function calcEMA(closes: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1)
  const result: (number | null)[] = new Array(closes.length).fill(null)
  // Need at least `period` data points to start
  if (closes.length < period) return result

  // Seed with SMA of first `period` values
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
  result[period - 1] = ema

  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k)
    result[i] = ema
  }
  return result
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')

  if (!symbol) return Response.json({ error: 'Missing symbol' }, { status: 400 })

  const safeSymbol = symbol.trim().toUpperCase()
  if (!/^[A-Z0-9.\-]{1,10}$/.test(safeSymbol)) {
    return Response.json({ error: 'Invalid symbol' }, { status: 400 })
  }

  const cached = cache.get(safeSymbol)
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return Response.json(cached.data, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
    })
  }

  if (!MASSIVE_API_KEY) {
    return Response.json({ error: 'Chart data unavailable' }, { status: 503 })
  }

  // Fetch 2 years so EMA 200 has enough warm-up data; we'll trim to last 1Y for display
  const to = new Date()
  const from = new Date(to)
  from.setFullYear(from.getFullYear() - 2)
  const fromStr = from.toISOString().split('T')[0]
  const toStr = to.toISOString().split('T')[0]

  const url = `https://api.massive.com/v2/aggs/ticker/${safeSymbol}/range/1/day/${fromStr}/${toStr}?adjusted=true&sort=asc&limit=750&apiKey=${MASSIVE_API_KEY}`

  let raw
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    raw = await res.json()
  } catch {
    return Response.json({ error: 'Failed to fetch chart data' }, { status: 502 })
  }

  if (!raw?.results || !Array.isArray(raw.results) || raw.results.length === 0) {
    return Response.json({ error: 'No chart data available' }, { status: 404 })
  }

  // Extract close prices and timestamps
  const candles = raw.results.map((r: { c: number; t: number }) => ({
    t: r.t, // unix ms
    c: r.c, // close
  }))

  const closes = candles.map((c: { c: number }) => c.c)
  const ema200 = calcEMA(closes, 200)

  // Trim to last ~63 trading days (~3 months) for display — EMA is already fully warmed up
  const displayCandles = candles.slice(-63)
  const displayEma = ema200.slice(-63)

  const result = {
    symbol: safeSymbol,
    candles: displayCandles.map((c: { t: number; c: number }, i: number) => ({
      t: c.t,
      c: c.c,
      ema200: displayEma[i],
    })),
  }

  cache.set(safeSymbol, { data: result, ts: Date.now() })
  return Response.json(result, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
  })
}

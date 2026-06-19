const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY

const TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
let cache: { data: unknown; ts: number } | null = null

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL_MS) {
    return Response.json(cache.data)
  }

  const today = new Date()
  const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const future60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const [recentRes, upcomingRes] = await Promise.all([
    fetch(`https://finnhub.io/api/v1/calendar/ipo?from=${fmt(past30)}&to=${fmt(today)}&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/calendar/ipo?from=${fmt(today)}&to=${fmt(future60)}&token=${FINNHUB_TOKEN}`),
  ])

  const [recentRaw, upcomingRaw] = await Promise.all([recentRes.json(), upcomingRes.json()])

  interface IpoEntry {
    date: string
    name: string
    symbol: string
    price: string
    numberOfShares: number
    totalSharesValue: number
    status: string
    exchange: string
  }

  const format = (entry: IpoEntry) => ({
    date: entry.date,
    name: entry.name,
    symbol: entry.symbol || null,
    price: entry.price || null,
    shares: entry.numberOfShares || null,
    dealSize: entry.totalSharesValue || null,
    status: entry.status,
    exchange: entry.exchange || null,
  })

  const recent = (recentRaw?.ipoCalendar ?? [])
    .filter((e: IpoEntry) => e.status === 'priced')
    .sort((a: IpoEntry, b: IpoEntry) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20)
    .map(format)

  const upcoming = (upcomingRaw?.ipoCalendar ?? [])
    .filter((e: IpoEntry) => e.status !== 'priced')
    .sort((a: IpoEntry, b: IpoEntry) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 20)
    .map(format)

  const result = { recent, upcoming }
  cache = { data: result, ts: Date.now() }
  return Response.json(result)
}

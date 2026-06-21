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

  interface IpoRaw {
    date: string
    name: string
    symbol: string
    price: string
    numberOfShares: number
    totalSharesValue: number
    status: string
    exchange: string
  }

  interface EnrichmentData {
    symbol: string
    currentPrice: number | null
    priceChange: number | null
    sector: string | null
    marketCap: number | null
    about: string | null
  }

  const format = (entry: IpoRaw, enrichment?: EnrichmentData) => ({
    date: entry.date,
    name: entry.name,
    symbol: entry.symbol || null,
    price: entry.price || null,
    shares: entry.numberOfShares || null,
    dealSize: entry.totalSharesValue || null,
    status: entry.status,
    exchange: entry.exchange || null,
    currentPrice: enrichment?.currentPrice ?? null,
    priceChange: enrichment?.priceChange ?? null,
    sector: enrichment?.sector ?? null,
    marketCap: enrichment?.marketCap ?? null,
    about: enrichment?.about ?? null,
  })

  const recentList: IpoRaw[] = (recentRaw?.ipoCalendar ?? [])
    .filter((e: IpoRaw) => e.status === 'priced')
    .sort((a: IpoRaw, b: IpoRaw) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15)

  const upcomingList: IpoRaw[] = (upcomingRaw?.ipoCalendar ?? [])
    .filter((e: IpoRaw) => e.status !== 'priced')
    .sort((a: IpoRaw, b: IpoRaw) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10)

  const allEntries = [...recentList, ...upcomingList]
  const symbolsToEnrich = [...new Set(allEntries.map(e => e.symbol).filter(Boolean))]

  const enrichMap: Record<string, EnrichmentData> = {}

  if (symbolsToEnrich.length > 0) {
    const enrichResults = await Promise.all(
      symbolsToEnrich.map(async (symbol) => {
        try {
          const [quoteRes, profileRes] = await Promise.all([
            fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_TOKEN}`),
            fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_TOKEN}`),
          ])
          const [quote, profile] = await Promise.all([quoteRes.json(), profileRes.json()])

          const sector = (profile.finnhubIndustry && profile.finnhubIndustry !== 'N/A')
            ? profile.finnhubIndustry : null
          // Use Finnhub's description directly — Claude doesn't reliably know recent IPOs
          const description: string = profile.description?.trim() || ''
          const about: string | null = description.length > 20 ? description.slice(0, 300) : null

          return {
            symbol,
            currentPrice: quote.c > 0 ? quote.c : null,
            priceChange: typeof quote.dp === 'number' ? quote.dp : null,
            sector,
            marketCap: profile.marketCapitalization > 0 ? profile.marketCapitalization : null,
            about,
          } as EnrichmentData
        } catch {
          return { symbol, currentPrice: null, priceChange: null, sector: null, marketCap: null, about: null } as EnrichmentData
        }
      })
    )
    enrichResults.forEach(e => { enrichMap[e.symbol] = e })
  }

  const recent = recentList.map(e => format(e, enrichMap[e.symbol]))
  const upcoming = upcomingList.map(e => format(e, enrichMap[e.symbol]))

  const result = { recent, upcoming }
  cache = { data: result, ts: Date.now() }
  return Response.json(result)
}

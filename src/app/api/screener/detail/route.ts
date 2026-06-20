import Anthropic from '@anthropic-ai/sdk'

const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TTL_MS = 20 * 60 * 1000 // 20 minutes
const cache = new Map<string, { data: unknown; ts: number }>()

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')

  if (!symbol) return Response.json({ error: 'Missing symbol' }, { status: 400 })

  // Sanitize: only allow valid ticker characters to prevent URL injection
  const safeSymbol = symbol.trim().toUpperCase()
  if (!/^[A-Z0-9.\-]{1,10}$/.test(safeSymbol)) {
    return Response.json({ error: 'Invalid symbol' }, { status: 400 })
  }

  const cacheHeaders = { 'Cache-Control': 's-maxage=1200, stale-while-revalidate=3600' }

  // Return cached result if fresh
  const cached = cache.get(safeSymbol)
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return Response.json(cached.data, { headers: cacheHeaders })
  }

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [profileRes, quoteRes, metricsRes, recommendRes, newsRes, earningsRes] = await Promise.all([
    fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${safeSymbol}&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/quote?symbol=${safeSymbol}&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${safeSymbol}&metric=all&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/stock/recommendation?symbol=${safeSymbol}&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/company-news?symbol=${safeSymbol}&from=${weekAgo}&to=${today}&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/calendar/earnings?from=${today}&to=${in30Days}&symbol=${safeSymbol}&token=${FINNHUB_TOKEN}`),
  ])

  const [profile, quote, metrics, recommendations, newsRaw, earningsRaw] = await Promise.all([
    profileRes.json(),
    quoteRes.json(),
    metricsRes.json(),
    recommendRes.json(),
    newsRes.json(),
    earningsRes.json(),
  ])

  // Reject invalid/unknown tickers — no name and no price means nothing to show
  if (!profile.name && (!quote.c || quote.c === 0)) {
    return Response.json({ error: 'Invalid ticker' }, { status: 404 })
  }

  const news = Array.isArray(newsRaw) ? newsRaw.slice(0, 4) : []
  const latestRec = Array.isArray(recommendations) ? recommendations[0] : null
  const nextEarnings = earningsRaw?.earningsCalendar?.[0] ?? null

  const catalystHint = nextEarnings
    ? `Next earnings: ${nextEarnings.date} (${nextEarnings.hour === 'amc' ? 'after close' : nextEarnings.hour === 'bmo' ? 'before open' : 'time TBD'}${nextEarnings.epsEstimate != null ? `, EPS est. $${nextEarnings.epsEstimate}` : ''})`
    : 'No earnings found in next 30 days'

  const eps = metrics?.metric?.epsBasicExclExtraTTM
  const isProfitable = eps !== null && eps !== undefined && eps > 0
  const peValue = metrics?.metric?.peBasicExclExtraTTM
  const peDisplay = isProfitable && peValue && peValue > 0 ? peValue.toFixed(1) : null

  const prompt = `You are a sharp equity analyst writing for a retail investor. Given this data on ${safeSymbol} (${profile.name ?? safeSymbol}), return a JSON object with exactly these three fields:

{
  "quickTake": "2-3 sentences on the stock's current situation — price action, what's driving it, anything worth flagging. Use ⚠️ for risks, ✅ for positives.",
  "thesis": "Start with exactly one of: 🟢 Positive, 🔴 Negative, or 🟡 No change — then one sentence on the fundamental story and whether anything is shifting.",
  "catalyst": "One sentence on the next key event. Use the earnings data provided. If nothing notable: 'Nothing notable until next earnings.'"
}

Data:
- Price: $${quote.c} (${quote.dp > 0 ? '+' : ''}${quote.dp?.toFixed(2)}% today — use this exact figure)
- Market cap: ${profile.marketCapitalization ? '$' + (profile.marketCapitalization / 1000).toFixed(1) + 'B' : 'N/A'}
- Profitable: ${isProfitable ? 'Yes' : 'No — pre-profit company, EPS is negative or zero'}
- PE ratio: ${peDisplay ? peDisplay : 'NOT APPLICABLE — do not cite PE, the company has no positive earnings'}
- 52w high/low: $${metrics?.metric?.['52WeekHigh'] ?? 'N/A'} / $${metrics?.metric?.['52WeekLow'] ?? 'N/A'}
- Analyst consensus: ${latestRec ? `${latestRec.buy} buy / ${latestRec.hold} hold / ${latestRec.sell} sell` : 'N/A'}
- Earnings: ${catalystHint}
- Recent headlines: ${news.slice(0, 2).map((n: { headline: string }) => n.headline).join(' | ')}

Rules:
- Be direct. No filler. No "it's worth noting", "it's important to", "notably".
- Use the exact price/change numbers provided.
- If the company is pre-profit, never cite PE. The relevant valuation framing is EV/Sales or simply that the stock is priced on future growth, not current earnings.
- On analyst consensus: high buy ratings on a speculative or pre-profit name often mean the name is already institutionally discovered and fully covered — this is not automatically a positive signal. Flag it as saturation if relevant, not as conviction.
- Return only valid JSON. No markdown code fences. No extra text.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  let parsed = { quickTake: '', thesis: '', catalyst: '' }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    parsed.quickTake = cleaned
  }

  const result = {
    symbol: safeSymbol,
    name: profile.name ?? safeSymbol,
    sector: profile.finnhubIndustry ?? '',
    logo: profile.logo ?? '',
    price: quote.c,
    change: quote.dp,
    marketCap: profile.marketCapitalization,
    pe: metrics?.metric?.peBasicExclExtraTTM ?? null,
    high52: metrics?.metric?.['52WeekHigh'] ?? null,
    low52: metrics?.metric?.['52WeekLow'] ?? null,
    recommendation: latestRec ?? null,
    news: news.map((n: { headline: string; url: string; source: string }) => ({
      headline: n.headline,
      url: n.url,
      source: n.source,
    })),
    quickTake: parsed.quickTake,
    thesis: parsed.thesis,
    catalyst: parsed.catalyst,
  }

  cache.set(safeSymbol, { data: result, ts: Date.now() })
  return Response.json(result, { headers: cacheHeaders })
}

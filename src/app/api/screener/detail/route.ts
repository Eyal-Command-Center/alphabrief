import Anthropic from '@anthropic-ai/sdk'

const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')

  if (!symbol) return Response.json({ error: 'Missing symbol' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [profileRes, quoteRes, metricsRes, recommendRes, newsRes] = await Promise.all([
    fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/stock/recommendation?symbol=${symbol}&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${weekAgo}&to=${today}&token=${FINNHUB_TOKEN}`),
  ])

  const [profile, quote, metrics, recommendations, newsRaw] = await Promise.all([
    profileRes.json(),
    quoteRes.json(),
    metricsRes.json(),
    recommendRes.json(),
    newsRes.json(),
  ])

  const news = Array.isArray(newsRaw) ? newsRaw.slice(0, 4) : []
  const latestRec = Array.isArray(recommendations) ? recommendations[0] : null

  // Generate AI quick take
  const prompt = `You are a sharp equity analyst. Give a 3-sentence quick take on ${symbol} (${profile.name ?? symbol}) for a retail investor.

Data:
- Price: $${quote.c} (${quote.dp > 0 ? '+' : ''}${quote.dp?.toFixed(2)}% today)
- Market cap: ${profile.marketCapitalization ? '$' + (profile.marketCapitalization / 1000).toFixed(1) + 'B' : 'N/A'}
- PE ratio: ${metrics?.metric?.peBasicExclExtraTTM?.toFixed(1) ?? 'N/A'}
- 52w high/low: $${metrics?.metric?.['52WeekHigh'] ?? 'N/A'} / $${metrics?.metric?.['52WeekLow'] ?? 'N/A'}
- Analyst consensus: ${latestRec ? `${latestRec.buy} buy / ${latestRec.hold} hold / ${latestRec.sell} sell` : 'N/A'}
- Recent news: ${news.slice(0, 2).map((n: { headline: string }) => n.headline).join(' | ')}

Be direct. No filler. Flag anything notable with ⚠️ or ✅.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const aiTake = message.content[0].type === 'text' ? message.content[0].text : ''

  return Response.json({
    symbol,
    name: profile.name ?? symbol,
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
    aiTake,
  })
}

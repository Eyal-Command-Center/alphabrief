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

  const [profileRes, quoteRes, metricsRes, recommendRes, newsRes, earningsRes, peersRes] = await Promise.all([
    fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${safeSymbol}&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/quote?symbol=${safeSymbol}&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${safeSymbol}&metric=all&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/stock/recommendation?symbol=${safeSymbol}&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/company-news?symbol=${safeSymbol}&from=${weekAgo}&to=${today}&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/calendar/earnings?from=${today}&to=${in30Days}&symbol=${safeSymbol}&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/stock/peers?symbol=${safeSymbol}&token=${FINNHUB_TOKEN}`),
  ])

  const [profile, quote, metrics, recommendations, newsRaw, earningsRaw, peersRaw] = await Promise.all([
    profileRes.json(),
    quoteRes.json(),
    metricsRes.json(),
    recommendRes.json(),
    newsRes.json(),
    earningsRes.json(),
    peersRes.json(),
  ])

  // Reject invalid/unknown tickers — no name and no price means nothing to show
  if (!profile.name && (!quote.c || quote.c === 0)) {
    return Response.json({ error: 'Invalid ticker' }, { status: 404 })
  }

  const news = Array.isArray(newsRaw) ? newsRaw.slice(0, 4) : []
  const latestRec = Array.isArray(recommendations) ? recommendations[0] : null

  // Stale consensus — Finnhub recommendation.period is "YYYY-MM-DD"
  const recDate = latestRec?.period ? new Date(latestRec.period) : null
  const daysSinceRec = recDate ? (Date.now() - recDate.getTime()) / (1000 * 60 * 60 * 24) : null
  const isStaleConsensus = daysSinceRec != null && daysSinceRec > 90
  // Peers: US-only tickers (no exchange suffixes like .TO, .L, .AX), filter self, cap at 6
  // Allows BRK.A / BRK.B style (single letter after dot) but rejects ENGH.TO, ACT.TO etc.
  const isUSTicker = (t: string) => /^[A-Z]{1,5}$/.test(t) || /^[A-Z]{1,4}\.[A-Z]$/.test(t)
  const peers: string[] = Array.isArray(peersRaw)
    ? (peersRaw as string[]).filter((p: string) => p !== safeSymbol && isUSTicker(p)).slice(0, 6)
    : []
  const nextEarnings = earningsRaw?.earningsCalendar?.[0] ?? null

  const catalystHint = nextEarnings
    ? `Next earnings: ${nextEarnings.date} (${nextEarnings.hour === 'amc' ? 'after close' : nextEarnings.hour === 'bmo' ? 'before open' : 'time TBD'}${nextEarnings.epsEstimate != null ? `, EPS est. $${nextEarnings.epsEstimate}` : ''})`
    : 'No earnings found in next 30 days'

  const eps = metrics?.metric?.epsBasicExclExtraTTM
  const peValue = metrics?.metric?.peBasicExclExtraTTM
  // Profitable if EPS > 0 OR P/E > 0 (P/E is more reliable for large caps)
  const isProfitable = (eps != null && eps > 0) || (peValue != null && peValue > 0)
  const peDisplay = peValue && peValue > 0 ? peValue.toFixed(1) : null

  // Revenue data
  const revenueGrowthRaw = metrics?.metric?.revenueGrowthTTMYoy
  const revenueGrowth = revenueGrowthRaw != null ? `${revenueGrowthRaw > 0 ? '+' : ''}${revenueGrowthRaw.toFixed(0)}% YoY` : null
  const revenueTTMRaw = metrics?.metric?.revenueTTM // in millions
  const revenueTTM = revenueTTMRaw != null
    ? revenueTTMRaw >= 1000 ? `$${(revenueTTMRaw / 1000).toFixed(2)}B TTM` : `$${revenueTTMRaw.toFixed(0)}M TTM`
    : null

  // Data quality signal — 'thin' when both revenue and analyst coverage are absent
  const analystTotal = latestRec
    ? (latestRec.buy ?? 0) + (latestRec.strongBuy ?? 0) + (latestRec.hold ?? 0) + (latestRec.sell ?? 0) + (latestRec.strongSell ?? 0)
    : 0
  const hasRevenue = revenueTTMRaw != null
  const hasAdequateAnalysts = analystTotal >= 3
  const dataQuality: 'strong' | 'moderate' | 'thin' =
    !hasRevenue && !hasAdequateAnalysts ? 'thin'
    : !hasRevenue || !hasAdequateAnalysts ? 'moderate'
    : 'strong'

  // IPO recency — if listed within 18 months, 52-week range is unreliable as a signal
  const ipoDateStr: string | undefined = profile.ipo
  const ipoDate = ipoDateStr ? new Date(ipoDateStr) : null
  const monthsSinceIpo = ipoDate ? (Date.now() - ipoDate.getTime()) / (1000 * 60 * 60 * 24 * 30) : null
  const isRecentListing = monthsSinceIpo != null && monthsSinceIpo < 18

  // Build pre-profit venture context block
  const preProfitBlock = !isProfitable ? `
IMPORTANT — PRE-PROFIT / VENTURE-STAGE COMPANY. Apply a venture frame, not a value/profitability frame:
- Negative EPS and "valued on future breakthroughs" are the ENTRY CRITERIA for this category, not bear signals. Do not cite them as negatives.
- Never use pre-profit status, negative EPS, or absence of P/E as a reason for a negative thesis.
- The relevant factors are: revenue trajectory (growing fast from a small base?), cash position vs. burn, key binary catalysts (funding decisions, regulatory approvals, partnerships), dilution risk (share issuance, ATM facilities), and moat development.
- A 🔴 Negative thesis is valid only if the core value-creation thesis is broken — e.g. a key catalyst definitively failed, cash runway is critically short, or a structural competitive threat emerged. Not because the company is pre-profit.${isRecentListing ? `
- LISTING CONTEXT: This stock listed/de-SPAC'd ~${Math.round(monthsSinceIpo!)} months ago (${ipoDateStr}). The 52-week high/low range is dominated by post-listing volatility, not 12 months of operating performance. Do NOT interpret the 52-week drawdown as evidence of business deterioration. The range reflects the post-listing derating, not the company's trajectory.` : ''}
` : ''

  const prompt = `You are a sharp equity analyst writing for a sophisticated retail investor. Given this data on ${safeSymbol} (${profile.name ?? safeSymbol}), return a JSON object with exactly these five fields:

{
  "about": "One sentence on what this company actually does — specific, not a sector label. E.g. 'Operates the world's largest e-commerce marketplace and cloud infrastructure platform (AWS).'",
  "quickTake": "2-3 sentences on the tape: price action, what's moving it this week, anything immediately worth flagging. Do NOT state the thesis or predict what will happen — that goes in thesis. Use ⚠️ for risks, ✅ for positives.",
  "thesis": "Start with exactly one of: 🟢 Positive, 🔴 Negative, or 🟡 Mixed — then one sentence on the fundamental story (what is driving value creation or destruction, not the tape). Follow with one sentence beginning with 'Risk:' naming the single biggest thing that would break or validate this thesis. Example: '🟢 Positive. Azure AI revenue growing 50%+ as enterprises migrate workloads. Risk: margin compression if GPU costs outpace revenue growth.'",
  "catalystEvent": "One sentence on the next scheduled event. Use the earnings data provided. If nothing notable: 'Nothing notable until next earnings.'",
  "catalystDriver": "One sentence naming the company-specific product, contract, approval, or operational capability actually moving this stock's valuation. A sector theme ('AI tailwind', 'macro momentum') is not acceptable — name what THIS company is doing. E.g. not 'AI tailwind' but 'Azure AI services revenue growing 50%+ as Fortune 500 enterprises migrate workloads.' Never leave blank."
}
${preProfitBlock}
Data:
- Price: $${quote.c} (${quote.dp > 0 ? '+' : ''}${quote.dp?.toFixed(2)}% today — use this exact figure)
- Market cap: ${profile.marketCapitalization ? '$' + (profile.marketCapitalization / 1000).toFixed(1) + 'B' : 'N/A'}
- Profitable: ${isProfitable ? 'Yes' : 'No — pre-profit, expected for this stage'}
- PE ratio: ${peDisplay ? peDisplay : 'N/A — pre-profit, do not cite'}
- Revenue: ${revenueTTM ?? 'N/A'}${revenueGrowth ? ` (${revenueGrowth})` : ''}
- 52w high/low: $${metrics?.metric?.['52WeekHigh'] ?? 'N/A'} / $${metrics?.metric?.['52WeekLow'] ?? 'N/A'}${isRecentListing ? ' (recent listing — see context above)' : ''}
- Analyst consensus: ${latestRec ? `${latestRec.buy} buy / ${latestRec.hold} hold / ${latestRec.sell} sell${isStaleConsensus ? ` (⚠️ stale — last updated ${Math.round(daysSinceRec!)} days ago, weight accordingly)` : ''}` : 'N/A'}
- Earnings: ${catalystHint}
- Recent headlines: ${news.slice(0, 2).map((n: { headline: string }) => n.headline).join(' | ')}

Rules:
- Be direct. No filler. No "it's worth noting", "it's important to", "notably".
- Use the exact price/change numbers provided.
- Do not anchor the thesis on recent price movement. Price action belongs in quickTake. The thesis reflects the fundamental business story only.
- If your catalystDriver is positive but your thesis is 🔴 Negative (or vice versa), acknowledge the tension explicitly in quickTake — e.g. 'Analysts are bullish but the thesis is clouded by…'
- On analyst consensus: high buy ratings on a speculative name often mean institutional discovery is complete, not guaranteed upside. Flag saturation if relevant. If consensus is stale, note it in quickTake.
- Return only valid JSON. No markdown code fences. No extra text.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 650,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  let parsed = { about: '', quickTake: '', thesis: '', catalystEvent: '', catalystDriver: '' }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    parsed.quickTake = cleaned
  }

  const result = {
    symbol: safeSymbol,
    name: profile.name ?? safeSymbol,
    sector: profile.finnhubIndustry ?? '',
    description: parsed.about || profile.description || '',
    logo: profile.logo ?? '',
    price: quote.c,
    change: quote.dp,
    marketCap: profile.marketCapitalization,
    pe: metrics?.metric?.peBasicExclExtraTTM ?? null,
    high52: metrics?.metric?.['52WeekHigh'] ?? null,
    low52: metrics?.metric?.['52WeekLow'] ?? null,
    isProfitable,
    recommendation: latestRec ? {
      buy: latestRec.buy ?? 0,
      strongBuy: latestRec.strongBuy ?? 0,
      hold: latestRec.hold ?? 0,
      sell: latestRec.sell ?? 0,
      strongSell: latestRec.strongSell ?? 0,
    } : null,
    peers,
    news: news.map((n: { headline: string; url: string; source: string }) => ({
      headline: n.headline,
      url: n.url,
      source: n.source,
    })),
    quickTake: parsed.quickTake,
    thesis: parsed.thesis,
    catalystEvent: parsed.catalystEvent,
    catalystDriver: parsed.catalystDriver,
    dataQuality,
    recommendationDate: latestRec?.period ?? null,
  }

  cache.set(safeSymbol, { data: result, ts: Date.now() })
  return Response.json(result, { headers: cacheHeaders })
}

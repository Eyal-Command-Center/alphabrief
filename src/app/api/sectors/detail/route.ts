import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TTL_MS = 12 * 60 * 60 * 1000 // 12 hours
const CACHE_KEY = 'sectors_all'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SECTORS = [
  { key: 'technology',     name: 'Technology',             etf: 'XLK', topStocks: ['NVDA', 'AAPL', 'MSFT'] },
  { key: 'healthcare',     name: 'Healthcare',             etf: 'XLV', topStocks: ['LLY', 'UNH', 'JNJ'] },
  { key: 'financials',     name: 'Financials',             etf: 'XLF', topStocks: ['JPM', 'BAC', 'V'] },
  { key: 'energy',         name: 'Energy',                 etf: 'XLE', topStocks: ['XOM', 'CVX', 'COP'] },
  { key: 'consumer-disc',  name: 'Consumer Discretionary', etf: 'XLY', topStocks: ['AMZN', 'TSLA', 'MCD'] },
  { key: 'industrials',    name: 'Industrials',            etf: 'XLI', topStocks: ['CAT', 'UNP', 'GE'] },
  { key: 'comm-services',  name: 'Communication Services', etf: 'XLC', topStocks: ['META', 'GOOGL', 'NFLX'] },
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sector = searchParams.get('sector')?.toLowerCase()

  const cacheHeaders = { 'Cache-Control': 's-maxage=43200, stale-while-revalidate=86400' }

  // Check Supabase cache — survives deployments and is shared across all instances
  const { data: cached } = await supabase
    .from('cache')
    .select('data, created_at')
    .eq('key', CACHE_KEY)
    .single()

  if (cached && Date.now() - new Date(cached.created_at).getTime() < TTL_MS) {
    const all = cached.data as Record<string, unknown>
    if (sector) {
      return sector in all
        ? Response.json(all[sector], { headers: cacheHeaders })
        : Response.json({ error: 'Invalid sector' }, { status: 400 })
    }
    return Response.json(all, { headers: cacheHeaders })
  }

  // Fetch all ETF quotes + news in parallel
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const fetches = await Promise.all(
    SECTORS.map(async (s) => {
      const [quoteRes, newsRes, metricsRes] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/quote?symbol=${s.etf}&token=${FINNHUB_TOKEN}`),
        fetch(`https://finnhub.io/api/v1/company-news?symbol=${s.etf}&from=${weekAgo}&to=${today}&token=${FINNHUB_TOKEN}`),
        fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${s.etf}&metric=all&token=${FINNHUB_TOKEN}`),
      ])
      const [quote, newsRaw, metrics] = await Promise.all([quoteRes.json(), newsRes.json(), metricsRes.json()])
      const news = Array.isArray(newsRaw) ? newsRaw.slice(0, 3) : []
      return { ...s, quote, news, metrics }
    })
  )

  // Build one prompt for all 7 sectors
  const sectorBlocks = fetches.map(s => {
    const mtd = s.metrics?.metric?.monthToDatePriceReturnDaily
    const ytd = s.metrics?.metric?.yearToDatePriceReturnDaily
    const mtdStr = mtd != null ? `${mtd > 0 ? '+' : ''}${mtd.toFixed(1)}% MTD` : null
    const ytdStr = ytd != null ? `${ytd > 0 ? '+' : ''}${ytd.toFixed(1)}% YTD` : null
    const perf = [mtdStr, ytdStr].filter(Boolean).join(' | ')
    return `${s.name} (${s.etf}): $${s.quote.c} | today: ${s.quote.dp > 0 ? '+' : ''}${s.quote.dp?.toFixed(2)}%${perf ? ` | ${perf}` : ''}
Headlines: ${s.news.map((n: { headline: string }) => n.headline).join(' | ') || 'None'}`
  }).join('\n\n')

  const prompt = `You are a sharp macro analyst writing sector-level views for a sophisticated retail investor. Given ETF price and performance data for 7 US equity sectors, return a single JSON object where each key is the sector key below, and each value has exactly these fields:

{
  "thesis": "Start with 🟢 Positive, 🔴 Negative, or 🟡 Neutral — then one sentence on the sector's structural direction and the key force driving it.",
  "drivers": ["driver 1 — one sentence", "driver 2 — one sentence", "driver 3 — one sentence"],
  "catalyst": "One sentence on the most important upcoming event or data print for this sector.",
  "outlook": "One sentence on what would change the thesis — the specific trigger that shifts the verdict."
}

Sector keys: technology, healthcare, financials, energy, consumer-disc, industrials, comm-services

Data:
${sectorBlocks}

Rules:
- The thesis must reflect structural, sector-wide forces: earnings revision trends, capex cycles, interest rate sensitivity, regulatory environment, or monetization pace. It must NOT be derived from today's price move.
- Today's % change is context only. A -1% day does not make a thesis negative. A +2% day does not make it positive. Use MTD and YTD for trend direction — not the daily blip.
- Each driver must describe a sector-wide force. If you reference a specific company, it must explicitly illustrate a broader sector trend, not serve as the thesis itself. "Alphabet losing AI talent" is not a Technology sector driver. "Hyperscalers accelerating AI infrastructure capex" is.
- Do not use vague market sentiment language ("institutional repositioning underway", "market warns of correction"). Name the specific structural force.
- Be direct. No filler phrases.
- drivers must be exactly 3 strings per sector.
- Return only valid JSON. No markdown code fences. No extra text.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

  let parsed: Record<string, { thesis: string; drivers: string[]; catalyst: string; outlook: string }> = {}
  try { parsed = JSON.parse(cleaned) } catch { /* fall through with empty */ }

  // Build full result keyed by sector
  const result: Record<string, unknown> = {}
  for (const s of fetches) {
    const ai = parsed[s.key] ?? { thesis: '', drivers: [], catalyst: '', outlook: '' }
    result[s.key] = {
      sector: s.key,
      name: s.name,
      etf: s.etf,
      price: s.quote.c,
      change: s.quote.dp,
      topStocks: s.topStocks,
      thesis: ai.thesis,
      drivers: ai.drivers ?? [],
      catalyst: ai.catalyst,
      outlook: ai.outlook,
    }
  }

  // Persist to Supabase — survives deployments, shared across all instances
  await supabase.from('cache').upsert({ key: CACHE_KEY, data: result, created_at: new Date().toISOString() })

  if (sector) {
    return sector in result
      ? Response.json(result[sector], { headers: cacheHeaders })
      : Response.json({ error: 'Invalid sector' }, { status: 400 })
  }
  return Response.json(result, { headers: cacheHeaders })
}

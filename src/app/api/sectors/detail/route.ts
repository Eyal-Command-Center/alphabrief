import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TTL_MS = 60 * 60 * 1000 // 1 hour
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

  const cacheHeaders = { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' }

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
      const [quoteRes, newsRes] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/quote?symbol=${s.etf}&token=${FINNHUB_TOKEN}`),
        fetch(`https://finnhub.io/api/v1/company-news?symbol=${s.etf}&from=${weekAgo}&to=${today}&token=${FINNHUB_TOKEN}`),
      ])
      const [quote, newsRaw] = await Promise.all([quoteRes.json(), newsRes.json()])
      const news = Array.isArray(newsRaw) ? newsRaw.slice(0, 2) : []
      return { ...s, quote, news }
    })
  )

  // Build one prompt for all 7 sectors
  const sectorBlocks = fetches.map(s =>
    `${s.name} (${s.etf}): $${s.quote.c} (${s.quote.dp > 0 ? '+' : ''}${s.quote.dp?.toFixed(2)}% today)
Headlines: ${s.news.map((n: { headline: string }) => n.headline).join(' | ') || 'None'}`
  ).join('\n\n')

  const prompt = `You are a sharp macro analyst. Given today's ETF data for 7 US equity sectors, return a single JSON object where each key is the sector key below, and each value has exactly these fields:

{
  "thesis": "Start with 🟢 Positive, 🔴 Negative, or 🟡 Neutral — then one sentence on direction and key risk/opportunity.",
  "drivers": ["driver 1 — one sentence", "driver 2 — one sentence", "driver 3 — one sentence"],
  "catalyst": "One sentence on the most important upcoming event for this sector.",
  "outlook": "One sentence on what would change the thesis."
}

Sector keys: technology, healthcare, financials, energy, consumer-disc, industrials, comm-services

Data:
${sectorBlocks}

Rules:
- Be direct. No filler phrases.
- drivers must be exactly 3 strings per sector.
- Return only valid JSON. No markdown code fences. No extra text.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
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

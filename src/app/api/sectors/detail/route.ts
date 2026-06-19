import Anthropic from '@anthropic-ai/sdk'

const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TTL_MS = 20 * 60 * 1000
const cache = new Map<string, { data: unknown; ts: number }>()

const SECTORS: Record<string, { etf: string; topStocks: string[]; description: string }> = {
  technology:       { etf: 'XLK', topStocks: ['NVDA', 'AAPL', 'MSFT'], description: 'Technology' },
  healthcare:       { etf: 'XLV', topStocks: ['LLY', 'UNH', 'JNJ'],   description: 'Healthcare' },
  financials:       { etf: 'XLF', topStocks: ['JPM', 'BAC', 'V'],      description: 'Financials' },
  energy:           { etf: 'XLE', topStocks: ['XOM', 'CVX', 'COP'],    description: 'Energy' },
  'consumer-disc':  { etf: 'XLY', topStocks: ['AMZN', 'TSLA', 'MCD'], description: 'Consumer Discretionary' },
  industrials:      { etf: 'XLI', topStocks: ['CAT', 'UNP', 'GE'],    description: 'Industrials' },
  'comm-services':  { etf: 'XLC', topStocks: ['META', 'GOOGL', 'NFLX'], description: 'Communication Services' },
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sector = searchParams.get('sector')?.toLowerCase()

  if (!sector || !SECTORS[sector]) {
    return Response.json({ error: 'Invalid sector' }, { status: 400 })
  }

  const cached = cache.get(sector)
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return Response.json(cached.data)
  }

  const { etf, topStocks, description } = SECTORS[sector]
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [quoteRes, newsRes] = await Promise.all([
    fetch(`https://finnhub.io/api/v1/quote?symbol=${etf}&token=${FINNHUB_TOKEN}`),
    fetch(`https://finnhub.io/api/v1/company-news?symbol=${etf}&from=${weekAgo}&to=${today}&token=${FINNHUB_TOKEN}`),
  ])

  const [quote, newsRaw] = await Promise.all([quoteRes.json(), newsRes.json()])
  const news = Array.isArray(newsRaw) ? newsRaw.slice(0, 3) : []

  const prompt = `You are a sharp macro and sector analyst. Given this data on the ${description} sector (ETF: ${etf}), return a JSON object with exactly these four fields:

{
  "thesis": "Start with exactly one of: 🟢 Positive, 🔴 Negative, or 🟡 Neutral — then one sentence on the sector's current direction and key risk/opportunity.",
  "drivers": ["driver 1 — one sentence", "driver 2 — one sentence", "driver 3 — one sentence"],
  "catalyst": "One sentence on the most important upcoming event or data point for this sector.",
  "outlook": "One sentence on what would change the thesis — either direction."
}

Data:
- ETF (${etf}): $${quote.c} (${quote.dp > 0 ? '+' : ''}${quote.dp?.toFixed(2)}% today)
- Recent headlines: ${news.map((n: { headline: string }) => n.headline).join(' | ') || 'None available'}

Rules:
- Be direct and specific. No filler phrases.
- drivers must be an array of exactly 3 strings.
- Return only valid JSON. No markdown code fences.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  let parsed = { thesis: '', drivers: [] as string[], catalyst: '', outlook: '' }
  try { parsed = JSON.parse(cleaned) } catch { parsed.thesis = cleaned }

  const result = {
    sector,
    name: description,
    etf,
    price: quote.c,
    change: quote.dp,
    topStocks,
    thesis: parsed.thesis,
    drivers: parsed.drivers ?? [],
    catalyst: parsed.catalyst,
    outlook: parsed.outlook,
  }

  cache.set(sector, { data: result, ts: Date.now() })
  return Response.json(result)
}

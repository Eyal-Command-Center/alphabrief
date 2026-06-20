import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY

const SYMBOL_RE = /^[A-Z0-9.\-]{1,10}$/

async function getQuote(symbol: string) {
  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_TOKEN}`
  )
  return res.json()
}

async function getNews(symbol: string) {
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  const res = await fetch(
    `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${weekAgo}&to=${today}&token=${FINNHUB_TOKEN}`
  )
  const news = await res.json()
  return Array.isArray(news) ? news.slice(0, 5) : []
}

async function getEarnings(symbol: string) {
  const today = new Date().toISOString().split('T')[0]
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  const res = await fetch(
    `https://finnhub.io/api/v1/calendar/earnings?from=${today}&to=${nextMonth}&symbol=${symbol}&token=${FINNHUB_TOKEN}`
  )
  return res.json()
}

export async function POST(req: Request) {
  // Auth check — this route calls Claude + Finnhub, never expose unauthenticated
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { tickers } = await req.json()

  // Cap at 20 and sanitize each symbol
  const safeTickers: string[] = (Array.isArray(tickers) ? tickers : [])
    .slice(0, 20)
    .map((s: unknown) => String(s).trim().toUpperCase())
    .filter((s: string) => SYMBOL_RE.test(s))

  if (!safeTickers.length) return Response.json({ brief: '' })

  const data = await Promise.all(
    safeTickers.map(async (symbol) => {
      const [quote, news, earnings] = await Promise.all([
        getQuote(symbol),
        getNews(symbol),
        getEarnings(symbol),
      ])
      return { symbol, quote, news, earnings }
    })
  )

  const prompt = `You are a sharp, concise financial analyst generating a morning brief for a retail investor's portfolio.

For each stock, use this exact markdown structure:

## TICKER — Company Name

### Price Snapshot
One sentence: current price, % change today, notable or not.

### Top News
- News item 1 in plain English
- News item 2 in plain English
- News item 3 if relevant

### Upcoming Catalyst
One sentence on the next earnings date or key event. If nothing notable in the next 30 days, write exactly: "Nothing notable until next earnings."

### Thesis Check
Begin with a sentiment signal on its own line: 🟢 Positive, 🔴 Negative, or 🟡 No change — then one sentence on whether anything is shifting the fundamental story.

---

Rules:
- Tone: smart but human, like a knowledgeable friend — not a Bloomberg terminal
- Be direct. No filler. No "it's worth noting that".
- Flag anything urgent with ⚠️
- Separate each stock with ---

Portfolio data:
${JSON.stringify(data, null, 2)}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const brief =
    message.content[0].type === 'text' ? message.content[0].text : ''

  return Response.json({ brief })
}

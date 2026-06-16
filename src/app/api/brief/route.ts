import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY

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
  const { tickers } = await req.json()

  const data = await Promise.all(
    tickers.map(async (symbol: string) => {
      const [quote, news, earnings] = await Promise.all([
        getQuote(symbol),
        getNews(symbol),
        getEarnings(symbol),
      ])
      return { symbol, quote, news, earnings }
    })
  )

  const prompt = `You are a sharp, concise financial analyst generating a morning brief for a retail investor's portfolio.

For each stock below, provide:
1. **Price snapshot** — current price, % change today, and whether it's notable
2. **Top news** — 2-3 most important items from the last 7 days, explained in plain English (no jargon)
3. **Upcoming catalyst** — any earnings or key events in the next 30 days
4. **Thesis check** — one line: is anything changing the fundamental story?

Rules:
- Tone: smart but human, like a knowledgeable friend — not a Bloomberg terminal
- Be direct and brief. No filler sentences.
- If there's nothing notable for a section, say so in one word: "quiet"
- Flag anything that needs attention with ⚠️

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

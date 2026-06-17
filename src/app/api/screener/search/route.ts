const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  if (!q) return Response.json({ results: [] })

  const res = await fetch(
    `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FINNHUB_TOKEN}`
  )
  const data = await res.json()

  const results = (data.result ?? [])
    .filter((r: { type: string; symbol: string }) => r.type === 'Common Stock' && !r.symbol.includes('.'))
    .slice(0, 8)
    .map((r: { symbol: string; description: string }) => ({
      symbol: r.symbol,
      name: r.description,
    }))

  return Response.json({ results })
}

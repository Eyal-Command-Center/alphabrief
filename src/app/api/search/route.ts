const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  if (!q || q.length < 1) return Response.json({ results: [] })

  const res = await fetch(
    `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FINNHUB_TOKEN}`
  )
  const data = await res.json()

  const results = (data.result ?? [])
    .filter((r: { type: string }) => r.type === 'Common Stock')
    .slice(0, 6)
    .map((r: { symbol: string; description: string; displaySymbol: string }) => ({
      symbol: r.displaySymbol || r.symbol,
      name: r.description,
    }))

  return Response.json({ results })
}

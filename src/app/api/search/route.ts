const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY

// Popular tickers for reliable prefix-match fallback
// Ensures e.g. "aap" → AAPL, "ts" → TSLA, etc.
const TOP_TICKERS: { symbol: string; name: string }[] = [
  { symbol: 'AAPL', name: 'Apple Inc' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'AMZN', name: 'Amazon.com Inc' },
  { symbol: 'GOOGL', name: 'Alphabet Inc (Class A)' },
  { symbol: 'GOOG', name: 'Alphabet Inc (Class C)' },
  { symbol: 'META', name: 'Meta Platforms Inc' },
  { symbol: 'TSLA', name: 'Tesla Inc' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc' },
  { symbol: 'LLY', name: 'Eli Lilly and Company' },
  { symbol: 'AVGO', name: 'Broadcom Inc' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co' },
  { symbol: 'V', name: 'Visa Inc' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation' },
  { symbol: 'MA', name: 'Mastercard Inc' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'PG', name: 'Procter & Gamble Co' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation' },
  { symbol: 'HD', name: 'Home Depot Inc' },
  { symbol: 'ABBV', name: 'AbbVie Inc' },
  { symbol: 'MRK', name: 'Merck & Co Inc' },
  { symbol: 'CVX', name: 'Chevron Corporation' },
  { symbol: 'BAC', name: 'Bank of America Corporation' },
  { symbol: 'NFLX', name: 'Netflix Inc' },
  { symbol: 'KO', name: 'Coca-Cola Company' },
  { symbol: 'AMD', name: 'Advanced Micro Devices Inc' },
  { symbol: 'WMT', name: 'Walmart Inc' },
  { symbol: 'CRM', name: 'Salesforce Inc' },
  { symbol: 'ORCL', name: 'Oracle Corporation' },
  { symbol: 'PEP', name: 'PepsiCo Inc' },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific Inc' },
  { symbol: 'ACN', name: 'Accenture plc' },
  { symbol: 'MCD', name: "McDonald's Corporation" },
  { symbol: 'ABT', name: 'Abbott Laboratories' },
  { symbol: 'CSCO', name: 'Cisco Systems Inc' },
  { symbol: 'GE', name: 'GE Aerospace' },
  { symbol: 'CAT', name: 'Caterpillar Inc' },
  { symbol: 'DIS', name: 'Walt Disney Company' },
  { symbol: 'IBM', name: 'IBM Corporation' },
  { symbol: 'NOW', name: 'ServiceNow Inc' },
  { symbol: 'INTU', name: 'Intuit Inc' },
  { symbol: 'AMGN', name: 'Amgen Inc' },
  { symbol: 'GS', name: 'Goldman Sachs Group Inc' },
  { symbol: 'QCOM', name: 'Qualcomm Inc' },
  { symbol: 'UBER', name: 'Uber Technologies Inc' },
  { symbol: 'SPOT', name: 'Spotify Technology SA' },
  { symbol: 'PLTR', name: 'Palantir Technologies Inc' },
  { symbol: 'SNOW', name: 'Snowflake Inc' },
  { symbol: 'COIN', name: 'Coinbase Global Inc' },
  { symbol: 'SQ', name: 'Block Inc' },
  { symbol: 'SHOP', name: 'Shopify Inc' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc' },
  { symbol: 'ADBE', name: 'Adobe Inc' },
  { symbol: 'INTC', name: 'Intel Corporation' },
  { symbol: 'MU', name: 'Micron Technology Inc' },
  { symbol: 'AMAT', name: 'Applied Materials Inc' },
  { symbol: 'LRCX', name: 'Lam Research Corporation' },
  { symbol: 'ARM', name: 'Arm Holdings plc' },
  { symbol: 'ASML', name: 'ASML Holding NV' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor Manufacturing' },
  { symbol: 'BABA', name: 'Alibaba Group Holding Ltd' },
  { symbol: 'PDD', name: 'PDD Holdings Inc' },
  { symbol: 'MELI', name: 'MercadoLibre Inc' },
  { symbol: 'SE', name: 'Sea Limited' },
  { symbol: 'SOFI', name: 'SoFi Technologies Inc' },
  { symbol: 'HOOD', name: 'Robinhood Markets Inc' },
  { symbol: 'RBLX', name: 'Roblox Corporation' },
  { symbol: 'U', name: 'Unity Software Inc' },
  { symbol: 'PATH', name: 'UiPath Inc' },
  { symbol: 'AI', name: 'C3.ai Inc' },
  { symbol: 'IONQ', name: 'IonQ Inc' },
  { symbol: 'RGTI', name: 'Rigetti Computing Inc' },
  { symbol: 'QUBT', name: 'Quantum Computing Inc' },
  { symbol: 'SOUN', name: 'SoundHound AI Inc' },
  { symbol: 'SMCI', name: 'Super Micro Computer Inc' },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings Inc' },
  { symbol: 'PANW', name: 'Palo Alto Networks Inc' },
  { symbol: 'ZS', name: 'Zscaler Inc' },
  { symbol: 'S', name: 'SentinelOne Inc' },
  { symbol: 'DDOG', name: 'Datadog Inc' },
  { symbol: 'NET', name: 'Cloudflare Inc' },
  { symbol: 'GTLB', name: 'GitLab Inc' },
  { symbol: 'HUBS', name: 'HubSpot Inc' },
  { symbol: 'TEAM', name: 'Atlassian Corporation' },
  { symbol: 'ZM', name: 'Zoom Video Communications Inc' },
  { symbol: 'OKTA', name: 'Okta Inc' },
  { symbol: 'TWLO', name: 'Twilio Inc' },
  { symbol: 'MDB', name: 'MongoDB Inc' },
  { symbol: 'ESTC', name: 'Elastic NV' },
  { symbol: 'DOCN', name: 'DigitalOcean Holdings Inc' },
  { symbol: 'ABNB', name: 'Airbnb Inc' },
  { symbol: 'LYFT', name: 'Lyft Inc' },
  { symbol: 'DASH', name: 'DoorDash Inc' },
  { symbol: 'RIVN', name: 'Rivian Automotive Inc' },
  { symbol: 'LCID', name: 'Lucid Group Inc' },
  { symbol: 'F', name: 'Ford Motor Company' },
  { symbol: 'GM', name: 'General Motors Company' },
  { symbol: 'BA', name: 'Boeing Company' },
  { symbol: 'RTX', name: 'RTX Corporation' },
  { symbol: 'LMT', name: 'Lockheed Martin Corporation' },
  { symbol: 'NOC', name: 'Northrop Grumman Corporation' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF' },
  { symbol: 'ARKK', name: 'ARK Innovation ETF' },
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  if (!q || q.length < 1) return Response.json({ results: [] })

  const upper = q.toUpperCase()

  // Local prefix matches from top-tickers list
  const localMatches = TOP_TICKERS.filter(t => t.symbol.startsWith(upper))

  // Finnhub results (fetch more to improve coverage)
  let finnhubResults: { symbol: string; name: string }[] = []
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FINNHUB_TOKEN}`
    )
    const data = await res.json()
    const validTicker = /^[A-Z]{1,5}$/
    finnhubResults = (data.result ?? [])
      .filter((r: { type: string; displaySymbol: string }) =>
        r.type === 'Common Stock' && validTicker.test(r.displaySymbol)
      )
      .slice(0, 10)
      .map((r: { symbol: string; description: string; displaySymbol: string }) => ({
        symbol: r.displaySymbol,
        name: r.description,
      }))
  } catch {}

  // Merge: local prefix matches first (shorter symbol = higher rank), then Finnhub extras
  const seen = new Set<string>()
  const merged: { symbol: string; name: string }[] = []

  // Sort local matches: exact match first, then by length
  const sortedLocal = [...localMatches].sort((a, b) => {
    if (a.symbol === upper) return -1
    if (b.symbol === upper) return 1
    return a.symbol.length - b.symbol.length
  })

  for (const t of sortedLocal) {
    if (!seen.has(t.symbol)) { seen.add(t.symbol); merged.push(t) }
  }
  for (const t of finnhubResults) {
    if (!seen.has(t.symbol)) { seen.add(t.symbol); merged.push(t) }
  }

  return Response.json({ results: merged.slice(0, 6) })
}

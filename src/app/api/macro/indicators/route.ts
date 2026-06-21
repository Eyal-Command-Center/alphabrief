// /api/macro/indicators — live macro context strip
// Fetches CPI, labor market, and Treasury yields from Massive/Polygon free economy endpoints
// 1-hour server cache — data updates daily (yields) or monthly (CPI, unemployment)

const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY
const BASE = 'https://api.polygon.io'

// 1-hour in-memory cache
let cache: { ts: number; data: MacroIndicators } | null = null
const CACHE_MS = 60 * 60 * 1000

export interface MacroIndicators {
  cpi_yoy: number | null        // CPI year-over-year %
  core_cpi_yoy: number | null   // Core CPI (ex food & energy) YoY %
  unemployment: number | null   // Unemployment rate %
  yield_2y: number | null       // 2-year Treasury yield %
  yield_10y: number | null      // 10-year Treasury yield %
  yield_spread: number | null   // 10Y - 2Y spread (bps)
  as_of: {
    yields: string | null
    inflation: string | null
    labor: string | null
  }
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export async function GET() {
  // Serve from cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return Response.json(cache.data)
  }

  if (!MASSIVE_API_KEY) {
    return Response.json({ error: 'Missing MASSIVE_API_KEY' }, { status: 500 })
  }

  const today = new Date()
  // Fetch data from last 60 days for yields (daily), last 15 months for inflation (need YoY)
  const yieldFrom = new Date(today)
  yieldFrom.setDate(yieldFrom.getDate() - 60)
  const inflationFrom = new Date(today)
  inflationFrom.setMonth(inflationFrom.getMonth() - 15)

  const yieldFromStr = yieldFrom.toISOString().split('T')[0]
  const inflationFromStr = inflationFrom.toISOString().split('T')[0]

  // Fetch all 3 in parallel
  const [yieldsData, inflationData, laborData] = await Promise.all([
    fetchJson(`${BASE}/fed/v1/treasury-yields?apiKey=${MASSIVE_API_KEY}&date.gte=${yieldFromStr}&limit=50`),
    fetchJson(`${BASE}/fed/v1/inflation?apiKey=${MASSIVE_API_KEY}&date.gte=${inflationFromStr}&limit=16`),
    fetchJson(`${BASE}/fed/v1/labor-market?apiKey=${MASSIVE_API_KEY}&date.gte=${inflationFromStr}&limit=16`),
  ])

  const result: MacroIndicators = {
    cpi_yoy: null,
    core_cpi_yoy: null,
    unemployment: null,
    yield_2y: null,
    yield_10y: null,
    yield_spread: null,
    as_of: { yields: null, inflation: null, labor: null },
  }

  // Treasury yields — take the most recent entry
  if (yieldsData?.results?.length) {
    const latest = yieldsData.results[yieldsData.results.length - 1]
    result.yield_2y = latest.yield_2_year ?? null
    result.yield_10y = latest.yield_10_year ?? null
    if (result.yield_2y !== null && result.yield_10y !== null) {
      result.yield_spread = Math.round((result.yield_10y - result.yield_2y) * 100) // bps
    }
    result.as_of.yields = latest.date ?? null
  }

  // Inflation — compute YoY from CPI values (need current month vs same month last year)
  if (inflationData?.results?.length) {
    const rows: { date: string; cpi?: number; cpi_core?: number }[] = inflationData.results
    // Find the most recent row that has CPI
    const withCpi = rows.filter(r => r.cpi != null)
    const withCore = rows.filter(r => r.cpi_core != null)

    if (withCpi.length >= 2) {
      const latest = withCpi[withCpi.length - 1]
      // Find the row from ~12 months ago (same month last year)
      const latestMonth = latest.date.slice(0, 7) // "YYYY-MM"
      const [yr, mo] = latestMonth.split('-').map(Number)
      const priorMonthStr = `${yr - 1}-${String(mo).padStart(2, '0')}`
      const prior = withCpi.find(r => r.date.startsWith(priorMonthStr))
      if (prior?.cpi && latest.cpi) {
        result.cpi_yoy = parseFloat(((latest.cpi - prior.cpi) / prior.cpi * 100).toFixed(2))
      }
      result.as_of.inflation = latest.date
    }

    if (withCore.length >= 2) {
      const latest = withCore[withCore.length - 1]
      const latestMonth = latest.date.slice(0, 7)
      const [yr, mo] = latestMonth.split('-').map(Number)
      const priorMonthStr = `${yr - 1}-${String(mo).padStart(2, '0')}`
      const prior = withCore.find(r => r.date.startsWith(priorMonthStr))
      if (prior?.cpi_core && latest.cpi_core) {
        result.core_cpi_yoy = parseFloat(((latest.cpi_core - prior.cpi_core) / prior.cpi_core * 100).toFixed(2))
      }
    }
  }

  // Labor market — most recent unemployment rate
  if (laborData?.results?.length) {
    const withUnemp = laborData.results.filter((r: { unemployment_rate?: number }) => r.unemployment_rate != null)
    if (withUnemp.length) {
      const latest = withUnemp[withUnemp.length - 1]
      result.unemployment = latest.unemployment_rate ?? null
      result.as_of.labor = latest.date ?? null
    }
  }

  cache = { ts: Date.now(), data: result }
  return Response.json(result)
}

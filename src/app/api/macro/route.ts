// Key US macro events — sourced from official Fed, BLS, and BEA published schedules.
// Update this list each quarter as new dates are released.
const MACRO_EVENTS = [
  { event: 'PCE Inflation (May)', date: '2026-06-27', category: 'Inflation' },
  { event: 'Jobs Report (June)', date: '2026-07-03', category: 'Employment' },
  { event: 'CPI (June)', date: '2026-07-15', category: 'Inflation' },
  { event: 'FOMC Meeting', date: '2026-07-28', category: 'Fed' },
  { event: 'FOMC Decision & Press Conference', date: '2026-07-29', category: 'Fed' },
  { event: 'PCE Inflation (June)', date: '2026-07-31', category: 'Inflation' },
  { event: 'Jobs Report (July)', date: '2026-08-07', category: 'Employment' },
  { event: 'CPI (July)', date: '2026-08-13', category: 'Inflation' },
  { event: 'PCE Inflation (July)', date: '2026-08-28', category: 'Inflation' },
  { event: 'Jobs Report (August)', date: '2026-09-04', category: 'Employment' },
  { event: 'CPI (August)', date: '2026-09-11', category: 'Inflation' },
  { event: 'FOMC Meeting', date: '2026-09-15', category: 'Fed' },
  { event: 'FOMC Decision & Press Conference', date: '2026-09-16', category: 'Fed' },
  { event: 'PCE Inflation (August)', date: '2026-09-25', category: 'Inflation' },
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return Response.json({ error: 'Missing params' }, { status: 400 })
  }

  const fromDate = new Date(from)
  const toDate = new Date(to)

  const events = MACRO_EVENTS.filter(e => {
    const d = new Date(e.date)
    return d >= fromDate && d <= toDate
  })

  return Response.json({ events })
}

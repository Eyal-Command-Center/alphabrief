// Heartbeat cron. Does nothing but record that it ran.
// Exists to settle whether Vercel Hobby allows more than 2 cron jobs and
// whether several once-daily crons at different hours each fire.
export async function GET(req: Request) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return Response.json({ ok: true, firedAt: new Date().toISOString() })
}

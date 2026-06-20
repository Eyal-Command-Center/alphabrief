import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function makeAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function extractSentiment(thesis: string): 'positive' | 'negative' | 'neutral' {
  if (thesis.includes('🟢')) return 'positive'
  if (thesis.includes('🔴')) return 'negative'
  return 'neutral'
}

function sentimentEmoji(s: string) {
  if (s === 'positive') return '🟢'
  if (s === 'negative') return '🔴'
  return '🟡'
}

function sentimentLabel(s: string) {
  if (s === 'positive') return 'Positive'
  if (s === 'negative') return 'Negative'
  return 'Neutral'
}

function buildAlertEmail(symbol: string, prevSentiment: string, newSentiment: string, newThesis: string): string {
  const prevEmoji = sentimentEmoji(prevSentiment)
  const newEmoji = sentimentEmoji(newSentiment)
  const prevLabel = sentimentLabel(prevSentiment)
  const newLabel = sentimentLabel(newSentiment)
  const isWorse = newSentiment === 'negative'
  const accentColor = isWorse ? '#ef4444' : '#10b981'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; padding: 40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

        <tr>
          <td style="background: #0f172a; padding: 28px 32px;">
            <p style="margin: 0; font-size: 22px; font-weight: 300; color: #10b981; font-family: Georgia, serif;">
              α <span style="color: #ffffff; font-weight: 600; font-size: 20px;">Alpha<span style="color: #10b981;">Brief</span></span>
            </p>
            <p style="margin: 6px 0 0; color: #64748b; font-size: 13px;">Thesis Alert</p>
          </td>
        </tr>

        <tr>
          <td style="padding: 32px;">
            <h2 style="margin: 0 0 6px; font-size: 22px; font-weight: 700; color: #0f172a;">
              ${symbol} thesis changed
            </h2>
            <p style="margin: 0 0 24px; color: #64748b; font-size: 14px;">
              We detected a shift in the investment thesis for ${symbol}.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
              <tr>
                <td style="width: 48%; background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center;">
                  <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">Was</p>
                  <p style="margin: 0; font-size: 20px;">${prevEmoji}</p>
                  <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #64748b;">${prevLabel}</p>
                </td>
                <td style="width: 4%; text-align: center; color: #94a3b8; font-size: 20px;">→</td>
                <td style="width: 48%; background: #f0fdf4; border: 1px solid ${accentColor}33; border-radius: 12px; padding: 16px; text-align: center;">
                  <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">Now</p>
                  <p style="margin: 0; font-size: 20px;">${newEmoji}</p>
                  <p style="margin: 4px 0 0; font-size: 14px; font-weight: 700; color: ${accentColor};">${newLabel}</p>
                </td>
              </tr>
            </table>

            <div style="background: #f8fafc; border-left: 3px solid ${accentColor}; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 28px;">
              <p style="margin: 0 0 6px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">New thesis</p>
              <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">${newThesis}</p>
            </div>

            <div style="text-align: center;">
              <a href="https://alphabrief.io/app?t=${symbol}" style="display: inline-block; background: #10b981; color: #0f172a; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none;">
                View full ${symbol} brief →
              </a>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding: 20px 32px; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
              AlphaBrief Pro · Thesis Alerts
              &nbsp;·&nbsp;
              <a href="https://alphabrief.io/app/settings" style="color: #94a3b8;">Manage alerts</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function GET(req: Request) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = makeAdminClient()

  // Fetch all pro users with alerts enabled
  const { data: portfolios } = await supabase
    .from('portfolios')
    .select('user_id, user_email, tickers, alerts_enabled')
    .eq('is_pro', true)
    .eq('alerts_enabled', true)
    .not('tickers', 'is', null)
    .not('user_email', 'is', null)

  if (!portfolios?.length) return Response.json({ checked: 0, alerted: 0 })

  let checked = 0
  let alerted = 0

  for (const portfolio of portfolios) {
    const { user_id, user_email, tickers } = portfolio
    if (!tickers?.length || !user_email) continue

    // Cap at 10 stocks for Pro
    const watchlist: string[] = (tickers as string[]).slice(0, 10)

    for (const symbol of watchlist) {
      checked++
      try {
        // Fetch fresh thesis
        const res = await fetch(`https://alphabrief.io/api/screener/detail?symbol=${symbol}`, {
          headers: { 'Cache-Control': 'no-store' },
        })
        if (!res.ok) continue
        const data = await res.json()
        const newThesis: string = data.thesis ?? ''
        if (!newThesis) continue

        const newSentiment = extractSentiment(newThesis)

        // Get stored snapshot
        const { data: snap } = await supabase
          .from('thesis_snapshots')
          .select('sentiment, thesis')
          .eq('user_id', user_id)
          .eq('symbol', symbol)
          .single()

        if (!snap) {
          // First run — store snapshot, no alert
          await supabase.from('thesis_snapshots').insert({
            user_id,
            symbol,
            sentiment: newSentiment,
            thesis: newThesis,
            checked_at: new Date().toISOString(),
          })
          continue
        }

        // Alert if sentiment flipped
        if (snap.sentiment !== newSentiment) {
          await resend.emails.send({
            from: 'AlphaBrief <briefs@alphabrief.io>',
            to: user_email,
            subject: `⚠️ ${symbol} thesis changed — ${sentimentLabel(snap.sentiment)} → ${sentimentLabel(newSentiment)}`,
            html: buildAlertEmail(symbol, snap.sentiment, newSentiment, newThesis),
          })
          alerted++
        }

        // Always update snapshot
        await supabase.from('thesis_snapshots')
          .upsert({
            user_id,
            symbol,
            sentiment: newSentiment,
            thesis: newThesis,
            checked_at: new Date().toISOString(),
          }, { onConflict: 'user_id,symbol' })

      } catch {
        // Continue on error for any single stock
      }
    }
  }

  return Response.json({ checked, alerted })
}

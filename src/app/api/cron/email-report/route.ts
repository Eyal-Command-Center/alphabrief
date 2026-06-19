import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY

// Service-role client — bypasses RLS so we can query all subscribed users
function makeAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface Portfolio {
  user_email: string
  tickers: string[]
  email_frequency: 'daily' | 'weekly'
}

interface QuoteData {
  symbol: string
  price: number
  change: number
  changePct: number
}

export async function GET(req: Request) {
  // Protect cron endpoint
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isMonday = new Date().getDay() === 1

  const supabase = makeAdminClient()

  // Fetch all opted-in users with tickers
  const { data: portfolios, error } = await supabase
    .from('portfolios')
    .select('user_email, tickers, email_frequency')
    .eq('email_enabled', true)
    .not('user_email', 'is', null)
    .not('tickers', 'is', null)

  if (error || !portfolios?.length) {
    return Response.json({ sent: 0 })
  }

  let sent = 0

  for (const portfolio of portfolios as Portfolio[]) {
    const { user_email, tickers, email_frequency } = portfolio

    // Weekly subscribers only get email on Mondays
    if (email_frequency === 'weekly' && !isMonday) continue
    if (!tickers?.length || !user_email) continue

    // Fetch live quotes for all tickers
    const quotes = await Promise.all(
      tickers.map(async (symbol): Promise<QuoteData | null> => {
        try {
          const res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_TOKEN}`
          )
          const q = await res.json()
          if (!q.c) return null
          return { symbol, price: q.c, change: q.d ?? 0, changePct: q.dp ?? 0 }
        } catch {
          return null
        }
      })
    )

    const validQuotes = quotes.filter(Boolean) as QuoteData[]
    if (!validQuotes.length) continue

    const subject = email_frequency === 'weekly'
      ? `Your Weekly AlphaBrief — ${weekLabel()}`
      : `Your AlphaBrief — ${dayLabel()}`

    const html = buildEmailHtml(validQuotes, email_frequency)

    await resend.emails.send({
      from: 'AlphaBrief <briefs@alphabrief.io>',
      to: user_email,
      subject,
      html,
    })

    sent++
  }

  return Response.json({ sent })
}

function dayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function weekLabel() {
  return `Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function buildEmailHtml(quotes: QuoteData[], frequency: 'daily' | 'weekly'): string {
  const biggestMover = [...quotes].sort(
    (a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)
  )[0]

  const rows = quotes
    .sort((a, b) => b.changePct - a.changePct)
    .map(q => {
      const up = q.changePct >= 0
      const sign = up ? '+' : ''
      const color = up ? '#10b981' : '#ef4444'
      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 14px 0; font-weight: 700; font-size: 15px; color: #0f172a; font-family: 'SF Mono', monospace;">
            ${q.symbol}
          </td>
          <td style="padding: 14px 0; text-align: right; font-size: 15px; font-weight: 600; color: #0f172a;">
            $${q.price.toFixed(2)}
          </td>
          <td style="padding: 14px 0; text-align: right;">
            <span style="background: ${up ? '#d1fae5' : '#fee2e2'}; color: ${color}; padding: 3px 10px; border-radius: 99px; font-size: 13px; font-weight: 700;">
              ${sign}${q.changePct.toFixed(2)}%
            </span>
          </td>
        </tr>
      `
    }).join('')

  const moverLine = biggestMover
    ? `<p style="color: #64748b; font-size: 14px; margin: 0 0 28px;">
        Biggest mover: <strong style="color: #0f172a;">${biggestMover.symbol}</strong>
        ${biggestMover.changePct >= 0 ? '↑' : '↓'}
        <span style="color: ${biggestMover.changePct >= 0 ? '#10b981' : '#ef4444'};">
          ${biggestMover.changePct >= 0 ? '+' : ''}${biggestMover.changePct.toFixed(2)}%
        </span>
        today.
      </p>`
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; padding: 40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background: #0f172a; padding: 28px 32px;">
            <p style="margin: 0; font-size: 22px; font-weight: 300; color: #10b981; font-family: Georgia, serif; letter-spacing: -0.5px;">
              α <span style="color: #ffffff; font-weight: 600; font-size: 20px;">Alpha<span style="color: #10b981;">Brief</span></span>
            </p>
            <p style="margin: 6px 0 0; color: #64748b; font-size: 13px;">
              ${frequency === 'weekly' ? weekLabel() : dayLabel()}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding: 32px 32px 28px;">
            <h2 style="margin: 0 0 6px; font-size: 20px; font-weight: 700; color: #0f172a;">
              Your stocks ${frequency === 'weekly' ? 'this week' : 'today'}
            </h2>
            ${moverLine}

            <!-- Stock table -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <thead>
                <tr style="border-bottom: 2px solid #e2e8f0;">
                  <th style="padding: 0 0 10px; text-align: left; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">Ticker</th>
                  <th style="padding: 0 0 10px; text-align: right; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">Price</th>
                  <th style="padding: 0 0 10px; text-align: right; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">Day</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <!-- CTA -->
            <div style="margin-top: 28px; text-align: center;">
              <a href="https://alphabrief.io/app" style="display: inline-block; background: #10b981; color: #0f172a; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none;">
                View full cards →
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 20px 32px; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
              You're receiving this because you opted in at
              <a href="https://alphabrief.io/app/settings" style="color: #10b981; text-decoration: none;">alphabrief.io</a>.
              &nbsp;·&nbsp;
              <a href="https://alphabrief.io/app/settings" style="color: #94a3b8;">Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

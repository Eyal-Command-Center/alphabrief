import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function makeAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Thesis helpers ────────────────────────────────────────────────────────────

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

// ── Analyst rating helpers ────────────────────────────────────────────────────

function computeAnalystRating(
  rec: { buy: number; strongBuy: number; hold: number; sell: number; strongSell: number } | null
): 'Buy' | 'Hold' | 'Sell' | null {
  if (!rec) return null
  const totalBuy = rec.buy + rec.strongBuy
  const totalSell = rec.sell + rec.strongSell
  const total = totalBuy + rec.hold + totalSell
  if (!total) return null
  const buyPct = totalBuy / total
  if (buyPct >= 0.6) return 'Buy'
  if (buyPct >= 0.4) return 'Hold'
  return 'Sell'
}

function ratingColor(r: string) {
  if (r === 'Buy') return '#10b981'
  if (r === 'Sell') return '#ef4444'
  return '#f59e0b'
}

// ── News helpers ──────────────────────────────────────────────────────────────

interface NewsItem {
  headline: string
  url: string
  source: string
}

interface NewsAlert extends NewsItem {
  classification: 'CRITICAL'
}

async function classifyNews(
  headline: string,
  thesis: string,
  isProfitable: boolean
): Promise<'CRITICAL' | 'NOTABLE' | 'NOISE'> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5,
      messages: [{
        role: 'user',
        content: `You are evaluating whether a news headline is important enough to alert an investor who holds this stock.

Current thesis: ${thesis}
Pre-profit company: ${isProfitable ? 'No' : 'Yes'}

Headline: "${headline}"

Classify as exactly one of:
- CRITICAL: Direct material impact on the investment thesis — earnings result vs estimate, FDA/regulatory binary decision, acquisition announcement, major named contract win or loss, CEO or CFO departure, dilution event (secondary offering, ATM facility), named major partnership with revenue implications.
- NOTABLE: Relevant but not thesis-changing — analyst price target change, minor product update, general industry piece, conference presentation.
- NOISE: General market commentary, macro articles mentioning the company incidentally, duplicate coverage of an already-reported event, ETF flow articles.

For a pre-profit company: funding events, cash runway disclosures, and dilution events are CRITICAL even if small.
For a profitable company: macro regime changes that directly and materially affect this company's earnings are CRITICAL.

Return only one word: CRITICAL, NOTABLE, or NOISE.`,
      }],
    })
    const result = msg.content[0].type === 'text' ? msg.content[0].text.trim().toUpperCase() : 'NOISE'
    if (result === 'CRITICAL' || result === 'NOTABLE' || result === 'NOISE') return result as 'CRITICAL' | 'NOTABLE' | 'NOISE'
    return 'NOISE'
  } catch {
    return 'NOISE' // fail-safe: never alert on classification errors
  }
}

// ── Email builder ─────────────────────────────────────────────────────────────

interface AlertChange {
  kind: 'thesis' | 'analyst'
  prev: string
  next: string
  newThesis?: string
}

function buildAlertEmail(symbol: string, changes: AlertChange[], newsAlerts: NewsAlert[] = []): string {
  const hasThesis = changes.find(c => c.kind === 'thesis')
  const hasAnalyst = changes.find(c => c.kind === 'analyst')
  const hasOnlyNews = changes.length === 0 && newsAlerts.length > 0

  const subjectParts: string[] = []
  if (hasThesis) subjectParts.push(`thesis ${sentimentLabel(hasThesis.prev)} → ${sentimentLabel(hasThesis.next)}`)
  if (hasAnalyst) subjectParts.push(`analyst ${hasAnalyst.prev} → ${hasAnalyst.next}`)
  if (newsAlerts.length > 0) subjectParts.push(`${newsAlerts.length} news alert${newsAlerts.length > 1 ? 's' : ''}`)
  const subjectHint = hasOnlyNews ? 'important news' : subjectParts.join(' & ')

  const accentColor = hasThesis
    ? (hasThesis.next === 'negative' ? '#ef4444' : '#10b981')
    : hasAnalyst ? ratingColor(hasAnalyst.next)
    : '#f59e0b'

  const thesisSection = hasThesis ? `
    <h3 style="margin: 0 0 12px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Thesis</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
      <tr>
        <td style="width: 48%; background: #f8fafc; border-radius: 12px; padding: 14px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">Was</p>
          <p style="margin: 0; font-size: 20px;">${sentimentEmoji(hasThesis.prev)}</p>
          <p style="margin: 4px 0 0; font-size: 13px; font-weight: 600; color: #64748b;">${sentimentLabel(hasThesis.prev)}</p>
        </td>
        <td style="width: 4%; text-align: center; color: #94a3b8; font-size: 18px;">→</td>
        <td style="width: 48%; background: #f0fdf4; border: 1px solid ${accentColor}33; border-radius: 12px; padding: 14px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">Now</p>
          <p style="margin: 0; font-size: 20px;">${sentimentEmoji(hasThesis.next)}</p>
          <p style="margin: 4px 0 0; font-size: 13px; font-weight: 700; color: ${accentColor};">${sentimentLabel(hasThesis.next)}</p>
        </td>
      </tr>
    </table>
    ${hasThesis.newThesis ? `
    <div style="background: #f8fafc; border-left: 3px solid ${accentColor}; border-radius: 0 8px 8px 0; padding: 14px; margin-bottom: 20px;">
      <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">New thesis</p>
      <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">${hasThesis.newThesis}</p>
    </div>` : ''}
  ` : ''

  const analystSection = hasAnalyst ? `
    <h3 style="margin: ${hasThesis ? '4px' : '0'} 0 12px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Analyst consensus</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
      <tr>
        <td style="width: 48%; background: #f8fafc; border-radius: 12px; padding: 14px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">Was</p>
          <p style="margin: 4px 0 0; font-size: 16px; font-weight: 700; color: ${ratingColor(hasAnalyst.prev)};">${hasAnalyst.prev}</p>
        </td>
        <td style="width: 4%; text-align: center; color: #94a3b8; font-size: 18px;">→</td>
        <td style="width: 48%; background: #f0fdf4; border: 1px solid ${ratingColor(hasAnalyst.next)}33; border-radius: 12px; padding: 14px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">Now</p>
          <p style="margin: 4px 0 0; font-size: 16px; font-weight: 700; color: ${ratingColor(hasAnalyst.next)};">${hasAnalyst.next}</p>
        </td>
      </tr>
    </table>
  ` : ''

  const newsSection = newsAlerts.length > 0 ? `
    <h3 style="margin: ${changes.length > 0 ? '4px' : '0'} 0 12px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Important News</h3>
    <div style="margin-bottom: 20px;">
      ${newsAlerts.map(n => `
      <a href="${n.url}" style="display: block; text-decoration: none; background: #f8fafc; border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 12px 14px; margin-bottom: 8px;">
        <p style="margin: 0 0 4px; font-size: 14px; color: #334155; line-height: 1.5; font-weight: 500;">${n.headline}</p>
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">${n.source}</p>
      </a>`).join('')}
    </div>
  ` : ''

  const bodyIntro = hasOnlyNews
    ? `Important news about ${symbol} was detected. Here's what we flagged.`
    : `Something important changed on ${symbol}. Here's what we detected.`

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
            <p style="margin: 6px 0 0; color: #64748b; font-size: 13px;">Alert · ${symbol}</p>
          </td>
        </tr>

        <tr>
          <td style="padding: 32px;">
            <h2 style="margin: 0 0 6px; font-size: 22px; font-weight: 700; color: #0f172a;">
              ${symbol} ${subjectHint}
            </h2>
            <p style="margin: 0 0 24px; color: #64748b; font-size: 14px;">
              ${bodyIntro}
            </p>

            ${thesisSection}
            ${analystSection}
            ${newsSection}

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
              AlphaBrief Pro · Thesis, Analyst & News Alerts
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

// ── Cron handler ──────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = makeAdminClient()

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

    const watchlist: string[] = (tickers as string[]).slice(0, 10)

    for (const symbol of watchlist) {
      checked++
      try {
        const res = await fetch(`https://alphabrief.io/api/screener/detail?symbol=${symbol}`, {
          headers: { 'Cache-Control': 'no-store' },
        })
        if (!res.ok) continue
        const data = await res.json()

        const newThesis: string = data.thesis ?? ''
        const newSentiment = newThesis ? extractSentiment(newThesis) : null
        const newRating = computeAnalystRating(data.recommendation ?? null)
        const currentNews: NewsItem[] = Array.isArray(data.news) ? data.news : []
        const currentHeadlines = currentNews.map(n => n.headline)
        const isProfitable: boolean = data.isProfitable ?? true

        // Get stored snapshot
        const { data: snap } = await supabase
          .from('thesis_snapshots')
          .select('sentiment, thesis, analyst_rating, last_news_headlines')
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
            analyst_rating: newRating,
            last_news_headlines: currentHeadlines,
            checked_at: new Date().toISOString(),
          })
          continue
        }

        // ── Thesis / analyst change detection (unchanged) ──────────────────
        const changes: AlertChange[] = []

        if (newSentiment && snap.sentiment && snap.sentiment !== newSentiment) {
          changes.push({ kind: 'thesis', prev: snap.sentiment, next: newSentiment, newThesis })
        }

        if (newRating && snap.analyst_rating && snap.analyst_rating !== newRating) {
          changes.push({ kind: 'analyst', prev: snap.analyst_rating, next: newRating })
        }

        // ── News classification (new) ──────────────────────────────────────
        const knownHeadlines: string[] = Array.isArray(snap.last_news_headlines)
          ? snap.last_news_headlines
          : []
        const newNewsItems = currentNews
          .filter(n => !knownHeadlines.includes(n.headline))
          .slice(0, 3) // cap: 3 Haiku calls per ticker per run

        const newsAlerts: NewsAlert[] = []
        for (const item of newNewsItems) {
          const classification = await classifyNews(item.headline, newThesis, isProfitable)
          if (classification === 'CRITICAL') {
            newsAlerts.push({ ...item, classification })
          }
        }

        // ── Send if anything fired ─────────────────────────────────────────
        if (changes.length > 0 || newsAlerts.length > 0) {
          const subjectParts: string[] = []
          const t = changes.find(c => c.kind === 'thesis')
          const a = changes.find(c => c.kind === 'analyst')
          if (t) subjectParts.push(`thesis ${sentimentLabel(t.prev)} → ${sentimentLabel(t.next)}`)
          if (a) subjectParts.push(`analyst ${a.prev} → ${a.next}`)
          if (newsAlerts.length > 0) subjectParts.push(`${newsAlerts.length} news alert${newsAlerts.length > 1 ? 's' : ''}`)

          const icon = changes.length === 0 ? '⚡' : '⚠️'
          await resend.emails.send({
            from: 'AlphaBrief <briefs@alphabrief.io>',
            to: user_email,
            subject: `${icon} ${symbol} — ${subjectParts.join(' & ')}`,
            html: buildAlertEmail(symbol, changes, newsAlerts),
          })
          alerted++
        }

        // Always update snapshot (including latest headlines for dedup)
        await supabase.from('thesis_snapshots').upsert({
          user_id,
          symbol,
          sentiment: newSentiment,
          thesis: newThesis,
          analyst_rating: newRating,
          last_news_headlines: currentHeadlines,
          checked_at: new Date().toISOString(),
        }, { onConflict: 'user_id,symbol' })

      } catch {
        // Continue on error for any single stock
      }
    }
  }

  return Response.json({ checked, alerted })
}

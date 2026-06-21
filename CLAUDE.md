@AGENTS.md

# AlphaBrief — Project Context for Claude

## What This Is
AlphaBrief (alphabrief.io) is an AI-powered stock research tool. Users type a ticker, get an instant card: AI thesis, catalyst, analyst consensus, price, news, peers. Pro users get thesis-change email alerts.

**Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4, Supabase (auth + DB), Vercel (hosting + cron).

**Owner:** Eyal Gilad (geyalm@gmail.com)

---

## Git Workflow — CRITICAL
The sandbox **cannot push to GitHub**. Always:
1. Make and commit changes in bash
2. Tell Eyal the exact command to run in his terminal: `cd ~/Desktop/alphabrief && git push`
3. If git lock errors appear: `rm -f .git/HEAD.lock .git/index.lock` before committing

---

## External Services & API Keys (all in .env.local)

| Variable | Service | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Claude | Model: `claude-haiku-4-5-20251001` |
| `MASSIVE_API_KEY` | Massive.com (ex-Polygon.io) | Free plan — candles + snapshots only |
| `FINNHUB_API_KEY` | Finnhub | Stock data, earnings, news, peers |
| `RESEND_API_KEY` | Resend | Transactional email |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Client-side only |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Server-side only — never expose |
| `LEMONSQUEEZY_API_KEY` | Lemon Squeezy | Payments |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Lemon Squeezy | HMAC verification |
| `LEMONSQUEEZY_VARIANT_ID` | Lemon Squeezy | Pro plan variant ID: 1816532 |
| `CRON_SECRET` | Internal | Protects cron routes |

---

## Supabase Tables — EXACT NAMES
- `portfolios` — columns: `user_id`, `tickers` (text[]), `updated_at`
- `brief_feedback` — columns: `symbol`, `user_id` (nullable), `rating` ('up'|'down') ← **NOT `feedback`**
- `profiles` — columns: `id`, `is_pro`, `email_enabled`, `email_frequency`, `ls_customer_id`, `ls_subscription_id`
- `alert_tickers` — columns: `user_id`, `tickers` (text[])
- `thesis_history` — columns: `user_id`, `symbol`, `thesis`, `checked_at`

---

## API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/screener/detail` | GET | None | Main stock card data. Calls Finnhub (7 parallel) + Claude Haiku. 20-min server cache. |
| `/api/search` | GET | None | Ticker search/autocomplete via Finnhub |
| `/api/chart` | GET | None | 3M candles + EMA 200 from Massive. Fetches 2Y, trims to last 63 days. 1hr cache. |
| `/api/prices` | GET | None | Live price snapshot from Massive. Market hours only (Mon-Fri ~13:30-21:00 UTC). |
| `/api/feedback` | POST | Optional | Inserts into `brief_feedback`. Works for guests too. |
| `/api/brief` | POST | Required | Batch brief generation. Requires Supabase auth. |
| `/api/email-prefs` | GET/POST | Required | Read/write email preferences |
| `/api/alert-tickers` | GET/POST | Required | Read/write Pro alert watchlist |
| `/api/earnings` | GET | None | Earnings calendar |
| `/api/macro` | GET | None | Macro indicators |
| `/api/sectors/detail` | GET | None | Sector data |
| `/api/ipos` | GET | None | IPO pipeline |
| `/api/lemon/checkout` | POST | Required | Create Lemon Squeezy checkout |
| `/api/lemon/cancel` | POST | Required | Cancel subscription |
| `/api/lemon/webhook` | POST | None | Lemon Squeezy webhook. Uses `crypto.timingSafeEqual` for HMAC. |
| `/api/promo/redeem` | POST | Required | Redeem promo code. Max length 50. |
| `/api/cron/thesis-alerts` | GET | CRON_SECRET | Daily thesis check, sends email if thesis flipped |
| `/api/cron/email-report` | GET | CRON_SECRET | Weekly/daily email brief |
| `/api/waitlist` | POST | None | Waitlist signup |

---

## Key Architecture Decisions & Gotchas

### Stock Card Data (`/api/screener/detail`)
- Runs 7 Finnhub requests in parallel: profile2, quote, metrics, recommendations, news, earnings, peers
- Claude Haiku generates 5 fields: `about`, `quickTake`, `thesis`, `catalystEvent`, `catalystDriver`
- `about` replaces Finnhub's `profile.description` (which is often empty for major stocks)
- **isProfitable logic:** `(eps > 0) || (peValue > 0)` — P/E is more reliable than EPS for large caps like Amazon
- **Peers filter:** Only US tickers — `/^[A-Z]{1,5}$/.test(t) || /^[A-Z]{1,4}\.[A-Z]$/.test(t)` — blocks .TO, .AX etc.
- **Symbol sanitization:** `/^[A-Z0-9.\-]{1,10}$/` — applied everywhere
- Max 500 Claude tokens, returns JSON only (no markdown fences)

### Chart (`/api/chart`)
- Massive endpoint: `GET https://api.massive.com/v2/aggs/ticker/{symbol}/range/1/day/{from}/{to}`
- Fetches **2 years** of data so EMA 200 has enough warm-up points
- Displays only the **last 63 trading days** (3 months)
- EMA formula: `k = 2/(N+1)`, seeds with SMA of first N values

### Live Prices (`/api/prices`)
- Massive snapshot: `GET https://api.massive.com/v2/snapshot/locale/us/markets/stocks/tickers`
- Client polls every 10 seconds during market hours
- Market hours check: Mon-Fri, 13:30–21:00 UTC (covers EDT 9:30am–4pm ET)
- Shows pulsing green dot next to price + "Live" in nav when active

### Massive.com Notes
- Rebranded from Polygon.io (Oct 2025). Old `api.polygon.io` still works.
- WebSocket delayed: `wss://delayed.massive.com/stocks`
- Subscribe format: `{"action":"subscribe","params":"AM.AAPL,AM.MSFT"}`
- **Eyal is on free plan** — fundamentals API (cash flow, income statement) requires paid add-on. Don't use.

### Client-Side Caching
- Stock cards cached in `localStorage` with 20-min TTL: key `ab_stock_{SYMBOL}`
- Email prefs cached: `ab_email_prefs`
- Cache must be cleared manually in browser to test fresh data

### Auth
- Supabase SSR auth via `@supabase/ssr`
- Server routes use `createServerClient` from `@supabase/ssr` + `cookies()`
- Admin operations use `createClient` with `SUPABASE_SERVICE_ROLE_KEY` (never in client)
- Google OAuth authorized domain: `alphabrief.io`

### Lemon Squeezy Webhook
- Uses `crypto.timingSafeEqual` (timing-safe comparison) — not `===`
- Signature must be hex-compared with HMAC-SHA256 digest

---

## Pages

| Route | File | Notes |
|---|---|---|
| `/` | `src/app/page.tsx` + `LandingClient.tsx` | Landing page |
| `/app` | `src/app/app/page.tsx` | My Stocks (main app) |
| `/app/settings` | `src/app/app/settings/page.tsx` | Settings + Pro upgrade |
| `/app/calendar` | `src/app/app/calendar/page.tsx` | Earnings calendar |
| `/app/ipos` | `src/app/app/ipos/page.tsx` | IPO pipeline |
| `/app/sectors` | `src/app/app/sectors/page.tsx` | Sector view |
| `/privacy` | `src/app/privacy/page.tsx` | Privacy Policy (last updated June 2026) |
| `/terms` | `src/app/terms/page.tsx` | Terms of Service (last updated June 2026) |

The `/app` layout (`src/app/app/layout.tsx`) adds Privacy + Terms footer links to all app pages.

---

## UI Components & Patterns

### Stock Card Structure (top → bottom)
1. Header: logo, symbol, analyst badge, pre-profit badge, price + % change
2. About section (Claude-generated)
3. Metrics grid: Mkt Cap / P/E / 52W High / 52W Low
4. **"3M chart + EMA 200"** pill button → expands MiniChart SVG
5. Quick Take (Claude-generated)
6. Analyst ratings bar (emerald=buy, amber=hold, red=sell)
7. Thesis Check + Catalyst (2-col grid)
8. Recent News
9. Peers chips (link to `/app?t=PEER`)
10. Footer row: Share button (copy `/app?t=SYMBOL`) + Helpful? 👍👎

### Live Price
- Green pulsing dot appears next to price during market hours
- "🟢 Live" appears in nav when prices are streaming

### Tooltip Component
Wraps any label text. Shows definition on hover. Used on: Thesis Check, Catalyst.

---

## What Has Been Built (completed)
- Landing page with hero, product card preview, thesis alerts callout, footer
- My Stocks page: search, autocomplete, card generation, localStorage cache, save watchlist
- Try-before-register flow (?t=TICKER works without login)
- Stock cards with all 10 sections above
- Settings page: email prefs, Pro upgrade/cancel, promo codes, alert tickers
- Email report cron (weekly/daily brief via Resend)
- Thesis alerts cron (daily check, email on flip)
- Earnings calendar page
- IPO pipeline page
- Sectors page
- Security: auth gate on /api/brief, symbol sanitization, timing-safe webhook
- Privacy Policy + Terms of Service pages
- Share links (copy button on each card)
- Trend graph (3M + EMA 200, Massive REST)
- Live price polling (Massive snapshot, 10s interval)

## Pending / Future
- **My Stocks unregistered state redesign** — show free vs Pro value clearly
- **Thesis alerts placement** — consider showing on My Stocks page instead of just settings
- **Cash flow data** — Massive fundamentals API. Needs paid plan add-on ($29/mo). Future.
- **Mobile UI pass** — partially done, needs full review

---

## Knowledge Base — MANDATORY MAINTENANCE RULE

AlphaBrief has a living services reference document: `AlphaBrief-Services-Reference.docx`
It is generated by `scripts/build-services-doc.js` and auto-committed to the repo on every push via the GitHub Action in `.github/workflows/update-docs.yml`.

**Whenever you make any of the following changes, you MUST update `scripts/build-services-doc.js` and run `npm run docs` before committing:**

- Adding or removing an external service or API → update section 2
- Adding or removing an environment variable → update section 3 (envTable)
- Adding or removing an API route → update section 4
- Changing a model name, cron schedule, or billing plan → update the relevant section
- Any architecture change (new data flow, caching, auth change) → update section 5
- Any billing concern or free-tier limit change → update section 6

Run the doc generator:
```
node scripts/build-services-doc.js
# or
npm run docs
```

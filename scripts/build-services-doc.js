// AlphaBrief Services Reference — document generator
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, Header, Footer, PageNumber
} = require('./node_modules/docx');
const fs = require('fs');

const UPDATED = 'June 21, 2026';
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, font: 'Arial' })]
  });
}
function h2(text) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, font: 'Arial', color: '2C3E50' })]
  });
}
function p(text) {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, font: 'Arial', size: 20 })] });
}
function mixed(...runs) {
  return new Paragraph({
    spacing: { after: 120 },
    children: runs.map(r => typeof r === 'string' ? new TextRun({ text: r, font: 'Arial', size: 20 }) : new TextRun({ font: 'Arial', size: 20, ...r }))
  });
}
function bullet(text, opts = {}) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: 'Arial', size: 20, ...opts })]
  });
}
function gap() { return new Paragraph({ spacing: { after: 80 }, children: [new TextRun('')] }); }

function hCell(text, w, bg = '2C3E50') {
  return new TableCell({ borders: BORDERS, width: { size: w, type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', font: 'Arial', size: 18 })] })] });
}
function bCell(text, w, shade) {
  return new TableCell({ borders: BORDERS, width: { size: w, type: WidthType.DXA }, shading: { fill: shade ? 'F5F5F5' : 'FFFFFF', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 18 })] })] });
}
function mCell(text, w, shade) {
  return new TableCell({ borders: BORDERS, width: { size: w, type: WidthType.DXA }, shading: { fill: shade ? 'F5F5F5' : 'FFFFFF', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, font: 'Courier New', size: 18 })] })] });
}

function makeTable(cols, rows) {
  const widths = cols.map(c => c.w);
  const total = widths.reduce((a,b) => a+b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ children: cols.map(c => hCell(c.label, c.w)) }),
      ...rows.map((row, ri) => new TableRow({
        children: cols.map((c, ci) => c.mono ? mCell(row[ci], c.w, ri%2===0) : bCell(row[ci], c.w, ri%2===0))
      }))
    ]
  });
}

// Data
const overviewData = [
  ['Product', 'AlphaBrief — AI-powered stock research tool'],
  ['URL', 'alphabrief.io'],
  ['Owner', 'Eyal Gilad (geyalm@gmail.com)'],
  ['Document updated', UPDATED],
  ['Stack', 'Next.js App Router, React, TypeScript, Tailwind CSS v4'],
  ['Hosting', 'Vercel (hosting + cron jobs)'],
  ['Database / Auth', 'Supabase (PostgreSQL + Row-Level Security + SSR Auth)'],
  ['Repo', 'Private GitHub — push via: cd ~/Desktop/alphabrief && git push'],
];

const services = [
  ['Supabase', 'Authentication (SSR + Google OAuth) and PostgreSQL database hosting', 'Free tier', 'RLS enabled. Service role key NEVER exposed client-side. Google OAuth domain: alphabrief.io.'],
  ['Anthropic Claude', 'AI-generated stock analysis: about, quickTake, thesis, catalystEvent, catalystDriver', 'Pay-per-use API', 'Model: claude-haiku-4-5-20251001. Max 500 tokens per card. Returns JSON only (no markdown fences).'],
  ['Finnhub', 'Stock market data: company profile, quote, metrics, analyst recs, news, earnings, peers', 'Free tier', '7 parallel requests per card. US ticker filter applied. Symbol sanitized before every call.'],
  ['Massive.com (ex-Polygon.io)', 'Historical daily candles (chart) and live price snapshots', 'Free tier', 'api.polygon.io still resolves. Free plan: candles + snapshots only. Fundamentals require paid add-on ($29/mo) — NOT used.'],
  ['Lemon Squeezy', 'Subscription billing and payments for AlphaBrief Pro', 'Revenue-share (5%)', 'Pro variant ID: 1816532. Webhook via HMAC-SHA256 + crypto.timingSafeEqual. Handles checkout, cancel, subscription lifecycle.'],
  ['Resend', 'Transactional email: thesis-change alerts and daily/weekly brief emails', 'Free tier (100/day)', 'From: noreply@alphabrief.io. Used by /api/cron/thesis-alerts and /api/cron/email-report.'],
  ['Vercel', 'Next.js hosting, edge network, and cron job execution', 'Pro plan', 'Cron routes protected by CRON_SECRET. Deploy on push to main.'],
];

const envVars = [
  ['ANTHROPIC_API_KEY', 'Anthropic', 'Server-side only. Used in /api/screener/detail.'],
  ['MASSIVE_API_KEY', 'Massive.com', 'Server-side only. Used in /api/chart and /api/prices.'],
  ['FINNHUB_API_KEY', 'Finnhub', 'Server-side only. Used in /api/screener/detail, /api/search, /api/earnings, /api/ipos.'],
  ['RESEND_API_KEY', 'Resend', 'Server-side only. Used in /api/cron/ routes.'],
  ['NEXT_PUBLIC_SUPABASE_URL', 'Supabase', 'Public — safe in client bundle.'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase', 'Public — safe in client bundle. RLS enforces row access.'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'Supabase', 'NEVER expose client-side. Admin ops only in server routes.'],
  ['LEMONSQUEEZY_API_KEY', 'Lemon Squeezy', 'Server-side only. Used in /api/lemon/checkout and /api/lemon/cancel.'],
  ['LEMONSQUEEZY_WEBHOOK_SECRET', 'Lemon Squeezy', 'HMAC-SHA256 webhook signature verification.'],
  ['LEMONSQUEEZY_VARIANT_ID', 'Lemon Squeezy', 'Pro plan variant ID: 1816532.'],
  ['CRON_SECRET', 'Internal', 'Bearer token protecting cron routes from unauthorized execution.'],
];

const dbTables = [
  ['portfolios', 'user_id, tickers (text[]), updated_at', 'Saved watchlist tickers per user.', 'Updated on every watchlist save.'],
  ['brief_feedback', 'symbol, user_id (nullable), rating (up|down)', 'Thumbs feedback on stock cards.', "WARNING: named brief_feedback, NOT feedback. user_id nullable — guests can submit."],
  ['profiles', 'id, is_pro, email_enabled, email_frequency, ls_customer_id, ls_subscription_id', 'User profile and subscription status.', 'Populated by Lemon Squeezy webhook. is_pro gates Pro features. ls_* fields store LS IDs.'],
  ['alert_tickers', 'user_id, tickers (text[])', 'Tickers for Pro thesis-change email alerts.', 'Read by /api/cron/thesis-alerts daily.'],
  ['thesis_history', 'user_id, symbol, thesis, checked_at', 'Last thesis per user per ticker for change detection.', 'Cron compares new thesis to stored. Polarity flip triggers email alert.'],
];

const routes = [
  ['/api/screener/detail', 'GET', 'None', 'Main stock card. 7 Finnhub reqs parallel + Claude Haiku. 20-min server cache.'],
  ['/api/search', 'GET', 'None', 'Ticker search/autocomplete via Finnhub.'],
  ['/api/chart', 'GET', 'None', '3M candles + EMA 200 from Massive. Fetches 2Y, trims to last 63 days. 1hr cache.'],
  ['/api/prices', 'GET', 'None', 'Live price snapshot from Massive. Market hours only (Mon-Fri 13:30-21:00 UTC). no-store.'],
  ['/api/feedback', 'POST', 'Optional', 'Inserts into brief_feedback. Works for unauthenticated guests.'],
  ['/api/brief', 'POST', 'Required', 'Batch brief generation. Requires Supabase session.'],
  ['/api/email-prefs', 'GET/POST', 'Required', 'Read/write user email preferences (enabled, frequency).'],
  ['/api/alert-tickers', 'GET/POST', 'Required', 'Read/write Pro user thesis alert watchlist.'],
  ['/api/earnings', 'GET', 'None', 'Earnings calendar data from Finnhub.'],
  ['/api/macro', 'GET', 'None', 'Macro economic indicators.'],
  ['/api/sectors/detail', 'GET', 'None', 'Sector-level data and performance.'],
  ['/api/ipos', 'GET', 'None', 'IPO pipeline from Finnhub.'],
  ['/api/lemon/checkout', 'POST', 'Required', 'Creates Lemon Squeezy checkout session for Pro upgrade.'],
  ['/api/lemon/cancel', 'POST', 'Required', 'Cancels active Lemon Squeezy subscription.'],
  ['/api/lemon/webhook', 'POST', 'HMAC-SHA256', 'Lemon Squeezy lifecycle events. Updates profiles table. Timing-safe compare.'],
  ['/api/promo/redeem', 'POST', 'Required', 'Redeems promo code. Input max 50 chars.'],
  ['/api/cron/thesis-alerts', 'GET', 'CRON_SECRET', 'Daily: checks thesis for each alert ticker, emails user if polarity flipped.'],
  ['/api/cron/email-report', 'GET', 'CRON_SECRET', 'Daily/weekly: sends personalized portfolio email brief via Resend.'],
  ['/api/waitlist', 'POST', 'None', 'Captures waitlist signups. Stores in Supabase.'],
];

const arch = [
  ['Stock card pipeline', '7 Finnhub endpoints fetched in parallel per card: profile2, quote, metrics, recommendations, news, earnings, peers. Claude Haiku generates 5 AI fields. 20-min in-memory server cache.'],
  ['isProfitable logic', '(eps > 0) || (peValue > 0). P/E is more reliable than EPS for large caps like Amazon.'],
  ['Peers filter', 'US-listed only: /^[A-Z]{1,5}$/ or /^[A-Z]{1,4}\\.[A-Z]$/. Blocks .TO, .AX, .L etc.'],
  ['Symbol sanitization', 'Applied before every API call: /^[A-Z0-9.\\-]{1,10}$/. Rejects anything outside this pattern.'],
  ['Chart / EMA 200', 'Fetches 2Y candles (limit=750) for EMA warm-up. k = 2/(N+1). Seeds with SMA of first 200. Displays last 63 days (3M).'],
  ['Live prices', 'Massive snapshot polled every 10s during market hours. Check: Mon-Fri 13:30-21:00 UTC. Green pulsing dot + "Live" nav indicator.'],
  ['Client cache', 'localStorage key ab_stock_{SYMBOL} with 20-min TTL. Email prefs: ab_email_prefs. Clear manually to test fresh data.'],
  ['Auth pattern', 'SSR auth via @supabase/ssr. Server: createServerClient + cookies(). Admin: createClient with service role key. Never expose service role key client-side.'],
  ['Lemon Squeezy webhook', 'crypto.timingSafeEqual for HMAC-SHA256 (NOT ===). Hex comparison. Updates profiles on subscription events.'],
  ['Thesis alert cron', 'Daily: reads alert_tickers, generates fresh thesis, compares to thesis_history. Polarity flip (positive<>negative) triggers Resend email.'],
  ['Massive.com notes', 'Rebranded from Polygon.io Oct 2025. api.polygon.io still resolves. Free plan: candles + snapshots. Fundamentals need paid add-on.'],
  ['Git workflow', 'Sandbox cannot push to GitHub. Always tell Eyal: cd ~/Desktop/alphabrief && git push. Lock fix: rm -f .git/HEAD.lock .git/index.lock.'],
];

const pages = [
  ['/', 'src/app/page.tsx + LandingClient.tsx', 'Landing page. Hero, product card preview, thesis alerts callout, features, footer.'],
  ['/app', 'src/app/app/page.tsx', 'My Stocks. Search, autocomplete, card generation, localStorage cache, watchlist.'],
  ['/app/settings', 'src/app/app/settings/page.tsx', 'Settings: email prefs, Pro upgrade/cancel, promo codes, alert tickers.'],
  ['/app/calendar', 'src/app/app/calendar/page.tsx', 'Earnings calendar.'],
  ['/app/ipos', 'src/app/app/ipos/page.tsx', 'IPO pipeline.'],
  ['/app/sectors', 'src/app/app/sectors/page.tsx', 'Sector view.'],
  ['/privacy', 'src/app/privacy/page.tsx', 'Privacy Policy. Last updated June 2026.'],
  ['/terms', 'src/app/terms/page.tsx', 'Terms of Service. Last updated June 2026.'],
];

const built = [
  'Landing page: hero, product card preview, thesis alerts callout, features section, footer',
  'My Stocks page: search, autocomplete, stock card generation, localStorage cache (20-min TTL), watchlist save',
  'Try-before-register flow — ?t=TICKER works without login',
  'Full stock cards: About (AI), metrics, 3M chart + EMA 200, Quick Take, analyst bar, Thesis Check, Catalyst, News, Peers, Share + Feedback',
  'Settings page: email prefs, Pro upgrade/cancel, promo codes, alert tickers',
  'Email report cron (weekly/daily brief via Resend)',
  'Thesis alerts cron (daily polarity check, email on flip)',
  'Earnings calendar, IPO pipeline, Sectors pages',
  'Security: auth gate on /api/brief, symbol sanitization, timing-safe webhook HMAC',
  'Privacy Policy + Terms of Service (June 2026)',
  'Share links — copy /app?t=SYMBOL button on each card',
  'Trend graph — 3M + EMA 200, Massive REST, pill-style toggle button',
  'Live price polling — Massive snapshot, 10s interval, pulsing green dot + "Live" nav indicator',
];

const pending = [
  'My Stocks unregistered state redesign — show free vs Pro value clearly',
  'Thesis alerts placement — consider surfacing on My Stocks page, not just Settings',
  'Cash flow data — Massive fundamentals API, requires paid add-on ($29/mo). Deferred.',
  'Mobile UI pass — partially done, needs full review',
];

// Build document
const doc = new Document({
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
    }]
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 20 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, font: 'Arial', color: '1A1A2E' }, paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, font: 'Arial', color: '2C3E50' }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '27AE60', space: 1 } },
        spacing: { after: 120 },
        children: [
          new TextRun({ text: 'AlphaBrief — Services & Technical Reference', bold: true, font: 'Arial', size: 18, color: '2C3E50' }),
          new TextRun({ text: '  |  CONFIDENTIAL', font: 'Arial', size: 16, color: '999999' }),
        ]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC', space: 1 } },
        alignment: AlignmentType.RIGHT,
        spacing: { before: 80 },
        children: [
          new TextRun({ text: 'Updated ' + UPDATED + '  |  Page ', font: 'Arial', size: 16, color: '999999' }),
          new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '999999' }),
        ]
      })] })
    },
    children: [
      // Title
      new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: 'AlphaBrief', bold: true, font: 'Arial', size: 56, color: '1A1A2E' })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: 'Services & Technical Reference', font: 'Arial', size: 32, color: '27AE60' })] }),
      new Paragraph({ spacing: { after: 320 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '27AE60', space: 1 } }, children: [new TextRun({ text: 'Last updated: ' + UPDATED + '  |  CONFIDENTIAL — internal use only', font: 'Arial', size: 18, color: '888888' })] }),
      gap(),

      // 1. Overview
      h1('1. Project Overview'),
      makeTable([{ label: 'Field', w: 2200 }, { label: 'Value', w: 7160 }], overviewData),
      gap(),

      // 2. Services
      h1('2. External Services & Integrations'),
      p('All credentials stored in .env.local — never commit this file.'),
      gap(),
      makeTable([
        { label: 'Service', w: 1800 },
        { label: 'Purpose', w: 3400 },
        { label: 'Plan', w: 1200 },
        { label: 'Notes', w: 2960 },
      ], services),
      gap(),

      // 3. Env vars
      h1('3. Environment Variables (.env.local)'),
      p('Set in Vercel dashboard (Settings > Environment Variables) for production deployments.'),
      gap(),
      makeTable([
        { label: 'Variable', w: 3200, mono: true },
        { label: 'Service', w: 1800 },
        { label: 'Notes', w: 4360 },
      ], envVars),
      gap(),

      // 4. DB tables
      h1('4. Supabase Database Tables'),
      p('Row-Level Security (RLS) enabled on all tables. Service role key bypasses RLS — server-side only.'),
      gap(),
      makeTable([
        { label: 'Table', w: 1800, mono: true },
        { label: 'Columns', w: 2800, mono: true },
        { label: 'Purpose', w: 2400 },
        { label: 'Notes', w: 2360 },
      ], dbTables),
      gap(),

      // 5. API routes
      h1('5. API Routes'),
      p('All under src/app/api/. "Required" auth = valid Supabase session. CRON_SECRET = Authorization: Bearer header.'),
      gap(),
      makeTable([
        { label: 'Route', w: 2800, mono: true },
        { label: 'Method', w: 900 },
        { label: 'Auth', w: 1000 },
        { label: 'Purpose', w: 4660 },
      ], routes),
      gap(),

      // 6. Architecture
      h1('6. Architecture & Key Decisions'),
      p('Critical implementation details and gotchas that must be preserved across sessions:'),
      gap(),
      makeTable([
        { label: 'Topic', w: 2200 },
        { label: 'Detail', w: 7160 },
      ], arch),
      gap(),

      // 7. Pages
      h1('7. Pages & Routes'),
      makeTable([
        { label: 'Route', w: 1800, mono: true },
        { label: 'File', w: 3600, mono: true },
        { label: 'Notes', w: 3960 },
      ], pages),
      gap(),

      // 8. Feature status
      h1('8. Feature Status'),
      h2('Built & Shipped'),
      ...built.map(item => bullet(item)),
      gap(),
      h2('Pending / Future'),
      ...pending.map(item => bullet(item, { color: '888888' })),
      gap(),

      // 9. Maintenance
      h1('9. Document Maintenance'),
      p('Update this document in the same commit as any code change. No build script — direct maintenance only.'),
      bullet('New service or API key -> update Sections 2 + 3'),
      bullet('New or changed Supabase table -> update Section 4'),
      bullet('New or removed API route -> update Section 5'),
      bullet('Architecture change -> update Section 6'),
      bullet('New or removed page -> update Section 7'),
      bullet('Feature shipped or deferred -> update Section 8'),
      gap(),
      mixed({ text: 'File lives at repo root: ', bold: false }, { text: 'AlphaBrief-Services-Reference.docx', font: 'Courier New', bold: true }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('AlphaBrief-Services-Reference.docx', buf);
  console.log('Done: AlphaBrief-Services-Reference.docx (' + buf.length + ' bytes)');
}).catch(e => { console.error(e); process.exit(1); });

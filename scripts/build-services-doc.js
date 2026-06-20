/**
 * AlphaBrief — Services & Infrastructure Reference Doc Generator
 *
 * Run:  node scripts/build-services-doc.js
 * Or:   npm run docs
 *
 * Output: AlphaBrief-Services-Reference.docx (repo root)
 *
 * MAINTENANCE INSTRUCTIONS FOR CLAUDE:
 * ─────────────────────────────────────────────────────────────────────────────
 * This script is the source of truth for the services reference document.
 * Whenever you make any of the following changes to AlphaBrief, you MUST
 * update this script AND regenerate the doc (npm run docs):
 *
 *   • Adding a new external service or API → add a new h2() section in part 2
 *   • Adding a new environment variable → add a row to the envTable() in part 3
 *   • Adding a new API route → add a row to the table in part 4
 *   • Changing a model, cron schedule, or billing plan → update the relevant section
 *   • Any architecture change (new data flow, new caching layer, etc.) → update part 5
 *   • Any new billing / free-tier concern → add a row to the billing table in part 6
 *
 * The GitHub Action (.github/workflows/update-docs.yml) runs this script on
 * every push to main and commits the updated .docx back to the repo automatically.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Header, Footer
} = require('docx');
const fs = require('fs');
const path = require('path');

// ── colour palette ─────────────────────────────────────────────────────────────
const ACCENT  = '10B981';
const DARK    = '0F172A';
const MID     = '334155';
const LIGHT   = '94A3B8';
const BG_HEAD = 'E8F5EF';
const BG_WARN = 'FEF9C3';

// ── helpers ────────────────────────────────────────────────────────────────────
const border  = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 120 },
    children: [new TextRun({ text, font: 'Arial', size: 30, bold: true, color: DARK })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 100 },
    children: [new TextRun({ text, font: 'Arial', size: 26, bold: true, color: MID })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, font: 'Arial', size: 22, bold: true, color: ACCENT })],
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: 'Arial', size: 22, color: opts.color || DARK, bold: opts.bold || false })],
  });
}
function warn(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: '⚠️  ', font: 'Arial', size: 22 }),
      new TextRun({ text, font: 'Arial', size: 22, color: 'B45309', bold: true }),
    ],
  });
}
function bullet(text, sub = false) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: sub ? 900 : 540, hanging: 360 },
    children: [new TextRun({ text: (sub ? '◦  ' : '•  ') + text, font: 'Arial', size: 22, color: DARK })],
  });
}
function mono(text) {
  return new TextRun({ text, font: 'Courier New', size: 20, color: ACCENT });
}
function spacer() {
  return new Paragraph({ spacing: { before: 120, after: 120 }, children: [] });
}
function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0', space: 1 } },
    children: [],
  });
}

function makeTable(colWidths, headerCells, dataRows) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headerCells.map((h, i) =>
      new TableCell({
        borders,
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill: BG_HEAD, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: h, font: 'Arial', size: 20, bold: true, color: MID })] })],
      })
    ),
  });

  const rows = dataRows.map(({ cells, highlight, monoCol }) =>
    new TableRow({
      children: cells.map((cell, i) =>
        new TableCell({
          borders,
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: { fill: highlight ? BG_WARN : 'FFFFFF', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({
            children: [(monoCol !== undefined && i === monoCol)
              ? mono(cell)
              : new TextRun({ text: cell, font: 'Arial', size: 20, color: highlight ? 'B45309' : DARK })],
          })],
        })
      ),
    })
  );

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...rows],
  });
}

// ── auto-stamp last-modified from git ─────────────────────────────────────────
function getLastModified() {
  try {
    const { execSync } = require('child_process');
    const hash = execSync('git rev-parse --short HEAD').toString().trim();
    const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return `${date}  ·  commit ${hash}`;
  } catch {
    return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DOCUMENT CONTENT — update this section when infrastructure changes
// ══════════════════════════════════════════════════════════════════════════════
const lastModified = getLastModified();

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, font: 'Arial', color: DARK },
        paragraph: { spacing: { before: 400, after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: MID },
        paragraph: { spacing: { before: 300, after: 100 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: 'Arial', color: ACCENT },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0', space: 4 } },
          children: [
            new TextRun({ text: 'AlphaBrief — Services & Infrastructure Reference', font: 'Arial', size: 18, color: LIGHT }),
            new TextRun({ text: `\t${lastModified}`, font: 'Arial', size: 18, color: LIGHT }),
          ],
          tabStops: [{ type: 'right', position: 9360 }],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0', space: 4 } },
          children: [
            new TextRun({ text: 'Confidential — AlphaBrief internal reference  ·  Page ', font: 'Arial', size: 18, color: LIGHT }),
            new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: LIGHT }),
          ],
        })],
      }),
    },
    children: [

      // ── TITLE ────────────────────────────────────────────────────────────────
      new Paragraph({
        spacing: { before: 0, after: 80 },
        children: [
          new TextRun({ text: 'α ', font: 'Georgia', size: 60, color: ACCENT }),
          new TextRun({ text: 'Alpha', font: 'Arial', size: 60, bold: true, color: DARK }),
          new TextRun({ text: 'Brief', font: 'Arial', size: 60, bold: true, color: ACCENT }),
        ],
      }),
      new Paragraph({
        spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: 'Services & Infrastructure Reference', font: 'Arial', size: 36, color: MID })],
      }),
      new Paragraph({
        spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: `Auto-generated on push · ${lastModified}`, font: 'Arial', size: 20, color: LIGHT, italics: true })],
      }),
      divider(),

      // ── 1. PROJECT OVERVIEW ───────────────────────────────────────────────────
      h1('1. Project Overview'),
      body('AlphaBrief (alphabrief.io) is a Next.js 16 web app that gives retail investors instant AI-generated briefs on any stock ticker. Users can save a portfolio, view sector theses, track IPOs and earnings, and opt into daily or weekly email reports.'),
      spacer(),
      body('Tech stack:', { bold: true }),
      bullet('Framework: Next.js 16.2.9 (App Router), React 19.2.4, TypeScript'),
      bullet('Styling: Tailwind CSS v4'),
      bullet('AI: @anthropic-ai/sdk ^0.104.2'),
      bullet('Database / Auth: @supabase/supabase-js ^2.108.2'),
      bullet('Email: resend ^6.14.0'),
      spacer(),
      bullet('Deployed at: https://alphabrief.io'),
      bullet('Repo: Desktop/alphabrief — push to main triggers Vercel auto-deploy'),
      divider(),

      // ── 2. EXTERNAL SERVICES ─────────────────────────────────────────────────
      h1('2. External Services'),

      // 2.1 Vercel
      h2('2.1  Vercel'),
      body('Role: hosting, CI/CD, and cron scheduling.'),
      bullet('Free Hobby plan. Auto-deploys from GitHub main branch.'),
      bullet('Environment variables set in Vercel dashboard → Project Settings → Environment Variables.'),
      bullet('Cron job fires every weekday at 13:00 UTC (9 am ET) to trigger email reports.'),
      new Paragraph({
        spacing: { before: 80, after: 80 },
        indent: { left: 540 },
        children: [mono('vercel.json → path: /api/cron/email-report   schedule: "0 13 * * 1-5"')],
      }),
      bullet('Cron endpoint protected by CRON_SECRET — Vercel passes it as Authorization: Bearer header.'),
      spacer(),

      // 2.2 Supabase
      h2('2.2  Supabase'),
      body('Role: PostgreSQL database and auth provider (email/password + Google OAuth).'),
      bullet('Two clients: public anon key (browser, respects RLS) and service role key (server-only, bypasses RLS — used only in cron route).'),
      bullet('OAuth redirect URL: https://alphabrief.io/auth/callback'),
      spacer(),
      body('Database schema — portfolios table:', { bold: true }),
      makeTable(
        [2000, 2000, 2000, 3360],
        ['Column', 'Type', 'Default', 'Notes'],
        [
          { cells: ['user_id',        'uuid',    'auth.uid()',  'FK to auth.users — primary key'],         monoCol: 0 },
          { cells: ['tickers',        'text[]',  'NULL',        'Array of saved ticker symbols'],           monoCol: 0 },
          { cells: ['email_enabled',  'boolean', 'false',       'User opted in to email reports'],          monoCol: 0 },
          { cells: ['email_frequency','text',    "'weekly'",    "'daily' or 'weekly'"],                    monoCol: 0 },
          { cells: ['user_email',     'text',    'NULL',        'Cached from auth; used by cron to send'],  monoCol: 0 },
        ]
      ),
      spacer(),

      // 2.3 Finnhub
      h2('2.3  Finnhub'),
      body('Role: company-specific market data — quotes, news, earnings, IPO calendar, symbol search, company profiles.'),
      bullet('Free tier: 60 API calls/minute. No credit card required.'),
      bullet('Env var: FINNHUB_API_KEY  ·  Dashboard: finnhub.io'),
      spacer(),
      makeTable(
        [3600, 5760],
        ['Endpoint', 'Used For'],
        [
          { cells: ['/api/v1/quote',            'Live price & % change — briefs, sector cards, cron emails'],            monoCol: 0 },
          { cells: ['/api/v1/company-news',      'Last 7 days of news for a symbol — briefs and sector analysis'],       monoCol: 0 },
          { cells: ['/api/v1/calendar/earnings', 'Upcoming earnings dates + EPS estimates — briefs and calendar page'],   monoCol: 0 },
          { cells: ['/api/v1/calendar/ipo',      'Recent (past 30d) and upcoming (next 60d) IPOs — IPO page'],           monoCol: 0 },
          { cells: ['/api/v1/search',            'Ticker symbol autocomplete on landing and app pages'],                  monoCol: 0 },
          { cells: ['/api/v1/stock/profile2',    'Company sector and market cap — used to enrich IPO entries'],          monoCol: 0 },
        ]
      ),
      spacer(),

      // 2.4 Anthropic
      h2('2.4  Anthropic Claude API'),
      body('Role: AI engine — generates stock briefs and sector theses.'),
      bullet('Env var: ANTHROPIC_API_KEY  ·  SDK: @anthropic-ai/sdk ^0.104.2  ·  Pay-as-you-go pricing.'),
      spacer(),
      makeTable(
        [3000, 2500, 3860],
        ['Model', 'Route', 'Purpose'],
        [
          { cells: ['claude-sonnet-4-5',         '/api/brief',           'Full portfolio morning brief — price action, news, catalyst, thesis check. max_tokens: 2048'],          monoCol: 0 },
          { cells: ['claude-haiku-4-5-20251001', '/api/sectors/detail',  'Sector thesis JSON for all 7 sectors in one call. max_tokens: 2000. Cached 24h in-memory.'],           monoCol: 0 },
        ]
      ),
      spacer(),

      // 2.5 Resend
      h2('2.5  Resend'),
      body('Role: transactional email delivery for daily/weekly stock report emails.'),
      bullet('Free tier: 3,000 emails/month, 100/day.'),
      bullet('Env var: RESEND_API_KEY  ·  SDK: resend ^6.14.0  ·  Dashboard: resend.com'),
      bullet('From address: AlphaBrief <briefs@alphabrief.io>'),
      bullet('Domain alphabrief.io verified in Resend — DNS records set on Namecheap (see 2.7).'),
      bullet('Logic: daily subscribers get email every weekday; weekly subscribers on Mondays only (isMonday check in cron route).'),
      spacer(),

      // 2.6 Google Cloud
      h2('2.6  Google Cloud'),
      body('Role: OAuth 2.0 provider for "Continue with Google" sign-in via Supabase.'),
      warn('BILLING: Review Google Cloud billing before September 2026 — a payment or free trial expiry may be due. Check console.cloud.google.com → Billing.'),
      spacer(),
      bullet('OAuth credentials live in Google Cloud Console → APIs & Services → Credentials.'),
      bullet('Client ID + Client Secret pasted into Supabase Auth → Providers → Google. NOT stored as env vars in the app.'),
      bullet('Authorized redirect URI in Google Cloud: https://[supabase-ref].supabase.co/auth/v1/callback'),
      spacer(),

      // 2.7 Namecheap
      h2('2.7  Namecheap'),
      body('Role: domain registrar for alphabrief.io.'),
      bullet('DNS records for Resend email verification (DKIM, SPF, DMARC) added — check Resend dashboard for current record values.'),
      bullet('DNS for the app itself points to Vercel (configured via Vercel domain settings).'),
      bullet('Check Namecheap for domain renewal date and renew before expiry.'),
      spacer(),

      // 2.8 Massive
      h2('2.8  Massive (massive.com)'),
      body('Role: stock market API — real-time and historical tick data via REST and WebSockets.'),
      warn('Status: API key stored in .env.local AND Vercel. Not yet wired into any route — integration pending.'),
      spacer(),
      bullet('Dashboard + keys: https://massive.com/dashboard/keys'),
      bullet('Env var: MASSIVE_API_KEY (in .env.local and Vercel environment variables)'),
      bullet('Free tier: unlimited usage on free tier (per their homepage).'),
      bullet('Planned use cases: price charts (OHLCV history), real-time WebSocket price streaming, economy/macro data for sector views.'),
      bullet('Key differentiator vs Finnhub: WebSocket push (live price ticking in UI), richer historical candle data, macro/economy endpoints.'),
      spacer(),
      divider(),

      // ── 3. ENVIRONMENT VARIABLES ─────────────────────────────────────────────
      h1('3. Environment Variables'),
      body('Set in Vercel dashboard (Production + Preview). Copy to .env.local for local dev (gitignored).'),
      spacer(),
      makeTable(
        [2800, 2400, 4160],
        ['Variable', 'Required By', 'Notes'],
        [
          { cells: ['NEXT_PUBLIC_SUPABASE_URL',      'All Supabase client code',           'Public project URL. Safe to expose in browser.'],                                   monoCol: 0 },
          { cells: ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'All Supabase client code',           'Public anon key — respects RLS. Safe to expose.'],                                  monoCol: 0 },
          { cells: ['SUPABASE_SERVICE_ROLE_KEY',     '/api/cron/email-report',             'Admin key — bypasses RLS. Server-only. Never expose to browser.'],                  monoCol: 0 },
          { cells: ['FINNHUB_API_KEY',               'All market data API routes',         'Server-only (no NEXT_PUBLIC_ prefix).'],                                            monoCol: 0 },
          { cells: ['ANTHROPIC_API_KEY',             '/api/brief, /api/sectors/detail',    'Server-only.'],                                                                     monoCol: 0 },
          { cells: ['RESEND_API_KEY',                '/api/cron/email-report',             'Server-only.'],                                                                     monoCol: 0 },
          { cells: ['CRON_SECRET',                   '/api/cron/email-report',             'Shared secret — Vercel sends it, endpoint validates it.'],                          monoCol: 0 },
          { cells: ['MASSIVE_API_KEY',               'Not yet used in any route',           'In .env.local and Vercel. Ready to use — just wire it into a route.'],             monoCol: 0 },
        ]
      ),
      spacer(),
      divider(),

      // ── 4. INTERNAL API ROUTES ───────────────────────────────────────────────
      h1('4. Internal API Routes'),
      makeTable(
        [2400, 1200, 5760],
        ['Route', 'Method', 'What It Does'],
        [
          { cells: ['/api/brief',              'POST', 'Accepts { tickers[] }. Fetches Finnhub quote+news+earnings, calls Claude Sonnet, returns markdown brief.'],                 monoCol: 0 },
          { cells: ['/api/sectors/detail',     'GET',  'Returns thesis, drivers, catalyst, outlook for 7 sectors. Claude Haiku + Finnhub ETF data. Cache: 24h in-memory.'],        monoCol: 0 },
          { cells: ['/api/ipos',               'GET',  'Finnhub IPO calendar: past 30d (priced) + next 60d (upcoming). Enriched with quote + profile. Cache: 6h.'],                monoCol: 0 },
          { cells: ['/api/earnings',           'GET',  'Finnhub earnings calendar for a symbol between ?from and ?to date params.'],                                               monoCol: 0 },
          { cells: ['/api/search',             'GET',  'Ticker autocomplete via Finnhub search. Filters to Common Stock only. Max 6 results.'],                                    monoCol: 0 },
          { cells: ['/api/email-prefs',        'GET',  'Returns current user\'s email_enabled and email_frequency from Supabase.'],                                               monoCol: 0 },
          { cells: ['/api/email-prefs',        'POST', 'Saves { enabled, frequency } to Supabase portfolios table for authenticated user.'],                                       monoCol: 0 },
          { cells: ['/api/cron/email-report',  'GET',  'Protected by CRON_SECRET. Queries opted-in users, fetches Finnhub quotes, sends emails via Resend.'],                      monoCol: 0 },
        ]
      ),
      spacer(),
      divider(),

      // ── 5. ARCHITECTURE ──────────────────────────────────────────────────────
      h1('5. Architecture & Data Flows'),

      h3('5.1  Stock Brief'),
      body('User types ticker → /api/search autocomplete (Finnhub) → navigates to /app?t=TICKER → app POSTs to /api/brief → server fetches Finnhub (quote, news, earnings) → calls Claude Sonnet → returns markdown → rendered with react-markdown.'),

      h3('5.2  Sector Thesis'),
      body('User visits /app/sectors → GET /api/sectors/detail → server fetches all 7 ETF quotes + news from Finnhub in parallel → single prompt to Claude Haiku for JSON → result cached 24h in module-level variable → displayed as card carousel.'),

      h3('5.3  IPO Page'),
      body('User visits /app/ipos → GET /api/ipos → Finnhub IPO calendar (past 30d + next 60d) → enrich symbols with quote + company profile → cache 6h.'),

      h3('5.4  Email Reports'),
      body('Vercel cron fires at 13:00 UTC weekdays → /api/cron/email-report validates CRON_SECRET → queries Supabase for opted-in users → fetches Finnhub quotes for each user\'s tickers → builds HTML email → Resend delivers. Weekly subscribers skip non-Monday runs.'),

      h3('5.5  Auth'),
      body('Email/password handled by Supabase natively. Google OAuth: browser → Google → Supabase callback at /auth/v1/callback → app picks up session at /auth/callback/route.ts → redirects to /app.'),
      spacer(),
      divider(),

      // ── 6. BILLING & LIMITS ──────────────────────────────────────────────────
      h1('6. Billing & Limit Reminders'),
      makeTable(
        [1800, 1800, 2200, 3560],
        ['Service', 'Plan', 'Key Limit', 'Notes'],
        [
          { cells: ['Vercel',       'Hobby (free)',   'Cron: 1/day on free plan',    'Verify free plan supports M–F daily cron frequency'],                              highlight: false },
          { cells: ['Supabase',     'Free',           '500 MB DB, 50K MAU',           'Upgrade to Pro ($25/mo) as user base grows'],                                    highlight: false },
          { cells: ['Finnhub',      'Free',           '60 req/min',                   'Monitor for timeouts during spiky usage; Massive may supplement'],               highlight: false },
          { cells: ['Anthropic',    'Pay-as-you-go',  'Per-token cost',               'Haiku used for sectors to save cost vs Sonnet'],                                 highlight: false },
          { cells: ['Resend',       'Free',           '3,000/mo, 100/day',            'Upgrade if daily sender list exceeds 100 users'],                                highlight: false },
          { cells: ['Google Cloud', 'Check billing',  '—',                            '⚠️ REVIEW BEFORE SEPTEMBER 2026 — payment or trial expiry may be due'],          highlight: true },
          { cells: ['Namecheap',    'Annual renewal', 'Check renewal date',           'Renew alphabrief.io domain before expiry'],                                      highlight: false },
          { cells: ['Massive',      'Free tier',      'Unlimited (per homepage)',      'Key in .env.local and Vercel. Not yet used in code — integration pending.'],     highlight: false },
        ]
      ),
      spacer(),
      divider(),

      // ── 7. CONTEXT RECOVERY CHECKLIST ───────────────────────────────────────
      h1('7. Context Recovery Checklist'),
      body('Use this if rebuilding context after a session break:'),
      spacer(),
      bullet('App: https://alphabrief.io  ·  Repo: Desktop/alphabrief  ·  Deploy: push to main → Vercel auto-deploys'),
      bullet('DB: Supabase — portfolios is the only table; auth handled by Supabase Auth'),
      bullet('AI: /api/brief → Claude Sonnet  ·  /api/sectors/detail → Claude Haiku'),
      bullet('Email: Resend via Vercel cron — from briefs@alphabrief.io'),
      bullet('Google OAuth: credentials in Google Cloud Console, pasted into Supabase (not in .env)'),
      bullet('Domain DNS: Namecheap — Vercel + Resend records set'),
      bullet('Massive: stock data API (massive.com) — key in .env.local, NOT yet used in code'),
      warn('Google Cloud billing: check before September 2026'),
      spacer(),
      body('This doc is auto-generated by scripts/build-services-doc.js on every push to main.', { color: LIGHT }),
      body('To update: edit the script, then run npm run docs (or let the GitHub Action do it on next push).', { color: LIGHT }),

    ],
  }],
});

// ── output ─────────────────────────────────────────────────────────────────────
const outPath = path.join(__dirname, '..', 'AlphaBrief-Services-Reference.docx');
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log(`✓ Written: ${outPath}`);
});

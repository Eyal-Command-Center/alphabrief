# AlphaBrief — Master Project Plan
*Managed by Claude · Version 1.0 · June 2026*

---

## How This Project Is Managed

**Claude's role:** Project manager, technical architect, deployment owner, and growth advisor. I will give you step-by-step instructions for every action, tell you what to do next, flag blockers, and make decisions where possible.

**Your role:** Execute, decide on product direction, create content, and talk to users. You don't need to figure out what to do next — I'll tell you.

**Our rhythm:** After each milestone, we do a review session. You tell me what happened, I update the plan. Nothing moves forward without us syncing.

**Where everything lives:** This document. I'll update it as we go.

---

## Brand

- **Product name:** AlphaBrief
- **Tagline:** *Your daily market edge, in minutes.*
- **Voice:** Smart but human. Not Wall Street. Not Reddit. The knowledgeable friend who actually explains things.
- **Domain:** alphabrief.io ✅
- **GitHub:** https://github.com/Eyal-Command-Center/alphabrief ✅

---

## Phase 0: Foundation (Week 1)
*Before writing a single line of code, these need to exist.*

### Step 1 — Register the Domain ✅
Domain: **alphabrief.io** — registered.

### Step 2 — Set Up the X (Twitter) Account
Full instructions below in the **Build in Public** section.

### Step 3 — Set Up GitHub ✅
Repo: **https://github.com/Eyal-Command-Center/alphabrief**

### Step 4 — Get Your API Keys
- **Anthropic API** ✅ (already have it)
- **Polygon.io** → polygon.io (financial data — earnings dates, prices) ⬜
- **NewsAPI** → newsapi.org (news by ticker) ⬜

Save all keys somewhere safe (a private note or password manager). Never share them or put them in code.

---

## Build in Public — Full Step-by-Step Plan

### Why Build in Public?
Documenting your journey publicly builds an audience before you have a product. By the time you launch, people are already rooting for you. It's the highest ROI marketing for an indie builder with no budget.

---

### Account Setup

#### Personal Account (Primary)
Build in public works best from your personal account — people follow *founders*, not products. Use your real name.

**If you already have a Twitter/X account:**
1. Update your bio (instructions below)

**If you need a new account:**
1. Go to x.com → Sign Up
2. Use your real name: "Eyal Gilad"
3. Username: `@eyalgilad` or `@eyal_gilad` (keep it close to your real name)

**Update your profile:**
- **Name:** Eyal Gilad
- **Bio (copy this exactly):**
  > PM @MinuteMedia by day. Building @AlphaBrief — an AI investing tool for people who don't have a Bloomberg terminal. Building in public 🧵
- **Profile photo:** A real, clear photo of you. Not a logo.
- **Header image:** Can be a simple banner that says "Building AlphaBrief" — I'll design this for you when we're ready
- **Website:** Link to alphabrief.io once it's live (for now leave blank)
- **Location:** Your city

#### Product Account
1. Create a second account: `@AlphaBrief`
2. **Bio:**
   > Your daily market edge, in minutes. AI-powered investing research for serious retail investors. Built by @eyalgilad 🚧 Coming soon.
3. **Profile photo:** A simple logo — I'll generate one for you
4. Follow your personal account from this account

---

### The Follow List

Follow these accounts from **both** your personal and the AlphaBrief account. They are your community, your inspiration, and your audience seeders.

#### Finance / Investing (Your Core Audience Lives Here)
| Account | Why |
|---|---|
| @10kdiver | Teaches investing math simply — exact comp for your target user |
| @BrianFeroldi | "I explain stocks" — perfect audience overlap |
| @morganhousel | Most-followed finance writer, sets the tone for serious retail investors |
| @unusual_whales | Options/market data, huge retail following |
| @TKer | Sam Ro's newsletter community |
| @patrick_oshag | Investors podcast, thoughtful long-form investing |
| @EarningsWhispers | Earnings calendar resource — your direct comp, study them |
| @YahooFinance | Comp + industry news |
| @StockMoe | YouTube/retail investor, large following |

#### Build in Public / Indie Hackers (Your Builder Community)
| Account | Why |
|---|---|
| @levelsio | Pieter Levels — the godfather of build in public |
| @marc_louvion | Ships fast, documents everything, great model to follow |
| @csallen | Founder of Indie Hackers, great community signal |
| @swyx | AI + developer community, writes about building |
| @IndieHackers | The community account, tag them in milestone posts |
| @tibo_maker | Consistent builder, great engagement |

#### AI / Tech (Credibility Layer)
| Account | Why |
|---|---|
| @AnthropicAI | Your AI provider — they sometimes RT builders using Claude |
| @sama | Sam Altman — AI discourse |
| @benedictevans | Tech analyst, fintech-adjacent |
| @hndigest | Hacker News digest — HN is great for product launches |

---

### Content Strategy

#### The Rule: Document, Don't Promote
Don't tweet "AlphaBrief is great!" Tweet "Here's what I learned building AlphaBrief this week." People engage with process, not ads.

#### Posting Cadence
- **3x per week minimum** during building phase
- Mix: 70% build process / 30% investing insights (this builds credibility in the space)

#### Post Formats That Work
1. **The week-in-review thread** — "What I built this week:" followed by 5–8 tweets of progress, screenshots, and learnings
2. **The problem post** — "Most stock research tools are bad because [X]. Here's what I'm doing differently."
3. **The milestone screenshot** — first working feature with a screenshot. Always gets engagement.
4. **The learning post** — "I had no idea [X]. Now I do. Here's the thread." (great for AI/finance knowledge you gain)
5. **The question post** — "Retail investors: what's the one thing you check before buying a stock?" (market research + engagement)

---

### Your First 10 Posts (Pre-Written, Ready to Go)

Post these in order, roughly 2–3 per week. Edit to fit your voice.

**Post 1 — The Origin Story (Pin this)**
> I'm a PM at a media company. I started investing 6 months ago and immediately noticed: the tools are either $30K/year Bloomberg terminals or apps built for day traders.
>
> So I'm building AlphaBrief — an AI investing tool for people like me.
>
> Here's what I'm building and why 🧵

**Post 2 — The Problem**
> Every morning I have to check: earnings calendar (one site), news for my positions (another site), market macro (another), analyst ratings (another).
>
> It's 4 tabs before 9am. Half the info is noise.
>
> AlphaBrief is one place that tells you what actually matters today. Building it now.

**Post 3 — The First Screenshot**
> First working version of AlphaBrief's morning brief.
>
> Input: my 6 tickers. Output: what matters today for each of them, in plain English.
>
> Rough but it works. [screenshot]

**Post 4 — The Learning Post**
> I'm a PM, not a developer. Here's my tech stack for AlphaBrief and why I chose it:
>
> → Next.js (one codebase for front + back)
> → Claude API (the AI brain)
> → Polygon.io (financial data)
> → Supabase (database + auth)
> → Vercel (hosting)
>
> Total cost at launch: ~$0/month.

**Post 5 — Market Research**
> Question for investors on here:
>
> When you check your portfolio in the morning, what's the ONE thing you look for first?
>
> (Building something and want real answers)

**Post 6 — The Struggle Post**
> Spent 3 hours on something that took 10 minutes once I figured it out.
>
> That's building. Here's what tripped me up: [real thing you got stuck on]

**Post 7 — The Milestone**
> AlphaBrief milestone: earnings calendar is live.
>
> You add your tickers, it shows every upcoming earnings date with expected move, analyst consensus, and past beat/miss history.
>
> [screenshot] Getting closer.

**Post 8 — The Insight**
> Something I didn't expect while building a stock research tool:
>
> The hardest part isn't the data. It's deciding what NOT to show.
>
> Retail investors are already overwhelmed. Every feature I add is a decision to cut something else.

**Post 9 — Beta Invite**
> AlphaBrief beta is almost ready.
>
> Looking for 20 people who:
> - Manage their own portfolio
> - Check the market at least weekly
> - Want brutally honest feedback sessions
>
> DM me or drop your email below. No cost, just feedback.

**Post 10 — The Launch**
> AlphaBrief is live.
>
> → Morning brief for your portfolio
> → Earnings calendar
> → AI-powered news digest per ticker
> → Company screener
>
> Free to start. Built for the serious retail investor who doesn't have a Bloomberg terminal.
>
> Link: alphabrief.io

---

## Technical Roadmap

### M1: Core Loop (Target: End of Week 4)
A Next.js app that accepts a list of tickers and generates a morning brief using Claude API. Deployed on Vercel. No auth, no database — just the AI output working.

**Tasks I'll walk you through:**
1. Set up Next.js project locally
2. Connect Claude API
3. Connect Polygon.io for earnings/price data
4. Connect NewsAPI for ticker news
5. Build the prompt that generates the brief
6. Deploy to Vercel with your domain

### M2: Public Beta (Target: End of Week 8)
- User accounts (Supabase auth)
- Portfolio storage (save your tickers)
- Events calendar page
- Shareable morning brief link
- Landing page at alphabrief.io

### M3: Monetization (Target: End of Week 12)
- Stripe integration
- Free vs Pro tier enforcement
- Email digest (send the morning brief to your inbox)
- First Google Ads campaign

### M4: Growth (Month 4+)
- SEO content pages (one page per major ticker: "AAPL earnings history", etc.)
- Screener v2
- Brokerage read-only integration

---

## Decision Log
*I'll update this as we make key decisions.*

| Date | Decision | Rationale |
|---|---|---|
| Jun 2026 | Product name: AlphaBrief | Clear, premium, memorable |
| Jun 2026 | Primary target: serious casual investor | Better willingness to pay, clearer problem |
| Jun 2026 | Tech stack: Next.js + Claude API + Polygon + Supabase + Vercel | Beginner-friendly, low cost, proven stack |
| Jun 2026 | Business model: Freemium, $12-15/mo Pro | Standard SaaS, natural upgrade trigger |

---

## Current Status

**Active phase:** Phase 0 — Foundation  
**Completed:** Domain ✅ · GitHub ✅ · Anthropic API ✅ · X account (in progress) 🔄  
**Next action for Eyal:** Finish X account setup → then sign up for Polygon.io + NewsAPI → then we start coding M1  
**Blocked on:** Nothing.

# ⏸️ ALPHABRIEF IS PAUSED

**Paused on:** 2026-08-16
**Paused by:** Eyal
**Resume date:** none set — indefinite
**Commit that did it:** `f6d8b83` — *"feat: reversible PAUSED mode — zero crons, zero Anthropic spend"*

The site is **still live** at alphabrief.io. Auth works, pages render, the database is intact,
every API key and integration is still wired. What is switched off is everything that **runs by
itself** or **spends money**.

If you are a future session picking this repo up: read this file before touching anything.
Do not "fix" the empty AI sections or the missing crons — they are off on purpose.

---

## The two switches

Pausing took two independent changes. **Both must be reversed to resume.**

### 1. Crons deregistered — `vercel.json`

`vercel.json` was reduced to `{}`. It previously held three schedules:

| Path | Schedule | What it did |
|---|---|---|
| `/api/cron/email-report` | `0 13 * * 1-5` | Finnhub quotes → Resend digest email |
| `/api/cron/thesis-alerts` | `0 12 * * 1-5` | Anthropic Haiku classification → Resend alert email |
| `/api/cron/ping` | `0 17 * * *` | heartbeat test, no cost |

The **route files still exist and still work** — only the schedule is gone. Vercel registers zero
cron jobs. This is a file change, so resuming it requires a commit and a push.

### 2. `PAUSED` env var — the runtime guard

Set in the Vercel project (Production). Helper lives at `src/lib/paused.ts`:

```ts
export function isPaused(): boolean {
  const flag = process.env.PAUSED?.trim().toLowerCase()
  return flag === '1' || flag === 'true'
}
```

Truthy values are `1` or `true` (trimmed, case-insensitive). Unset or anything else = running normally.

Guarded routes — each returns **HTTP 200** with `paused: true` plus the minimal shape its caller
expects, so nothing 4xx/5xx-es or triggers a retry:

| Route | What it would otherwise spend |
|---|---|
| `src/app/api/brief/route.ts` | Anthropic **claude-sonnet-4-5** (max_tokens 2048) |
| `src/app/api/screener/detail/route.ts` | Anthropic haiku (650) + Finnhub |
| `src/app/api/sectors/detail/route.ts` | Anthropic haiku (2500) + Finnhub |
| `src/app/api/cron/thesis-alerts/route.ts` | Anthropic haiku + Finnhub + Resend |
| `src/app/api/cron/email-report/route.ts` | Finnhub + Resend |

Cron routes keep the `CRON_SECRET` check **first**, then no-op.

---

## Verified state at pause time (2026-08-16)

- `origin/main` = `f6d8b83`, working tree clean, nothing unpushed.
- Live check returns the paused payload:
  ```bash
  curl -sL "https://alphabrief.io/api/screener/detail?symbol=AAPL"
  # {"paused":true,"symbol":"AAPL",...,"quickTake":"","thesis":""}
  ```
- Cron endpoints return `401 Unauthorized` unauthenticated — secret check intact.
- Lemon Squeezy: the single (fake) subscriber was **cancelled** (not paused — cancel is the event
  the webhook actually handles, so `is_pro` flips to `false` correctly). The Pro product is set to
  **draft**, so no checkout link is live.

---

## HOW TO RESUME

Do these **in order**. Clearing the env var first lets you sanity-check the app before
automation starts firing at real users.

1. **Vercel → Settings → Environment Variables → delete `PAUSED`** (or set it to `0`). Redeploy.
2. **Verify** a card loads with real AI content:
   ```bash
   curl -sL "https://alphabrief.io/api/screener/detail?symbol=AAPL"
   ```
   `paused` should be gone and `thesis` should be populated.
3. **Restore the crons** — put the `crons` array back in `vercel.json`, commit, push:
   ```bash
   git revert f6d8b83 -- vercel.json
   ```
   or paste back the three entries from the table above.
4. **Confirm** Vercel → Cron Jobs lists three schedules again.
5. **Re-check Lemon Squeezy** — republish the Pro product/variant if you want to sell again.

### Resume gotcha — stale browser cache

`loadCard` writes each card to `localStorage` under `ab_stock_{SYMBOL}` with a **20-minute TTL**.
Anyone who loaded a card while paused keeps the blank version for up to 20 minutes after you
unpause, and a page refresh will **not** clear it. Resume outside market hours and it's a non-issue.

---

## What is deliberately NOT paused

These still run. None of them cost money today, but know they are live:

| Still live | Why it's fine / what to watch |
|---|---|
| `/api/prices`, `/api/chart` | Massive — free tier. Keeps the app looking alive. |
| `/api/lemon/cancel` | Ungated **on purpose** — a user must always be able to cancel. |
| `/api/lemon/checkout` | Ungated. Product is on **draft**, so no live checkout path. |
| `/api/waitlist` | ⚠️ **Ungated — still sends two Resend emails.** Dead code: added in `9f15af1` for the original waitlist landing page, orphaned when `004b4a6` redesigned that page and dropped the form. **Never fires on its own** — no cron, no internal caller, no form on the live site. Only an inbound POST triggers it, which means a bot, not a user. See open items. |
| Supabase Auth emails | Magic links / signup confirmations go through Supabase, **not** Resend — `PAUSED` does not touch them. Anyone logging in still gets mail. |

---

## Known cosmetic warts while paused

Left unfixed on purpose — they are cheap to live with and only visible while paused:

1. **P/E cell reads "Pre-profit"** — the metrics grid falls back to that literal string when `pe`
   is null. Mkt Cap / 52W High / 52W Low correctly read "N/A".
2. **Price header shows `$0.00 / +0.00%` outside market hours.** During market hours the
   `/api/prices` poller overrides it with a real price every 10s, so you get a real price and a
   real chart sitting next to empty AI sections.
3. Stock cards otherwise degrade cleanly — the frame, ticker, metrics and chart button all render;
   every AI section is conditionally rendered and simply disappears.

---

## Open items — NOT done at pause time

Carry these into whichever session resumes the project:

- [ ] **Delete `/api/waitlist`** (preferred over gating it) — dead code from the original waitlist
      landing page, orphaned by the `004b4a6` redesign. It stores nothing; it just sends two Resend
      emails to an unauthenticated, caller-controlled address. Deleting closes both the email path
      and the open-endpoint issue permanently. Pre-existing, not caused by the pause.
- [ ] **Add a `subscription_paused` / `subscription_unpaused` webhook handler.**
      `src/app/api/lemon/webhook/route.ts` handles only `subscription_created`,
      `subscription_cancelled`, `subscription_expired`. If a real customer is ever *paused* in
      Lemon Squeezy, billing stops but they stay `is_pro: true` in Supabase forever.
- [ ] **Services-doc compliance.** This repo's `CLAUDE.md` requires that a new env var or a
      cron-schedule change updates `scripts/build-services-doc.js` and regenerates
      `AlphaBrief-Services-Reference.docx` **in the same commit**. Commit `f6d8b83` knowingly
      skipped this. The services reference is therefore **stale** — it does not document `PAUSED`
      and still lists the three cron schedules as active.

---

## Cost surface while paused

Everything drops to **$0** except one thing:

- **The `alphabrief.io` domain renewal.** That bill survives the pause. Nothing else does.
- Anthropic, Resend, Finnhub, Massive — all free-tier or pay-per-use at zero usage.
- Vercel — Hobby.

**Supabase note:** free-tier projects auto-pause after a stretch with no activity. The weekday
crons used to keep the project awake; with them gone and little site traffic, expect it to idle
into a paused state. Data is intact and it is a one-click restore from the dashboard — the risk is
surprise, not loss. *[unverified — confirm the current threshold in Supabase's free-tier terms
rather than relying on this line.]*

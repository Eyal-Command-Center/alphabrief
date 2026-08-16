// Global pause switch.
//
// When the PAUSED env var is set, every route that spends money — Anthropic
// tokens, Finnhub quota, Resend sends — returns a 200 no-op instead of doing
// the work. Keys, tables, pages and integrations all stay wired.
//
// Unpause: unset PAUSED in the Vercel project env and redeploy. No code change.
export function isPaused(): boolean {
  const flag = process.env.PAUSED?.trim().toLowerCase()
  return flag === '1' || flag === 'true'
}

'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { AuthModal } from '@/components/AuthModal'
import { MobileNav } from '@/components/MobileNav'

interface StockDetail {
  symbol: string
  name: string
  sector: string
  description: string
  logo: string
  price: number
  change: number
  marketCap: number | null
  pe: number | null
  high52: number | null
  low52: number | null
  isProfitable: boolean
  recommendation: { buy: number; strongBuy: number; hold: number; sell: number; strongSell: number } | null
  peers: string[]
  news: { headline: string; url: string; source: string }[]
  quickTake: string
  thesis: string
  catalystEvent: string
  catalystDriver: string
  dataQuality?: 'strong' | 'moderate' | 'thin'
  recommendationDate?: string | null
}

interface CardState {
  symbol: string
  loading: boolean
  data: StockDetail | null
  error: boolean
  originalQuery?: string
}

function formatMarketCap(mc: number | null) {
  if (!mc) return 'N/A'
  if (mc >= 1000) return `$${(mc / 1000).toFixed(1)}T`
  return `$${mc.toFixed(0)}B`
}

function analystLabel(rec: StockDetail['recommendation']) {
  if (!rec) return null
  const totalBuy = rec.buy + rec.strongBuy
  const totalSell = rec.sell + rec.strongSell
  const total = totalBuy + rec.hold + totalSell
  if (!total) return null
  const buyPct = totalBuy / total
  if (buyPct >= 0.6) return { label: 'Buy', color: 'text-emerald-400 bg-emerald-500/20' }
  if (buyPct >= 0.4) return { label: 'Hold', color: 'text-amber-400 bg-amber-500/20' }
  return { label: 'Sell', color: 'text-red-400 bg-red-500/20' }
}

function thesisBadge(thesis: string) {
  if (thesis.includes('🟢')) return { label: 'Bullish', color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/25' }
  if (thesis.includes('🔴')) return { label: 'Bearish', color: 'text-red-400 bg-red-500/10 border border-red-500/25' }
  return null
}

// Split thesis into verdict + risk sentence for richer display
function splitThesis(thesis: string): { verdict: string; risk: string | null } {
  const idx = thesis.search(/ (Risk:|Watch for:)/)
  if (idx !== -1) {
    return { verdict: thesis.slice(0, idx).trim(), risk: thesis.slice(idx + 1).trim() }
  }
  return { verdict: thesis, risk: null }
}

// Inline tooltip — wraps any label text
function Tooltip({ tip, children }: { tip: string; children: React.ReactNode }) {
  return (
    <span className="relative group inline-flex items-center gap-1 cursor-default">
      {children}
      <span className="text-slate-700 text-[10px] group-hover:text-slate-500 transition-colors">?</span>
      <span className="absolute bottom-full left-0 mb-2 w-64 bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-300 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
        {tip}
      </span>
    </span>
  )
}

// Copy link button
function CopyLinkButton({ symbol }: { symbol: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    const url = `${window.location.origin}/app?t=${symbol}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-slate-600 hover:text-slate-300 transition-colors text-xs"
      title="Copy link to this stock"
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 7.5l3-3M7 3.5h1.5a1.5 1.5 0 010 3H7m-2 1H3.5a1.5 1.5 0 010-3H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          <span>Share</span>
        </>
      )}
    </button>
  )
}

// Feedback thumbs row
function FeedbackRow({ symbol }: { symbol: string }) {
  const [sent, setSent] = useState<'up' | 'down' | null>(null)
  async function send(rating: 'up' | 'down') {
    setSent(rating)
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, rating }),
    })
  }
  return (
    <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/5">
      <CopyLinkButton symbol={symbol} />
      {sent ? (
        <p className="text-slate-500 text-xs">Thanks for the feedback</p>
      ) : (
        <div className="flex items-center gap-1">
          <p className="text-slate-600 text-xs mr-2">Helpful?</p>
          <button onClick={() => send('up')} className="text-slate-500 hover:text-emerald-400 transition-colors text-sm" title="Helpful">👍</button>
          <button onClick={() => send('down')} className="text-slate-500 hover:text-red-400 transition-colors text-sm ml-1" title="Not helpful">👎</button>
        </div>
      )}
    </div>
  )
}

interface ChartCandle { t: number; c: number; ema200: number | null }

function MiniChart({ symbol }: { symbol: string }) {
  const [data, setData] = useState<ChartCandle[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/chart?symbol=${symbol}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.candles) setData(d.candles)
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [symbol])

  if (loading) {
    return (
      <div className="h-36 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }
  if (error || !data || data.length === 0) {
    return (
      <div className="h-36 flex items-center justify-center">
        <p className="text-slate-600 text-xs">Chart data unavailable</p>
      </div>
    )
  }

  const W = 600
  const H = 120
  const pad = { top: 8, bottom: 8, left: 4, right: 4 }
  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom

  const prices = data.map((d) => d.c)
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const rangeP = maxP - minP || 1

  const xOf = (i: number) => pad.left + (i / (data.length - 1)) * innerW
  const yOf = (p: number) => pad.top + innerH - ((p - minP) / rangeP) * innerH

  // Price line path
  const pricePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(d.c).toFixed(1)}`)
    .join(' ')

  // EMA 200 path — only where non-null
  let emaPath = ''
  let emaStarted = false
  for (let i = 0; i < data.length; i++) {
    const e = data[i].ema200
    if (e == null) continue
    if (!emaStarted) {
      emaPath += `M${xOf(i).toFixed(1)},${yOf(e).toFixed(1)}`
      emaStarted = true
    } else {
      emaPath += ` L${xOf(i).toFixed(1)},${yOf(e).toFixed(1)}`
    }
  }

  // Fill area under price line
  const fillPath = `${pricePath} L${xOf(data.length - 1).toFixed(1)},${H} L${xOf(0).toFixed(1)},${H} Z`

  const lastPrice = data[data.length - 1].c
  const firstPrice = data[0].c
  const isUp = lastPrice >= firstPrice
  const priceColor = isUp ? '#10b981' : '#ef4444'

  // Current price position for dot
  const dotX = xOf(data.length - 1)
  const dotY = yOf(lastPrice)

  // Last EMA value
  const lastEma = data.findLast((d) => d.ema200 != null)?.ema200

  return (
    <div className="mt-3 mb-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 140 }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`fill-${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={priceColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={priceColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Fill */}
        <path d={fillPath} fill={`url(#fill-${symbol})`} />

        {/* Price line */}
        <path d={pricePath} fill="none" stroke={priceColor} strokeWidth="1.5" strokeLinejoin="round" />

        {/* EMA 200 line */}
        {emaPath && (
          <path d={emaPath} fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" strokeLinejoin="round" />
        )}

        {/* End dot */}
        <circle cx={dotX} cy={dotY} r="3" fill={priceColor} />
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-between mt-1.5 px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded" style={{ backgroundColor: priceColor }} />
            <span className="text-slate-600 text-[10px]">Price</span>
          </div>
          {lastEma != null && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0" style={{ borderTop: '1px dashed #f59e0b' }} />
              <span className="text-slate-600 text-[10px]">EMA 200 ${lastEma.toFixed(0)}</span>
            </div>
          )}
        </div>
        <span className="text-slate-600 text-[10px]">3M</span>
      </div>
    </div>
  )
}

function ExampleCard() {
  return (
    <div className="mb-6 bg-slate-900 border border-white/8 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold text-lg">NVDA</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-500/20">Bullish</span>
              </div>
              <p className="text-slate-400 text-xs">NVIDIA Corporation</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-white font-bold text-xl">$138.07</p>
            <p className="text-emerald-400 text-sm font-medium">+2.4% today</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1.5">AI Thesis</p>
          <p className="text-slate-300 text-sm leading-relaxed">Data-center demand keeps outrunning supply; the Blackwell ramp is the swing factor for FY26 margins.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">Next Catalyst</p>
            <p className="text-white text-sm font-semibold">Q3 Earnings</p>
            <p className="text-slate-500 text-xs mt-0.5">Nov 20 · in 12 days</p>
          </div>
          <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">Analyst Consensus</p>
            <p className="text-white text-sm font-semibold">Strong Buy</p>
            <p className="text-slate-500 text-xs mt-0.5">$165 avg target · +19%</p>
          </div>
        </div>

        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">Moving the Stock</p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2 text-sm text-slate-300">
              <span className="text-emerald-500 shrink-0 mt-1 text-[8px]">●</span>
              Blackwell production on track, CFO says
            </li>
            <li className="flex items-start gap-2 text-sm text-slate-400">
              <span className="text-slate-600 shrink-0 mt-1 text-[8px]">●</span>
              Hyperscalers lift 2026 capex guidance
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 px-5 py-2.5">
        <span className="text-[10px] text-slate-600 uppercase tracking-widest">Example — search any ticker above to see a live brief</span>
      </div>
    </div>
  )
}

function StockCard({ card, livePrice }: { card: CardState; livePrice?: { price: number; change: number } }) {
  if (card.loading) {
    return (
      <div className="bg-slate-900 border border-white/8 rounded-2xl p-6 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin shrink-0" />
        <span className="text-slate-400 text-sm">Fetching {card.symbol}...</span>
      </div>
    )
  }

  if (card.error || !card.data) {
    const query = card.originalQuery && card.originalQuery !== card.symbol ? card.originalQuery : null
    return (
      <div className="bg-slate-900 border border-white/8 rounded-2xl p-5">
        <p className="text-white font-semibold text-sm mb-1">
          No results for &ldquo;{query ?? card.symbol}&rdquo;
        </p>
        <p className="text-slate-500 text-sm">
          {query
            ? <>Searched for <span className="text-slate-300">{card.symbol}</span> but couldn&apos;t get data. Try the exact ticker — e.g. <span className="text-emerald-400">GOOGL</span> instead of &ldquo;Google&rdquo;.</>
            : <>Double-check the ticker symbol — e.g. <span className="text-emerald-400">AAPL</span>, <span className="text-emerald-400">NVDA</span>, <span className="text-emerald-400">TSLA</span>. Or type the company name and pick from the suggestions that appear.</>
          }
        </p>
      </div>
    )
  }

  const d = card.data
  const analyst = analystLabel(d.recommendation)
  const thesis = thesisBadge(d.thesis ?? '')
  const [showChart, setShowChart] = useState(false)
  // Live price overrides card data when market is open
  const displayPrice = livePrice?.price ?? d.price
  const displayChange = livePrice?.change ?? d.change

  return (
    <div className="bg-slate-900 border border-white/8 rounded-2xl p-5 md:p-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {d.logo ? (
            <img src={d.logo} alt={d.symbol} className="w-10 h-10 rounded-xl bg-white object-contain p-1 shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">{d.symbol[0]}</span>
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-emerald-400 font-bold text-xl tracking-tight">{d.symbol}</span>
              {analyst && (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${analyst.color}`}>
                  {analyst.label}
                </span>
              )}
              {thesis && (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${thesis.color}`}>
                  {thesis.label}
                </span>
              )}
              {!d.isProfitable && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-amber-400 bg-amber-500/10 border border-amber-500/20">
                  Pre-profit
                </span>
              )}
              {d.dataQuality === 'thin' && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-slate-400 bg-slate-700/60 border border-white/10" title="Limited revenue and analyst data — AI output may be less precise">
                  Limited data
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm truncate">{d.name}</p>
            {d.sector && <p className="text-slate-600 text-xs mt-0.5 truncate">{d.sector}</p>}
          </div>
        </div>
        <div className="text-right shrink-0 ml-3">
          <p className="text-white font-bold text-xl md:text-2xl">
            ${displayPrice?.toFixed(2)}
            {livePrice && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse align-middle" />}
          </p>
          <p className={`text-sm font-medium ${displayChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {displayChange >= 0 ? '+' : ''}{displayChange?.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Company description */}
      {d.description && (
        <div className="mb-4">
          <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest mb-1.5">About</p>
          <p className="text-slate-500 text-xs leading-relaxed line-clamp-3">{d.description}</p>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Mkt Cap', value: formatMarketCap(d.marketCap) },
          { label: 'P/E', value: d.pe && d.pe > 0 ? d.pe.toFixed(1) : 'Pre-profit' },
          { label: '52W High', value: d.high52 ? `$${d.high52}` : 'N/A' },
          { label: '52W Low', value: d.low52 ? `$${d.low52}` : 'N/A' },
        ].map((m) => (
          <div key={m.label} className="bg-slate-800/60 border border-white/5 rounded-xl px-3 py-2.5">
            <p className="text-slate-500 text-xs mb-1">{m.label}</p>
            <p className="text-white text-xs font-semibold">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Chart toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowChart((v) => !v)}
          className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
            showChart
              ? 'bg-slate-700/60 border-white/10 text-white'
              : 'bg-slate-800/60 border-white/15 text-slate-200 hover:text-white hover:border-white/25 hover:bg-slate-700/50'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1 10l3.5-3.5 2.5 2.5 3-4.5 2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {showChart ? 'Hide chart' : '3M chart + EMA 200'}
        </button>
        {showChart && <MiniChart symbol={d.symbol} />}
      </div>

      {/* Quick Take */}
      {d.quickTake && (
        <div className="bg-slate-800/40 border border-white/5 rounded-xl p-4 mb-3">
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-1.5">Quick Take</p>
          <p className="text-slate-300 text-sm leading-relaxed">{d.quickTake}</p>
        </div>
      )}

      {/* Analyst recommendations bar */}
      {d.recommendation && (() => {
        const { buy = 0, strongBuy = 0, hold = 0, sell = 0, strongSell = 0 } = d.recommendation
        const totalBuy = buy + strongBuy
        const totalSell = sell + strongSell
        const total = totalBuy + hold + totalSell
        if (!total) return null
        return (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest">Analyst Ratings</p>
              {d.recommendationDate && (() => {
                const days = Math.round((Date.now() - new Date(d.recommendationDate!).getTime()) / (1000 * 60 * 60 * 24))
                const label = new Date(d.recommendationDate!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                return <span className={`text-xs ${days > 90 ? 'text-amber-400/70' : 'text-slate-600'}`}>· updated {label}</span>
              })()}
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden gap-px mb-1.5">
              {totalBuy > 0 && <div style={{ width: `${(totalBuy / total) * 100}%` }} className="bg-emerald-500" />}
              {hold > 0 && <div style={{ width: `${(hold / total) * 100}%` }} className="bg-amber-400" />}
              {totalSell > 0 && <div style={{ width: `${(totalSell / total) * 100}%` }} className="bg-red-500" />}
            </div>
            <div className="flex gap-4">
              <span className="text-xs text-emerald-400">{totalBuy} Buy</span>
              <span className="text-xs text-amber-400">{hold} Hold</span>
              <span className="text-xs text-red-400">{totalSell} Sell</span>
            </div>
          </div>
        )
      })()}

      {/* Thesis + Catalyst */}
      {(d.thesis || d.catalystEvent || d.catalystDriver) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          {d.thesis && (
            <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3.5">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1.5">
                <Tooltip tip="The fundamental investment case — is the core reason to own this stock getting stronger, weaker, or unchanged? Starts with 🟢 Positive, 🔴 Negative, or 🟡 Mixed.">
                  Thesis Check
                </Tooltip>
              </p>
              {(() => {
                const { verdict, risk } = splitThesis(d.thesis)
                return (
                  <>
                    <p className="text-slate-300 text-sm leading-relaxed">{verdict}</p>
                    {risk && (
                      <p className="text-slate-400 text-sm leading-relaxed mt-2 pt-2 border-t border-white/5">{risk}</p>
                    )}
                  </>
                )
              })()}
            </div>
          )}
          {(d.catalystEvent || d.catalystDriver) && (
            <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3.5">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2.5">
                <Tooltip tip="An event, disclosure, or development that triggers a significant shift in a stock's price or valuation — the spark that turns potential into momentum.">
                  Catalyst
                </Tooltip>
              </p>
              {d.catalystDriver && (
                <div className="mb-2">
                  <p className="text-slate-600 text-[10px] uppercase tracking-widest mb-1">Key driver</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{d.catalystDriver}</p>
                </div>
              )}
              {d.catalystEvent && (
                <div className={d.catalystDriver ? 'border-t border-white/5 pt-2 mt-2' : ''}>
                  <p className="text-slate-600 text-[10px] uppercase tracking-widest mb-1">Next event</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{d.catalystEvent}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* News */}
      {d.news.length > 0 && (
        <div className="border-t border-white/5 pt-4 mb-4">
          <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest mb-3">Recent News</p>
          <div className="space-y-2.5">
            {d.news.map((n, i) => (
              <a
                key={i}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-slate-400 hover:text-slate-200 transition-colors group"
              >
                <span className="text-emerald-600 mt-0.5 shrink-0 group-hover:text-emerald-400 transition-colors">▸</span>
                <span className="text-sm leading-snug">
                  {n.headline}
                  <span className="text-slate-600 text-xs ml-2">{n.source}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Similar companies */}
      {d.peers && d.peers.length > 0 && (
        <div className="border-t border-white/5 pt-3 mb-3">
          <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest mb-2">In the same sector</p>
          <div className="flex flex-wrap gap-1.5">
            {d.peers.map((peer) => (
              <a
                key={peer}
                href={`/app?t=${peer}`}
                className="px-2.5 py-1 bg-slate-800 border border-white/8 rounded-lg text-xs text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors font-medium"
              >
                {peer}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Feedback */}
      <FeedbackRow symbol={d.symbol} />
    </div>
  )
}

export default function MyStocksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-800 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    }>
      <MyStocksContent />
    </Suspense>
  )
}

function MyStocksContent() {
  const [tickers, setTickers] = useState('')
  const [cards, setCards] = useState<CardState[]>([])

  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authSuccess, setAuthSuccess] = useState('')
  const [showAuthForm, setShowAuthForm] = useState(false)

  const [savedTickers, setSavedTickers] = useState<string[]>([])
  const [tickerNames, setTickerNames] = useState<Record<string, string>>({})
  const [hasGenerated, setHasGenerated] = useState(false)
  const [hasEverSearched, setHasEverSearched] = useState(false)

  const [emailEnabled, setEmailEnabled] = useState(false)
  const [isPro, setIsPro] = useState(false)

  // Live price state — updated every 10s during market hours
  const [livePrices, setLivePrices] = useState<Record<string, { price: number; change: number }>>({})
  const [marketOpen, setMarketOpen] = useState(false)
  const livePollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [suggestions, setSuggestions] = useState<{ symbol: string; name: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const supabase = createClient()
  const searchParams = useSearchParams()
  const tParam = searchParams.get('t')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    // Load email + pro status from cache first, then API
    try {
      const cached = localStorage.getItem('ab_email_prefs')
      if (cached) {
        const { enabled, is_pro } = JSON.parse(cached)
        setEmailEnabled(enabled ?? false)
        setIsPro(is_pro ?? false)
      }
    } catch {}
    fetch('/api/email-prefs').then(r => r.json()).then(data => {
      setEmailEnabled(data.enabled ?? false)
      setIsPro(data.is_pro ?? false)
    })
  }, [user])

  useEffect(() => {
    if (!user) return
    supabase
      .from('portfolios')
      .select('tickers')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.tickers?.length) {
          setSavedTickers(data.tickers)
        }
      })
  }, [user])

  // Reactive to ?t= param — re-runs on every client-side navigation to /app?t=X
  useEffect(() => {
    if (!tParam) return
    const symbol = tParam.toUpperCase()
    setTickers(symbol)
    setHasGenerated(true)
    setSavedTickers(prev => Array.from(new Set([...prev, symbol])))

    // Show cached data instantly if available, otherwise show loader
    const cached = getCachedStock(symbol)
    if (cached) {
      setCards([{ symbol, loading: false, data: cached, error: false }])
      return
    }

    setCards([{ symbol, loading: true, data: null, error: false }])
    fetch(`/api/screener/detail?symbol=${symbol}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setCachedStock(symbol, data)
        setCards([{ symbol, loading: false, data, error: !data }])
      })
  }, [tParam])

  // Save tickers that came in via ?t= URL param once user is known
  useEffect(() => {
    if (!user || !tParam) return
    const symbol = tParam.toUpperCase()
    supabase.from('portfolios').select('tickers').eq('user_id', user.id).single()
      .then(({ data }) => {
        const existing: string[] = data?.tickers ?? []
        const merged = Array.from(new Set([...existing, symbol]))
        setSavedTickers(merged)
        persistTickers(merged)
      })
  }, [user, tParam])

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Live price polling — runs every 10s when cards are loaded
  const pollPrices = useCallback(async (symbols: string[]) => {
    if (!symbols.length) return
    try {
      const res = await fetch(`/api/prices?symbols=${symbols.join(',')}`)
      const data = await res.json()
      setMarketOpen(data.marketOpen ?? false)
      if (data.prices && Object.keys(data.prices).length > 0) {
        setLivePrices((prev) => ({ ...prev, ...data.prices }))
      }
    } catch {
      // Silent fail — stale prices are fine
    }
  }, [])

  useEffect(() => {
    const loadedSymbols = cards.filter(c => !c.loading && c.data).map(c => c.symbol)
    if (!loadedSymbols.length) return

    // Initial fetch
    pollPrices(loadedSymbols)

    // Poll every 10 seconds
    if (livePollRef.current) clearInterval(livePollRef.current)
    livePollRef.current = setInterval(() => pollPrices(loadedSymbols), 10_000)

    return () => {
      if (livePollRef.current) clearInterval(livePollRef.current)
    }
  }, [cards, pollPrices])

  function handleTickerInput(value: string) {
    setTickers(value)
    // Get the last ticker being typed (after last comma)
    const parts = value.split(',')
    const lastPart = parts[parts.length - 1].trim()
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (lastPart.length < 1) { setSuggestions([]); setShowSuggestions(false); return }
    searchDebounce.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(lastPart)}`)
      const data = await res.json()
      setSuggestions(data.results ?? [])
      setShowSuggestions(data.results?.length > 0)
    }, 300)
  }

  function selectSuggestion(symbol: string, name: string) {
    // Replace the last partial ticker with the selected symbol
    const parts = tickers.split(',')
    parts[parts.length - 1] = ' ' + symbol
    setTickers(parts.join(',').replace(/^,\s*/, '').trim())
    setTickerNames(prev => ({ ...prev, [symbol]: name }))
    setSuggestions([])
    setShowSuggestions(false)
  }

  async function persistTickers(list: string[]) {
    if (!user) return
    await supabase.from('portfolios').upsert(
      { user_id: user.id, tickers: list, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  }

  async function removeSavedTicker(ticker: string) {
    const updated = savedTickers.filter((t) => t !== ticker)
    setSavedTickers(updated)
    const current = tickers.toUpperCase().split(',').map(t => t.trim()).filter(Boolean)
    if (current.includes(ticker)) {
      setTickers(current.filter(t => t !== ticker).join(', '))
    }
    if (user) await persistTickers(updated)
  }

  function toggleSavedTicker(ticker: string) {
    const current = tickers.toUpperCase().split(',').map(t => t.trim()).filter(Boolean)
    const isActive = current.includes(ticker)
    const updated = isActive ? current.filter(t => t !== ticker) : [...current, ticker]
    setTickers(updated.join(', '))
  }

  async function resolveSymbol(input: string): Promise<{ symbol: string; name?: string } | null> {
    const validTicker = /^[A-Z]{1,5}$/
    if (validTicker.test(input)) return { symbol: input }
    // Looks like a company name — search for it
    const res = await fetch(`/api/search?q=${encodeURIComponent(input)}`)
    if (!res.ok) return null
    const data = await res.json()
    const first = data.results?.[0]
    return first ? { symbol: first.symbol, name: first.name } : null
  }

  // Client-side localStorage cache (20 min TTL — matches server cache)
  function getCachedStock(sym: string): StockDetail | null {
    try {
      const raw = localStorage.getItem(`ab_stock_${sym}`)
      if (!raw) return null
      const { data, ts } = JSON.parse(raw)
      if (Date.now() - ts > 20 * 60 * 1000) return null
      return data as StockDetail
    } catch { return null }
  }
  function setCachedStock(sym: string, data: StockDetail) {
    try { localStorage.setItem(`ab_stock_${sym}`, JSON.stringify({ data, ts: Date.now() })) } catch {}
  }

  async function loadCard(symbol: string): Promise<StockDetail | null> {
    const fromCache = getCachedStock(symbol)
    if (fromCache) return fromCache
    const res = await fetch(`/api/screener/detail?symbol=${symbol}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data) setCachedStock(symbol, data)
    return data
  }

  async function generateAll(directTicker?: string) {
    const tickerList = (directTicker ?? tickers).toUpperCase().split(',').map(t => t.trim()).filter(Boolean)
    if (!tickerList.length) return

    if (user) {
      // Read fresh from DB before merging to avoid race with initial portfolio load
      const { data } = await supabase.from('portfolios').select('tickers').eq('user_id', user.id).single()
      const existing: string[] = data?.tickers ?? []
      const merged = Array.from(new Set([...existing, ...tickerList]))
      setSavedTickers(merged)
      await persistTickers(merged)
    } else {
      // Unauth: keep in memory for this session only
      const merged = Array.from(new Set([...savedTickers, ...tickerList]))
      setSavedTickers(merged)
    }

    setHasGenerated(true)
    setHasEverSearched(true)
    setCards(tickerList.map(input => ({ symbol: input, loading: true, data: null, error: false, originalQuery: input })))

    tickerList.forEach(async (input) => {
      const resolved = await resolveSymbol(input)
      const symbol = resolved?.symbol ?? input.toUpperCase()
      if (resolved?.name) setTickerNames(prev => ({ ...prev, [symbol]: resolved.name! }))
      setCards(prev => prev.map(c => c.symbol === input ? { ...c, symbol } : c))
      const data = await loadCard(symbol)
      if (data?.name) setTickerNames(prev => ({ ...prev, [symbol]: data.name }))
      setCards(prev => [
        { symbol, loading: false, data, error: !data, originalQuery: input },
        ...prev.filter(c => c.symbol !== symbol && c.symbol !== input),
      ])
    })
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthSubmitting(true)
    setAuthError('')
    setAuthSuccess('')
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword })
      if (error) setAuthError(error.message)
      else setAuthSuccess('Check your email to confirm your account.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
      if (error) setAuthError(error.message)
    }
    setAuthSubmitting(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setCards([])
    setTickers('')
    setSavedTickers([])
    setHasGenerated(false)
  }

  const isLoading = cards.some(c => c.loading)
  const allLoaded = hasGenerated && !isLoading
  const hasCards = cards.length > 0

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-800 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      {/* Nav */}
      <nav className="border-b border-white/5 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-emerald-400 text-2xl font-light" style={{ fontFamily: 'Georgia, serif' }}>α</span>
          <span className="text-white font-semibold text-lg tracking-tight">
            Alpha<span className="text-emerald-400">Brief</span>
          </span>
          <span className="ml-1 text-xs text-slate-600 border border-slate-800 rounded px-2 py-0.5 hidden sm:inline">beta</span>
        </div>
        <div className="hidden md:flex items-center gap-4 md:gap-6">
          <Link href="/app" className="text-sm text-white font-medium border-b border-emerald-500 pb-0.5">My Stocks</Link>
          <Link href="/app/sectors" className="text-sm text-slate-500 hover:text-white transition-colors">Sectors</Link>
          <Link href="/app/ipos" className="text-sm text-slate-500 hover:text-white transition-colors">IPOs</Link>
          <Link href="/app/calendar" className="text-sm text-slate-500 hover:text-white transition-colors">Calendar</Link>
          <Link href="/app/settings" className="text-sm text-slate-500 hover:text-white transition-colors">Settings</Link>
          {marketOpen && Object.keys(livePrices).length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
          {!user && (
            <button
              onClick={() => { setShowAuthForm(true); setAuthMode('login') }}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
        {!user && (
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={() => { setShowAuthForm(true); setAuthMode('login') }}
              className="text-xs text-emerald-400 font-medium"
            >
              Sign in
            </button>
          </div>
        )}
      </nav>

      <main className="flex-1 flex flex-col items-center px-4 md:px-6 pt-10 pb-24 md:pb-16">
        <div className="w-full max-w-2xl">

          {/* Hero title */}
          {!hasCards && (
            <div className={(!user && !hasEverSearched) ? 'mb-7' : 'mb-6'}>
              {!user && !hasEverSearched ? (
                <>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight mb-3">
                    Your stocks,{' '}
                    <span className="text-emerald-400">at a glance.</span>
                  </h2>
                  <p className="text-slate-400 text-base md:text-lg leading-relaxed">
                    Type a ticker — get an instant brief: price, the bull/bear thesis, next catalyst, and the news that moves it.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-1.5">
                    Your stocks, <span className="text-emerald-400">at a glance.</span>
                  </h2>
                  <p className="text-slate-500 text-sm">
                    Add tickers and get an instant snapshot — price, thesis, catalyst, and news.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Search bar — hidden when cards are showing */}
          {!hasCards && (
            <div className="mb-3" ref={searchRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={tickers}
                    onChange={(e) => handleTickerInput(e.target.value)}
                    placeholder="Ticker or company name, e.g. AAPL, Apple..."
                    className={`w-full bg-slate-900 text-white placeholder-slate-500 focus:outline-none transition-colors ${
                      !user && !hasEverSearched
                        ? 'border-2 border-white/15 hover:border-white/25 focus:border-emerald-500/70 rounded-2xl px-5 py-4 text-base'
                        : 'border border-white/8 focus:border-emerald-500/60 rounded-xl px-4 py-3 text-sm placeholder-slate-600'
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (showSuggestions && suggestions.length > 0) {
                          selectSuggestion(suggestions[0].symbol, suggestions[0].name)
                        } else {
                          setShowSuggestions(false)
                          generateAll()
                        }
                      }
                      if (e.key === 'Escape') setShowSuggestions(false)
                    }}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl">
                      {suggestions.map((s) => (
                        <button
                          key={s.symbol}
                          onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s.symbol, s.name) }}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800 transition-colors text-left"
                        >
                          <span className="text-emerald-400 font-semibold text-sm">{s.symbol}</span>
                          <span className="text-slate-400 text-xs ml-3 truncate">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setShowSuggestions(false); generateAll() }}
                  disabled={isLoading || !tickers.trim()}
                  className={`bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-900 disabled:text-slate-700 disabled:border disabled:border-white/5 text-black font-bold transition-all whitespace-nowrap ${
                    !user && !hasEverSearched
                      ? 'px-7 py-4 rounded-2xl text-base'
                      : 'px-5 py-3 rounded-xl text-sm font-semibold'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Loading
                    </span>
                  ) : 'Generate →'}
                </button>
              </div>
            </div>
          )}

          {/* Quick-start chips — first visit only */}
          {!hasCards && !user && !hasEverSearched && (
            <div className="flex items-center gap-2 flex-wrap mb-8">
              <span className="text-slate-500 text-sm">Don&apos;t know where to start — try one:</span>
              {['NVDA', 'AAPL', 'TSLA', 'AMD'].map(sym => (
                <button
                  key={sym}
                  onClick={() => { setTickers(sym); generateAll(sym) }}
                  className="text-sm font-semibold px-3 py-1 rounded-full border border-white/15 text-white hover:border-emerald-500/40 hover:text-emerald-300 transition-all"
                >
                  {sym}
                </button>
              ))}
            </div>
          )}

          {/* Saved ticker chips — shown for all users in search view */}
          {!hasCards && savedTickers.length > 0 && (
            <div className="mb-5">
              <p className="text-xs text-slate-600 mb-2 uppercase tracking-widest font-semibold">Your stocks</p>
              <div className="flex flex-wrap gap-2">
                {savedTickers.map((ticker) => {
                  const active = tickers.toUpperCase().split(',').map(t => t.trim()).includes(ticker)
                  return (
                    <div key={ticker} className="relative group">
                      <button
                        onClick={() => toggleSavedTicker(ticker)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border pr-6 ${
                          active
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-900 border-white/8 text-slate-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {ticker}
                        {tickerNames[ticker] && (
                          <span className="ml-1.5 font-normal opacity-60">{tickerNames[ticker]}</span>
                        )}
                      </button>
                      <button
                        onClick={() => removeSavedTicker(ticker)}
                        className="absolute top-0.5 right-1 text-slate-600 hover:text-white text-xs leading-none transition-colors"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Example card — first visit only */}
          {!hasCards && !user && !hasEverSearched && <ExampleCard />}

          {/* Value ladder — unregistered users, before any card is generated */}
          {!hasCards && !user && (
            <div className="mb-6 bg-slate-900 border border-white/8 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-white/5">

                {/* Free tier */}
                <div className="p-5 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Free</span>
                    <span className="text-xs text-slate-600 font-medium">always</span>
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      'Unlimited stock cards',
                      'AI thesis & catalyst',
                      'Analyst consensus',
                      'Live price + chart',
                      'Save your watchlist',
                      'Earnings calendar',
                    ].map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pro tier */}
                <div className="p-5 bg-emerald-500/5 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Pro</span>
                    <span className="text-xs text-slate-600 font-medium">+ everything in Free</span>
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      { icon: '⚡', text: 'Thesis alerts', sub: 'Email the moment a thesis flips 🟢→🔴 (up to 10 tickers)' },
                      { icon: '📬', text: 'Daily / weekly digest', sub: 'Your watchlist delivered to your inbox' },
                    ].map(f => (
                      <li key={f.text} className="flex items-start gap-3 bg-emerald-500/8 border border-emerald-500/15 rounded-xl px-3 py-3">
                        <span className="text-base shrink-0 mt-0.5">{f.icon}</span>
                        <div>
                          <p className="text-sm text-white font-semibold leading-snug">{f.text}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{f.sub}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Single CTA */}
              <div className="px-5 pt-4 pb-5 border-t border-white/5 flex items-center gap-4">
                <button
                  onClick={() => { setShowAuthForm(true); setAuthMode('signup') }}
                  className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold px-6 py-3 rounded-2xl transition-all"
                >
                  Sign up free →
                </button>
                <p className="text-slate-500 text-sm">Start free — upgrade to Pro later in Settings.</p>
              </div>
            </div>
          )}

          {/* Signed-in nudges */}
          {!hasCards && user && (
            <div className="flex flex-col gap-2 mb-6">
              {!emailEnabled && (
                <div className="flex items-center gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3">
                  <span className="text-emerald-400 text-base shrink-0">✦</span>
                  <p className="text-slate-300 text-sm">
                    Get your stocks delivered to your inbox —{' '}
                    <a href="/app/settings#email-reports" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">set up daily or weekly email reports</a>.
                  </p>
                </div>
              )}
              {!isPro && (
                <a href="/app/settings" className="block group">
                  <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-slate-800/60 to-slate-900 px-4 py-3.5 hover:border-emerald-500/50 transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-emerald-400 text-base shrink-0">✦</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-white font-semibold text-sm">Thesis change alerts</span>
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Pro</span>
                          </div>
                          <p className="text-slate-400 text-xs">Know the moment a thesis flips — 🟢 Positive → 🔴 Negative — before you're caught off guard.</p>
                        </div>
                      </div>
                      <span className="text-emerald-400 text-sm font-semibold shrink-0 group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </div>
                </a>
              )}
            </div>
          )}

          {/* Cards feed */}
          {hasCards && (
            <div className="space-y-4">
              <button
                onClick={() => { setCards([]); setHasGenerated(false) }}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors group"
              >
                <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
                New search
              </button>

              {cards.map((card) => (
                <StockCard
                  key={card.symbol}
                  card={card}
                  livePrice={marketOpen ? livePrices[card.symbol] : undefined}
                />
              ))}

              {/* Signed-in nudges below cards */}
              {user && allLoaded && (
                <div className="flex flex-col gap-2">
                  {!emailEnabled && (
                    <div className="flex items-center gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3">
                      <span className="text-emerald-400 text-base shrink-0">✦</span>
                      <p className="text-slate-300 text-sm">
                        Get your stocks delivered to your inbox —{' '}
                        <a href="/app/settings#email-reports" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">set up daily or weekly email reports</a>.
                      </p>
                    </div>
                  )}
                  {!isPro && (
                    <div className="flex items-center gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3">
                      <span className="text-emerald-400 text-base shrink-0">✦</span>
                      <p className="text-slate-300 text-sm">
                        Never miss a thesis flip —{' '}
                        <a href="/app/settings" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">get instant alerts with AlphaBrief Pro</a>.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Sign-up prompt — shown below cards for unregistered users */}
              {!user && allLoaded && !showAuthForm && (
                <div className="bg-slate-900 border border-white/8 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-2 divide-x divide-white/5">
                    <div className="p-5">
                      <p className="text-white font-semibold text-sm mb-1">Save this and come back</p>
                      <p className="text-slate-500 text-xs leading-relaxed">Free account — save your list, watchlist chips, and earnings calendar.</p>
                    </div>
                    <div className="p-5 bg-emerald-500/5">
                      <p className="text-emerald-400 font-semibold text-sm mb-1">Get thesis alerts <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 ml-1">Pro</span></p>
                      <p className="text-slate-500 text-xs leading-relaxed">Know the moment a thesis flips 🟢→🔴. Daily email brief included.</p>
                    </div>
                  </div>
                  <div className="px-5 pt-4 pb-5 border-t border-white/5">
                    <button
                      onClick={() => { setShowAuthForm(true); setAuthMode('signup') }}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold py-3 rounded-xl transition-all"
                    >
                      Sign up free →
                    </button>
                    <p className="text-center text-slate-600 text-[11px] mt-2">Start free — upgrade to Pro later in Settings.</p>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>

      {showAuthForm && (
        <AuthModal
          onSuccess={u => { setUser(u); setShowAuthForm(false) }}
          onClose={() => setShowAuthForm(false)}
        />
      )}
      <MobileNav />
    </div>
  )
}

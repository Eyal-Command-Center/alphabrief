'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

const SECTORS: Record<string, string[]> = {
  Tech:       ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMD', 'CRM', 'TSLA'],
  Finance:    ['JPM', 'BAC', 'GS', 'V', 'MA', 'MS', 'BRK.B'],
  Healthcare: ['JNJ', 'UNH', 'PFE', 'ABBV', 'MRK'],
  Energy:     ['XOM', 'CVX', 'COP', 'SLB'],
  Consumer:   ['WMT', 'COST', 'NKE', 'MCD', 'AMZN'],
}

interface SearchResult { symbol: string; name: string }
interface StockDetail {
  symbol: string; name: string; sector: string; logo: string
  price: number; change: number; marketCap: number | null
  pe: number | null; high52: number | null; low52: number | null
  recommendation: { buy: number; hold: number; sell: number } | null
  news: { headline: string; url: string; source: string }[]
  aiTake: string
}

export default function ScreenerPage() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [activeSector, setActiveSector] = useState<string | null>(null)
  const [sectorTickers, setSectorTickers] = useState<SearchResult[]>([])

  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<StockDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setAuthLoading(false)
    })
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/screener/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setSuggestions(data.results ?? [])
    }, 300)
  }, [query])

  async function selectSector(sector: string) {
    setActiveSector(sector)
    setSuggestions([])
    setQuery('')
    const tickers = SECTORS[sector]
    setSectorTickers(tickers.map(s => ({ symbol: s, name: '' })))
  }

  async function loadDetail(symbol: string) {
    setSelected(symbol)
    setDetail(null)
    setDetailLoading(true)
    const res = await fetch(`/api/screener/detail?symbol=${symbol}`)
    const data = await res.json()
    setDetail(data)
    setDetailLoading(false)
    setSuggestions([])
    setQuery('')
  }

  function formatMarketCap(mc: number | null) {
    if (!mc) return 'N/A'
    if (mc >= 1000) return `$${(mc / 1000).toFixed(1)}T`
    return `$${mc.toFixed(0)}B`
  }

  function analystLabel(rec: StockDetail['recommendation']) {
    if (!rec) return null
    const total = rec.buy + rec.hold + rec.sell
    if (!total) return null
    const buyPct = rec.buy / total
    if (buyPct >= 0.6) return { label: 'Buy', color: 'text-emerald-400 bg-emerald-500/20' }
    if (buyPct >= 0.4) return { label: 'Hold', color: 'text-amber-400 bg-amber-500/20' }
    return { label: 'Sell', color: 'text-red-400 bg-red-500/20' }
  }

  if (authLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  )

  if (!user) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <p className="text-slate-400 text-sm">
        <Link href="/app" className="text-emerald-400 hover:underline">Sign in</Link> to use the screener.
      </p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* Nav */}
      <nav className="border-b border-slate-800/60 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-2xl font-light" style={{ fontFamily: 'Georgia, serif' }}>α</span>
          <span className="text-white font-semibold text-lg tracking-tight">
            Alpha<span className="text-emerald-400">Brief</span>
          </span>
          <span className="ml-2 text-xs text-slate-400 border border-slate-600 rounded px-2 py-0.5">beta</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/app" className="text-sm text-slate-400 hover:text-white transition-colors">Brief</Link>
          <Link href="/app/calendar" className="text-sm text-slate-400 hover:text-white transition-colors">Calendar</Link>
          <Link href="/app/screener" className="text-sm text-white font-medium border-b border-emerald-500 pb-0.5">Screener</Link>
          <span className="text-slate-500 text-xs">{user.email}</span>
        </div>
      </nav>

      <main className="flex-1 px-6 pt-12 pb-16 max-w-3xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">Screener</h2>
          <p className="text-slate-400 text-sm">Search any stock or browse by sector for an AI-powered snapshot.</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ticker or company name..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden z-10 shadow-xl">
              {suggestions.map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => loadDetail(s.symbol)}
                  className="w-full px-5 py-3 flex items-center gap-4 hover:bg-slate-800 transition-colors text-left"
                >
                  <span className="text-white font-semibold text-sm w-16 shrink-0">{s.symbol}</span>
                  <span className="text-slate-400 text-sm truncate">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sector filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {Object.keys(SECTORS).map((sector) => (
            <button
              key={sector}
              onClick={() => selectSector(sector)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                activeSector === sector
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
              }`}
            >
              {sector}
            </button>
          ))}
        </div>

        {/* Sector ticker list */}
        {activeSector && !selected && (
          <div className="mb-8">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">{activeSector}</p>
            <div className="flex flex-wrap gap-2">
              {sectorTickers.map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => loadDetail(t.symbol)}
                  className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-semibold text-white hover:border-emerald-500 hover:text-emerald-400 transition-all"
                >
                  {t.symbol}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Detail panel */}
        {detailLoading && (
          <div className="flex items-center gap-3 text-slate-400 text-sm mt-4">
            <div className="w-4 h-4 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
            Loading {selected}...
          </div>
        )}

        {detail && !detailLoading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-2">

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                {detail.logo && (
                  <img src={detail.logo} alt={detail.symbol} className="w-10 h-10 rounded-lg bg-white object-contain p-1" />
                )}
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-bold text-xl">{detail.symbol}</h3>
                    {(() => { const a = analystLabel(detail.recommendation); return a ? <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${a.color}`}>{a.label}</span> : null })()}
                  </div>
                  <p className="text-slate-400 text-sm mt-0.5">{detail.name}</p>
                  {detail.sector && <p className="text-slate-600 text-xs mt-0.5">{detail.sector}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-2xl">${detail.price?.toFixed(2)}</p>
                <p className={`text-sm font-medium ${detail.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {detail.change >= 0 ? '+' : ''}{detail.change?.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Market Cap', value: formatMarketCap(detail.marketCap) },
                { label: 'P/E Ratio', value: detail.pe ? detail.pe.toFixed(1) : 'N/A' },
                { label: '52W High', value: detail.high52 ? `$${detail.high52}` : 'N/A' },
                { label: '52W Low', value: detail.low52 ? `$${detail.low52}` : 'N/A' },
              ].map((m) => (
                <div key={m.label} className="bg-slate-800/60 rounded-xl px-4 py-3">
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{m.label}</p>
                  <p className="text-white font-semibold text-sm">{m.value}</p>
                </div>
              ))}
            </div>

            {/* AI Take */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 mb-6">
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-widest mb-2">AI Quick Take</p>
              <p className="text-slate-300 text-sm leading-relaxed">{detail.aiTake}</p>
            </div>

            {/* News */}
            {detail.news.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">Recent News</p>
                <div className="space-y-2">
                  {detail.news.map((n, i) => (
                    <a
                      key={i}
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-slate-300 text-sm hover:text-white transition-colors leading-snug"
                    >
                      <span className="text-emerald-500 mr-2">▸</span>
                      {n.headline}
                      <span className="text-slate-600 text-xs ml-2">{n.source}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => { setSelected(null); setDetail(null) }}
              className="mt-6 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← Back
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
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
  logo: string
  price: number
  change: number
  marketCap: number | null
  pe: number | null
  high52: number | null
  low52: number | null
  recommendation: { buy: number; hold: number; sell: number } | null
  news: { headline: string; url: string; source: string }[]
  quickTake: string
  thesis: string
  catalyst: string
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
  const total = rec.buy + rec.hold + rec.sell
  if (!total) return null
  const buyPct = rec.buy / total
  if (buyPct >= 0.6) return { label: 'Buy', color: 'text-emerald-400 bg-emerald-500/20' }
  if (buyPct >= 0.4) return { label: 'Hold', color: 'text-amber-400 bg-amber-500/20' }
  return { label: 'Sell', color: 'text-red-400 bg-red-500/20' }
}

function StockCard({ card }: { card: CardState }) {
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
            </div>
            <p className="text-slate-400 text-sm truncate">{d.name}</p>
            {d.sector && <p className="text-slate-600 text-xs mt-0.5 truncate">{d.sector}</p>}
          </div>
        </div>
        <div className="text-right shrink-0 ml-3">
          <p className="text-white font-bold text-xl md:text-2xl">${d.price?.toFixed(2)}</p>
          <p className={`text-sm font-medium ${d.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {d.change >= 0 ? '+' : ''}{d.change?.toFixed(2)}%
          </p>
        </div>
      </div>

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

      {/* Quick Take */}
      {d.quickTake && (
        <div className="bg-slate-800/40 border border-white/5 rounded-xl p-4 mb-3">
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-1.5">Quick Take</p>
          <p className="text-slate-300 text-sm leading-relaxed">{d.quickTake}</p>
        </div>
      )}

      {/* Thesis + Catalyst */}
      {(d.thesis || d.catalyst) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          {d.thesis && (
            <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3.5">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1.5">Thesis Check</p>
              <p className="text-slate-300 text-sm leading-relaxed">{d.thesis}</p>
            </div>
          )}
          {d.catalyst && (
            <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3.5">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1.5">Catalyst</p>
              <p className="text-slate-300 text-sm leading-relaxed">{d.catalyst}</p>
            </div>
          )}
        </div>
      )}

      {/* News */}
      {d.news.length > 0 && (
        <div className="border-t border-white/5 pt-4">
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
    </div>
  )
}

export default function MyStocksPage() {
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
    setCards([{ symbol, loading: true, data: null, error: false }])
    fetch(`/api/screener/detail?symbol=${symbol}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
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

  async function loadCard(symbol: string): Promise<StockDetail | null> {
    const res = await fetch(`/api/screener/detail?symbol=${symbol}`)
    if (!res.ok) return null
    return res.json()
  }

  async function generateAll() {
    const tickerList = tickers.toUpperCase().split(',').map(t => t.trim()).filter(Boolean)
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
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-1.5">
                Your stocks, <span className="text-emerald-400">at a glance.</span>
              </h2>
              <p className="text-slate-500 text-sm">
                Add tickers and get an instant snapshot — price, thesis, catalyst, and news.
              </p>
            </div>
          )}

          {/* Search bar — hidden when cards are showing */}
          {!hasCards && (
            <div className="mb-4" ref={searchRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={tickers}
                    onChange={(e) => handleTickerInput(e.target.value)}
                    placeholder="Ticker or company name, e.g. AAPL, Apple..."
                    className="w-full bg-slate-900 border border-white/8 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 text-sm transition-colors"
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
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-900 disabled:text-slate-700 disabled:border disabled:border-white/5 text-black font-semibold px-5 py-3 rounded-xl transition-all text-sm whitespace-nowrap"
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

          {/* Upsell nudge for unauth users who have searched */}
          {!hasCards && !user && savedTickers.length > 0 && (
            <div className="flex items-center gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3 mb-6">
              <span className="text-emerald-400 text-base shrink-0">✦</span>
              <p className="text-slate-300 text-sm">
                <button onClick={() => { setShowAuthForm(true); setAuthMode('signup') }} className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">Register free</button>
                {' '}to save your list between sessions and access your earnings calendar.
              </p>
            </div>
          )}

          {/* Empty state hint — first time, no stocks yet */}
          {!hasCards && !user && savedTickers.length === 0 && (
            <p className="text-slate-700 text-xs text-center mb-8">
              No account needed — just type a ticker and hit Generate.
            </p>
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
                <StockCard key={card.symbol} card={card} />
              ))}

              {/* Sign-up prompt */}
              {!user && allLoaded && !showAuthForm && (
                <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-6 text-center">
                  <p className="text-white font-semibold mb-1">Save your stocks and come back tomorrow</p>
                  <p className="text-slate-500 text-sm mb-5">
                    Create a free account to save your list, track your portfolio, and access your earnings calendar — all in one place.
                  </p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <button
                      onClick={() => { setShowAuthForm(true); setAuthMode('signup') }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-2.5 rounded-xl text-sm transition-all"
                    >
                      Sign up free →
                    </button>
                    <button
                      onClick={() => { setShowAuthForm(true); setAuthMode('login') }}
                      className="text-slate-500 hover:text-white text-sm transition-colors"
                    >
                      Already have an account
                    </button>
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

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

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
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin shrink-0" />
        <span className="text-slate-400 text-sm">Loading {card.symbol}...</span>
      </div>
    )
  }

  if (card.error || !card.data) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
        <p className="text-slate-400 text-sm">
          Couldn&apos;t find data for <span className="text-white font-semibold">{card.symbol}</span> — double-check the ticker symbol and try again.
        </p>
      </div>
    )
  }

  const d = card.data
  const analyst = analystLabel(d.recommendation)

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {d.logo && (
            <img src={d.logo} alt={d.symbol} className="w-10 h-10 rounded-lg bg-white object-contain p-1 shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-emerald-400 font-bold text-xl">{d.symbol}</h3>
              {analyst && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${analyst.color}`}>
                  {analyst.label}
                </span>
              )}
            </div>
            <p className="text-slate-300 text-sm mt-0.5">{d.name}</p>
            {d.sector && <p className="text-slate-500 text-xs mt-0.5">{d.sector}</p>}
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-white font-bold text-2xl">${d.price?.toFixed(2)}</p>
          <p className={`text-sm font-medium ${d.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {d.change >= 0 ? '+' : ''}{d.change?.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Market Cap', value: formatMarketCap(d.marketCap) },
          { label: 'P/E Ratio', value: d.pe && d.pe > 0 ? d.pe.toFixed(1) : 'Pre-profit' },
          { label: '52W High', value: d.high52 ? `$${d.high52}` : 'N/A' },
          { label: '52W Low', value: d.low52 ? `$${d.low52}` : 'N/A' },
        ].map((m) => (
          <div key={m.label} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{m.label}</p>
            <p className="text-white font-semibold text-sm">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Take */}
      {d.quickTake && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-4">
          <p className="text-xs text-emerald-400 font-semibold uppercase tracking-widest mb-2">Quick Take</p>
          <p className="text-slate-200 text-sm leading-relaxed">{d.quickTake}</p>
        </div>
      )}

      {/* Thesis + Catalyst */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {d.thesis && (
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-2">Thesis Check</p>
            <p className="text-slate-200 text-sm leading-relaxed">{d.thesis}</p>
          </div>
        )}
        {d.catalyst && (
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-2">Upcoming Catalyst</p>
            <p className="text-slate-200 text-sm leading-relaxed">{d.catalyst}</p>
          </div>
        )}
      </div>

      {/* News */}
      {d.news.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-3">Recent News</p>
          <div className="space-y-2.5">
            {d.news.map((n, i) => (
              <a
                key={i}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-slate-300 text-sm hover:text-white transition-colors leading-snug"
              >
                <span className="text-emerald-500 mr-2">▸</span>
                {n.headline}
                <span className="text-slate-500 text-xs ml-2">{n.source}</span>
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
  const [hasGenerated, setHasGenerated] = useState(false)

  const supabase = createClient()

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
    await persistTickers(updated)
  }

  function toggleSavedTicker(ticker: string) {
    const current = tickers.toUpperCase().split(',').map(t => t.trim()).filter(Boolean)
    const isActive = current.includes(ticker)
    const updated = isActive ? current.filter(t => t !== ticker) : [...current, ticker]
    setTickers(updated.join(', '))
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
      const merged = Array.from(new Set([...savedTickers, ...tickerList]))
      setSavedTickers(merged)
      await persistTickers(merged)
    }

    setHasGenerated(true)
    setCards(tickerList.map(symbol => ({ symbol, loading: true, data: null, error: false })))

    tickerList.forEach(async (symbol) => {
      const data = await loadCard(symbol)
      setCards(prev => [
        { symbol, loading: false, data, error: !data },
        ...prev.filter(c => c.symbol !== symbol),
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* Nav */}
      <nav className="border-b border-slate-800/60 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-2xl font-light" style={{ fontFamily: 'Georgia, serif' }}>α</span>
          <span className="text-white font-semibold text-lg tracking-tight">
            Alpha<span className="text-emerald-400">Brief</span>
          </span>
          <span className="ml-2 text-xs text-slate-400 border border-slate-600 rounded px-2 py-0.5 hidden sm:inline">beta</span>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          <Link href="/app" className="text-sm text-white font-medium border-b border-emerald-500 pb-0.5">My Stocks</Link>
          <Link href="/app/calendar" className="text-sm text-slate-300 hover:text-white transition-colors">Calendar</Link>
          {user ? (
            <>
              <span className="text-slate-400 text-xs hidden md:inline">{user.email}</span>
              <button onClick={signOut} className="text-xs text-slate-300 hover:text-white transition-colors">Sign out</button>
            </>
          ) : (
            <button
              onClick={() => { setShowAuthForm(true); setAuthMode('login') }}
              className="text-xs text-slate-300 hover:text-white transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-start px-4 md:px-6 pt-12 pb-16">

        {/* Hero — only when no cards */}
        {cards.length === 0 && (
          <div className="text-center mb-10 w-full max-w-xl">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-3">
              Your stocks,<br />
              <span className="text-emerald-400">at a glance.</span>
            </h2>
            <p className="text-slate-300 text-base">
              Add tickers below and get a full snapshot — price, thesis, catalyst, and news.
            </p>
          </div>
        )}

        {/* Search + Generate — hidden when cards are showing */}
        <div className={`w-full max-w-xl ${cards.length > 0 ? 'hidden' : ''}`}>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-3">
            Your tickers
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={tickers}
              onChange={(e) => setTickers(e.target.value)}
              placeholder="e.g. AAPL, NVDA, TSLA"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && generateAll()}
            />
            <button
              onClick={generateAll}
              disabled={isLoading || !tickers.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-semibold px-6 py-4 rounded-xl transition-all text-sm whitespace-nowrap"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  Loading...
                </span>
              ) : 'Generate →'}
            </button>
          </div>

          {/* Onboarding hint */}
          {cards.length === 0 && savedTickers.length === 0 && (
            <div className="mt-5 bg-slate-900/60 border border-dashed border-slate-700 rounded-xl p-5 text-center">
              <p className="text-slate-300 text-sm">
                Enter stocks you&apos;re interested in — e.g. <span className="text-white font-medium">AAPL, NVDA, TSLA</span>
              </p>
              <p className="text-slate-500 text-xs mt-1.5">
                Separate tickers with commas, then hit Generate.
              </p>
            </div>
          )}

          {/* Saved ticker chips — only for logged-in users */}
          {user && savedTickers.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-slate-400 mb-2 uppercase tracking-widest font-semibold">Saved stocks</p>
              <div className="flex flex-wrap gap-2">
                {savedTickers.map((ticker) => {
                  const active = tickers.toUpperCase().split(',').map(t => t.trim()).includes(ticker)
                  return (
                    <div key={ticker} className="relative group">
                      <button
                        onClick={() => toggleSavedTicker(ticker)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border pr-6 ${
                          active
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white'
                        }`}
                      >
                        {ticker}
                      </button>
                      <button
                        onClick={() => removeSavedTicker(ticker)}
                        className="absolute top-0.5 right-1 text-slate-500 hover:text-white text-xs leading-none transition-colors"
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
        </div>

        {/* Cards feed */}
        {cards.length > 0 && (
          <div className="w-full max-w-2xl mt-10 space-y-6">
            <button
              onClick={() => { setCards([]); setHasGenerated(false) }}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              Back to search
            </button>

            {cards.map((card) => (
              <StockCard key={card.symbol} card={card} />
            ))}

            {/* Sign-up prompt — shown to unauthenticated users after all cards load */}
            {!user && allLoaded && !showAuthForm && (
              <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 text-center">
                <p className="text-white font-semibold mb-1">Save your stocks and come back tomorrow</p>
                <p className="text-slate-400 text-sm mb-5">
                  Create a free account to save your list, track your portfolio, and access your earnings calendar — all in one place.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => { setShowAuthForm(true); setAuthMode('signup') }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all"
                  >
                    Sign up free →
                  </button>
                  <button
                    onClick={() => { setShowAuthForm(true); setAuthMode('login') }}
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    Already have an account
                  </button>
                </div>
              </div>
            )}

            {/* Inline auth form */}
            {!user && showAuthForm && (
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-white font-semibold text-lg mb-1 text-center">
                  {authMode === 'signup' ? 'Create your free account' : 'Welcome back'}
                </h3>
                <p className="text-slate-400 text-sm text-center mb-6">
                  {authMode === 'signup' ? 'Free during beta.' : 'Sign in to access your saved stocks.'}
                </p>

                <button
                  onClick={() => supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: process.env.NODE_ENV === 'production'
                        ? 'https://alphabrief.io/auth/callback'
                        : `${window.location.origin}/auth/callback`
                    }
                  })}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 rounded-xl transition-all text-sm mb-4"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-slate-600 text-xs">or</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                <form onSubmit={handleAuth} className="space-y-3">
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
                  />
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
                  />
                  {authError && <p className="text-red-400 text-xs">{authError}</p>}
                  {authSuccess && <p className="text-emerald-400 text-xs">{authSuccess}</p>}
                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 text-slate-950 font-semibold py-3 rounded-xl transition-all text-sm"
                  >
                    {authSubmitting ? 'Please wait...' : authMode === 'signup' ? 'Create account' : 'Sign in'}
                  </button>
                </form>

                <p className="text-center text-slate-500 text-xs mt-4">
                  {authMode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                  <button
                    onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setAuthError(''); setAuthSuccess('') }}
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    {authMode === 'signup' ? 'Sign in' : 'Sign up'}
                  </button>
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

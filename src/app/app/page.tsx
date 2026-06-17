'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const [tickers, setTickers] = useState('')
  const [brief, setBrief] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // Auth state
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authSuccess, setAuthSuccess] = useState('')

  const supabase = createClient()

  // Check session on load + listen for changes
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

  const [savedTickers, setSavedTickers] = useState<string[]>([])

  // Load saved tickers when user logs in
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
          setTickers(data.tickers.join(', '))
        }
      })
  }, [user])

  async function removeSavedTicker(ticker: string) {
    const updated = savedTickers.filter((t) => t !== ticker)
    setSavedTickers(updated)
    // Also remove from input if active
    const current = tickers.toUpperCase().split(',').map(t => t.trim()).filter(Boolean)
    if (current.includes(ticker)) {
      setTickers(current.filter(t => t !== ticker).join(', '))
    }
    await saveTickers(updated)
  }

  function toggleSavedTicker(ticker: string) {
    const current = tickers
      .toUpperCase()
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const isActive = current.includes(ticker)
    const updated = isActive
      ? current.filter((t) => t !== ticker)
      : [...current, ticker]
    setTickers(updated.join(', '))
  }

  // Save tickers to Supabase — merges with existing saved tickers so chips are never removed on generate
  async function saveTickers(tickerList: string[]) {
    if (!user) return
    const merged = Array.from(new Set([...savedTickers, ...tickerList]))
    await supabase.from('portfolios').upsert(
      { user_id: user.id, tickers: merged, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    setSavedTickers(merged)
  }

  async function generateBrief() {
    const tickerList = tickers
      .toUpperCase()
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    if (tickerList.length === 0) return

    setLoading(true)
    setBrief('')
    setError('')

    await saveTickers(tickerList)

    setShareUrl('')
    setCopied(false)

    try {
      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: tickerList }),
      })
      const data = await res.json()
      if (data.brief) {
        setBrief(data.brief)
        // Save to Supabase and generate share URL
        if (user) {
          const { data: saved } = await supabase
            .from('briefs')
            .insert({ user_id: user.id, tickers: tickerList, content: data.brief })
            .select('id')
            .single()
          if (saved?.id) {
            setShareUrl(`${window.location.origin}/brief/${saved.id}`)
          }
        }
      } else {
        setError('Something went wrong. Try again.')
      }
    } catch {
      setError('Failed to connect. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  async function copyShareUrl() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
    setBrief('')
    setTickers('')
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  // Auth wall
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <nav className="border-b border-slate-800/60 px-8 py-4 flex items-center gap-2">
          <span className="text-emerald-400 text-2xl font-light" style={{ fontFamily: 'Georgia, serif' }}>α</span>
          <span className="text-white font-semibold text-lg tracking-tight">
            Alpha<span className="text-emerald-400">Brief</span>
          </span>
          <span className="ml-2 text-xs text-slate-400 border border-slate-600 rounded px-2 py-0.5">beta</span>
        </nav>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-semibold text-white mb-2 text-center">
              {authMode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-slate-400 text-sm text-center mb-8">
              {authMode === 'login' ? 'Sign in to access your brief.' : 'Free during beta.'}
            </p>

            {/* Google sign-in */}
            <button
              onClick={() => supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: process.env.NODE_ENV === 'production'
                    ? 'https://alphabrief.io/auth/callback'
                    : `${window.location.origin}/auth/callback`
                }
              })}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3.5 rounded-xl transition-all text-sm mb-4"
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
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
              />
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
              />
              {authError && <p className="text-red-400 text-xs">{authError}</p>}
              {authSuccess && <p className="text-emerald-400 text-xs">{authSuccess}</p>}
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 text-slate-950 font-semibold py-3.5 rounded-xl transition-all text-sm"
              >
                {authSubmitting ? 'Please wait...' : authMode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <p className="text-center text-slate-500 text-xs mt-6">
              {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); setAuthSuccess('') }}
                className="text-emerald-400 hover:text-emerald-300"
              >
                {authMode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Main app (authenticated)
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
          <Link href="/app" className="text-sm text-white font-medium border-b border-emerald-500 pb-0.5">Brief</Link>
          <Link href="/app/calendar" className="text-sm text-slate-300 hover:text-white transition-colors">Calendar</Link>
          <Link href="/app/screener" className="text-sm text-slate-300 hover:text-white transition-colors">Screener</Link>
          <span className="text-slate-400 text-xs">{user.email}</span>
          <button onClick={signOut} className="text-xs text-slate-300 hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-start px-6 pt-20 pb-16">

        {/* Hero */}
        {!brief && !loading && (
          <div className="text-center mb-12">
            <h2 className="text-4xl font-semibold tracking-tight text-white mb-3">
              Your morning brief,<br />
              <span className="text-emerald-400">powered by AI.</span>
            </h2>
            <p className="text-slate-300 text-lg">
              Add your tickers and get a sharp, human-readable summary of what matters today.
            </p>
          </div>
        )}

        {/* Input card */}
        <div className="w-full max-w-xl">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-3">
            Your tickers
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={tickers}
              onChange={(e) => setTickers(e.target.value)}
              placeholder="AAPL, NVDA, MSFT, TSLA"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && generateBrief()}
            />
            <button
              onClick={generateBrief}
              disabled={loading || !tickers.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-semibold px-6 py-4 rounded-xl transition-all text-sm whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  Working...
                </span>
              ) : (
                'Generate →'
              )}
            </button>
          </div>

          {error && (
            <p className="mt-3 text-red-400 text-sm">{error}</p>
          )}

          {/* Saved ticker chips */}
          {savedTickers.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-slate-400 mb-2 uppercase tracking-widest font-semibold">Your portfolio</p>
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

        {/* Brief */}
        {brief && (
          <div className="w-full max-w-2xl mt-12">
            <div className="flex items-center justify-between mb-8">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                Morning Brief
              </span>
              <div className="flex items-center gap-4">
                <span className="text-slate-400 text-xs">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                {shareUrl && (
                  <button
                    onClick={copyShareUrl}
                    className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 rounded-lg px-3 py-1.5 transition-all"
                  >
                    {copied ? '✓ Copied!' : '↗ Share'}
                  </button>
                )}
              </div>
            </div>

            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-white mt-12 mb-5 pb-4 border-b border-slate-800 first:mt-0 tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-emerald-500 rounded-full inline-block shrink-0" />
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mt-6 mb-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-slate-300 text-sm leading-7 mb-3">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="text-white font-semibold">{children}</strong>
                ),
                ul: ({ children }) => (
                  <ul className="mb-4 space-y-2.5">{children}</ul>
                ),
                li: ({ children }) => (
                  <li className="text-slate-300 text-sm leading-relaxed flex gap-3">
                    <span className="text-emerald-500 mt-1.5 shrink-0 text-xs">▸</span>
                    <span>{children}</span>
                  </li>
                ),
                hr: () => (
                  <div className="my-10 border-t border-slate-800/60" />
                ),
              }}
            >
              {brief}
            </ReactMarkdown>
          </div>
        )}
      </main>
    </div>
  )
}

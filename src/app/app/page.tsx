'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Home() {
  const [tickers, setTickers] = useState('')
  const [brief, setBrief] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

    try {
      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: tickerList }),
      })
      const data = await res.json()
      if (data.brief) {
        setBrief(data.brief)
      } else {
        setError('Something went wrong. Try again.')
      }
    } catch {
      setError('Failed to connect. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* Nav */}
      <nav className="border-b border-slate-800/60 px-8 py-4 flex items-center gap-2">
        <span className="text-emerald-400 text-2xl font-light" style={{ fontFamily: 'Georgia, serif' }}>α</span>
        <span className="text-white font-semibold text-lg tracking-tight">
          Alpha<span className="text-emerald-400">Brief</span>
        </span>
        <span className="ml-2 text-xs text-slate-400 border border-slate-600 rounded px-2 py-0.5">beta</span>
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
            <p className="text-slate-400 text-lg">
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
        </div>

        {/* Brief */}
        {brief && (
          <div className="w-full max-w-2xl mt-12">
            <div className="flex items-center justify-between mb-8">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                Morning Brief
              </span>
              <span className="text-slate-400 text-xs">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
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

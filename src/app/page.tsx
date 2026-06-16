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
    <main className="min-h-screen bg-slate-950 text-white px-6 py-12 max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">
          Alpha<span className="text-emerald-400">Brief</span>
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Your daily market edge, in minutes.
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">
          Enter your tickers (comma separated)
        </label>
        <input
          type="text"
          value={tickers}
          onChange={(e) => setTickers(e.target.value)}
          placeholder="AAPL, NVDA, MSFT"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && generateBrief()}
        />
      </div>

      <button
        onClick={generateBrief}
        disabled={loading || !tickers.trim()}
        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-3 rounded-lg transition-colors text-sm"
      >
        {loading ? 'Generating brief...' : 'Generate Morning Brief'}
      </button>

      {error && (
        <p className="mt-4 text-red-400 text-sm">{error}</p>
      )}

      {brief && (
        <div className="mt-8 bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-emerald-400 font-semibold text-sm uppercase tracking-wider">
              Morning Brief
            </h2>
            <span className="text-slate-600 text-xs">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed
            prose-headings:text-emerald-400 prose-headings:font-semibold
            prose-strong:text-white prose-strong:font-semibold
            prose-p:text-slate-200 prose-p:my-2
            prose-li:text-slate-200 prose-ul:my-2 prose-ol:my-2
            prose-hr:border-slate-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{brief}</ReactMarkdown>
          </div>
        </div>
      )}
    </main>
  )
}

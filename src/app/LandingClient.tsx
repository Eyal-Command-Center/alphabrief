'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AuthModal } from '@/components/AuthModal'

export default function LandingClient() {
  const [ticker, setTicker] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const [suggestions, setSuggestions] = useState<{ symbol: string; name: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleInput(value: string) {
    setTicker(value)
    if (debounce.current) clearTimeout(debounce.current)
    if (!value.trim()) { setSuggestions([]); setShowSuggestions(false); return }
    debounce.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`)
      const data = await res.json()
      setSuggestions(data.results ?? [])
      setShowSuggestions((data.results?.length ?? 0) > 0)
    }, 300)
  }

  function selectSuggestion(symbol: string) {
    setSuggestions([])
    setShowSuggestions(false)
    router.push(`/app?t=${symbol}`)
  }

  function handleTry(e: React.FormEvent) {
    e.preventDefault()
    if (showSuggestions && suggestions.length > 0) {
      selectSuggestion(suggestions[0].symbol)
      return
    }
    const t = ticker.trim().toUpperCase()
    router.push(t ? `/app?t=${t}` : '/app')
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      {/* Nav — Sign In + Get Started */}
      <nav className="px-6 md:px-12 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <span className="text-emerald-400 text-2xl font-light" style={{ fontFamily: 'Georgia, serif' }}>α</span>
          <span className="text-white font-semibold text-lg tracking-tight">
            Alpha<span className="text-emerald-400">Brief</span>
          </span>
          <span className="ml-1 text-xs text-slate-600 border border-slate-800 rounded px-2 py-0.5 hidden sm:inline">beta</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAuth(true)}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Sign in
          </button>
          <button
            onClick={() => router.push('/app')}
            className="text-sm bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded-lg transition-all"
          >
            Get started
          </button>
        </div>
      </nav>

      {/* Hero — more vertical breathing room */}
      <section className="flex-1 flex flex-col lg:flex-row items-center gap-12 xl:gap-20 px-6 md:px-12 py-24 md:py-32 max-w-7xl mx-auto w-full">

        {/* Left — copy + input */}
        <div className="flex-1 max-w-lg">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-8">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-xs font-medium tracking-wide">Built for investors who want signal, not noise.</span>
          </div>

          <h1 className="text-4xl md:text-5xl xl:text-6xl font-semibold tracking-tight text-white leading-[1.1] mb-4">
            Know what moves<br />
            <span className="text-emerald-400">your portfolio.</span>
          </h1>

          {/* Differentiation line */}
          <p className="text-slate-500 text-sm md:text-base mb-5">
            Not a chatbot. A purpose-built tool that knows the numbers — price, earnings, analyst consensus — and turns them into a clear thesis in seconds.
          </p>

          <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-8">
            Type any ticker. Get an instant snapshot — AI thesis, upcoming catalyst, key risks, and top news.
          </p>

          {/* Search box — more prominent border */}
          <form onSubmit={handleTry} className="flex gap-3 mb-4">
            <div className="relative flex-1" ref={searchRef}>
              <input
                type="text"
                value={ticker}
                onChange={(e) => handleInput(e.target.value)}
                placeholder="Try: NVDA, TSLA, AAPL..."
                className="w-full bg-white/5 border-2 border-white/20 hover:border-white/30 focus:border-emerald-500/70 rounded-xl px-5 py-4 text-white placeholder-slate-500 focus:outline-none text-sm transition-colors"
                onKeyDown={(e) => e.key === 'Escape' && setShowSuggestions(false)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl">
                  {suggestions.map((s) => (
                    <button
                      key={s.symbol}
                      type="button"
                      onMouseDown={() => selectSuggestion(s.symbol)}
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
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-4 rounded-xl transition-all text-sm whitespace-nowrap"
            >
              Try it →
            </button>
          </form>

          {/* What you get checklist */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
            {['AI thesis', 'Key risks', 'Next catalyst', 'Latest news', 'Valuation snapshot'].map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="text-emerald-500">✓</span> {item}
              </span>
            ))}
          </div>
          <p className="text-slate-600 text-xs">No account needed to try. Free to sign up.</p>
        </div>

        {/* Right — Product card preview */}
        <div className="flex-1 w-full max-w-md xl:max-w-lg">
          <div className="relative">
            {/* Emerald ambient glow */}
            <div className="absolute -inset-6 bg-emerald-500/8 blur-3xl rounded-3xl pointer-events-none" />

            <div className="relative bg-slate-900 border border-white/[0.06] rounded-2xl p-5 md:p-6">

              {/* Card header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-black border border-white/10 flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xs">N</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold text-lg">NVDA</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-500/20">Buy</span>
                    </div>
                    <p className="text-slate-400 text-xs">NVIDIA Corporation · Semiconductors</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white font-bold text-xl">$875.40</p>
                  <p className="text-emerald-400 text-sm font-medium">+3.21%</p>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {[
                  { label: 'Mkt Cap', value: '$2.1T' },
                  { label: 'P/E', value: '68.4' },
                  { label: '52W H', value: '$974' },
                  { label: '52W L', value: '$435' },
                ].map((m) => (
                  <div key={m.label} className="bg-slate-800/60 border border-white/5 rounded-xl px-3 py-2.5">
                    <p className="text-slate-500 text-xs mb-1">{m.label}</p>
                    <p className="text-white text-xs font-semibold">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Quick Take */}
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3.5 mb-3">
                <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-1.5">Quick Take</p>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Up 3.2% as hyperscalers front-load GPU capacity ahead of next-gen model rollouts. ✅ Blackwell ramp ahead of schedule, margins holding at record highs.
                </p>
              </div>

              {/* Thesis + Catalyst */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1.5">Thesis Check</p>
                  <p className="text-slate-300 text-xs leading-relaxed">🟢 Positive — AI infra spend is the dominant capex theme and NVIDIA holds the hardware + CUDA moat.</p>
                </div>
                <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1.5">Catalyst</p>
                  <p className="text-slate-300 text-xs leading-relaxed">Earnings Aug 28 after close — consensus EPS est. $0.64.</p>
                </div>
              </div>

            </div>
          </div>
        </div>

      </section>

      {/* Divider */}
      <div className="border-t border-white/5 max-w-7xl mx-auto w-full" />

      {/* Features */}
      <section className="px-6 md:px-12 py-16 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
          {[
            {
              icon: '◎',
              title: 'Instant stock snapshot',
              desc: 'Price action, AI thesis, upcoming catalyst, and top news — for any ticker, in seconds.',
            },
            {
              icon: '◷',
              title: 'Earnings calendar',
              desc: 'Track upcoming earnings for your whole portfolio in one view. Never get caught off-guard by a print.',
            },
            {
              icon: '◈',
              title: 'Signal, not noise',
              desc: 'No Bloomberg terminal, no 40-tab research session. Just what actually matters today.',
            },
          ].map((f) => (
            <div key={f.title}>
              <span className="text-emerald-400 text-2xl mb-4 block">{f.icon}</span>
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Thesis Alerts — Pro callout */}
      <section className="px-6 md:px-12 pb-16 max-w-7xl mx-auto w-full">
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-white/[0.06] rounded-2xl p-8 md:p-10 overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

          <div className="relative flex flex-col md:flex-row gap-10 items-start md:items-center">

            {/* Left — copy */}
            <div className="flex-1 max-w-md">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                <span className="text-emerald-400 text-xs font-semibold tracking-wide">Pro feature</span>
              </div>
              <h2 className="text-white text-2xl md:text-3xl font-semibold leading-tight mb-3">
                Know when the thesis flips.
              </h2>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-6">
                AlphaBrief monitors your watchlist every trading day. The moment a stock shifts from positive to negative — or back — you get an email. Know before the market prices it in.
              </p>
              <button
                onClick={() => router.push('/app')}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-3 rounded-xl transition-all text-sm"
              >
                Get thesis alerts →
              </button>
            </div>

            {/* Right — mini alert preview */}
            <div className="flex-shrink-0 w-full md:w-72">
              <div className="bg-slate-950 border border-white/[0.07] rounded-2xl overflow-hidden shadow-xl">
                {/* Email header */}
                <div className="bg-slate-900 px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-emerald-400 text-xs font-semibold">AlphaBrief <span className="text-slate-600">· Thesis Alert</span></p>
                </div>
                <div className="p-4">
                  <p className="text-white font-semibold text-sm mb-1">TSLA thesis changed</p>
                  <p className="text-slate-500 text-xs mb-4">We detected a shift in the investment thesis.</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-900 rounded-xl p-3 text-center">
                      <p className="text-slate-600 text-[10px] uppercase tracking-widest mb-1">Was</p>
                      <p className="text-lg">🟢</p>
                      <p className="text-slate-500 text-xs font-medium mt-1">Positive</p>
                    </div>
                    <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-3 text-center">
                      <p className="text-slate-600 text-[10px] uppercase tracking-widest mb-1">Now</p>
                      <p className="text-lg">🔴</p>
                      <p className="text-red-400 text-xs font-semibold mt-1">Negative</p>
                    </div>
                  </div>
                  <div className="bg-slate-900 border-l-2 border-red-500/60 rounded-r-lg px-3 py-2">
                    <p className="text-slate-400 text-xs leading-relaxed">🔴 Negative — margin compression and rising competition from legacy OEMs is eroding the EV premium thesis.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 md:px-12 py-5 flex items-center justify-between max-w-7xl mx-auto w-full">
        <span className="text-slate-700 text-xs">© 2026 AlphaBrief</span>
        <div className="flex items-center gap-5">
          <a href="/privacy" className="text-slate-700 hover:text-slate-500 text-xs transition-colors">Privacy</a>
          <a href="/terms" className="text-slate-700 hover:text-slate-500 text-xs transition-colors">Terms</a>
          <span className="text-slate-700 text-xs">alphabrief.io</span>
        </div>
      </footer>

      {showAuth && (
        <AuthModal
          onSuccess={() => { setShowAuth(false); window.location.href = '/app' }}
          onClose={() => setShowAuth(false)}
        />
      )}
    </div>
  )
}

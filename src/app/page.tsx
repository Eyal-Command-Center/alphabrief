'use client'

import { useState } from 'react'
import Link from 'next/link'

const features = [
  {
    icon: '◎',
    title: 'Morning Brief',
    description:
      'Every morning, a sharp summary of your portfolio — what moved, why it moved, and whether it matters.',
  },
  {
    icon: '◷',
    title: 'Earnings Calendar',
    description:
      'Never miss an earnings date for a stock you own. Dates, expected moves, and analyst consensus — all in one place.',
  },
  {
    icon: '◈',
    title: 'AI News Digest',
    description:
      'Top news per ticker, filtered and explained in plain English. No noise, no jargon — just what you need to know.',
  },
]

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function joinWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setStatus('success')
        setEmail('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
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
        <Link
          href="/app"
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition-all"
        >
          Try it free →
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-emerald-400 text-xs font-medium">Building in public · Early access</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-6 max-w-2xl leading-tight">
          Know what matters.<br />
          <span className="text-emerald-400">Skip the noise.</span>
        </h1>

        <p className="text-slate-300 text-base md:text-lg max-w-xl mb-10 leading-relaxed">
          AlphaBrief gives you a sharp, AI-powered morning brief for your portfolio —
          what moved, what's in the news, and what's coming next. In minutes, not hours.
        </p>

        <div className="flex flex-col items-center gap-4">
          <Link
            href="/app"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-8 py-4 rounded-xl transition-all text-sm"
          >
            Try it free →
          </Link>
          <p className="text-slate-500 text-xs">No credit card. No setup. Just sign up and go.</p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6"
            >
              <span className="text-emerald-400 text-2xl mb-4 block">{f.icon}</span>
              <h3 className="text-white font-semibold mb-2 text-sm">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 px-8 py-5 flex items-center justify-between">
        <span className="text-slate-600 text-xs">© 2025 AlphaBrief</span>
        <span className="text-slate-600 text-xs">Built in public by <span className="text-slate-400">@eyalgilad</span></span>
      </footer>

    </div>
  )
}

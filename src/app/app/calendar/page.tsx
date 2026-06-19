'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface EarningsEvent {
  symbol: string
  date: string
  epsEstimate: number | null
  revenueEstimate: number | null
  hour: string
}

interface MacroEvent {
  event: string
  date: string
  category: string
}

export default function CalendarPage() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [events, setEvents] = useState<EarningsEvent[]>([])
  const [macroEvents, setMacroEvents] = useState<MacroEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [noTickers, setNoTickers] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    loadEarnings()
  }, [user])

  async function loadEarnings() {
    setLoading(true)

    const { data } = await supabase
      .from('portfolios')
      .select('tickers')
      .eq('user_id', user!.id)
      .single()

    if (!data?.tickers?.length) {
      setNoTickers(true)
      setLoading(false)
      return
    }

    const tickers: string[] = data.tickers
    const today = new Date().toISOString().split('T')[0]
    const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [earningsResults, macroRes] = await Promise.all([
      Promise.all(
        tickers.map(async (symbol) => {
          const res = await fetch(`/api/earnings?symbol=${symbol}&from=${today}&to=${in60Days}`)
          const data = await res.json()
          return data.events as EarningsEvent[]
        })
      ),
      fetch(`/api/macro?from=${today}&to=${in60Days}`).then(r => r.json()),
    ])

    const all = earningsResults
      .flat()
      .filter(Boolean)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    setEvents(all)
    setMacroEvents(macroRes.events ?? [])
    setLoading(false)
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  function daysUntil(dateStr: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(dateStr + 'T00:00:00')
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return `In ${diff} days`
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <nav className="border-b border-slate-800/60 px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-2xl font-light" style={{ fontFamily: 'Georgia, serif' }}>α</span>
            <span className="text-white font-semibold text-lg tracking-tight">Alpha<span className="text-emerald-400">Brief</span></span>
            <span className="ml-2 text-xs text-slate-400 border border-slate-600 rounded px-2 py-0.5 hidden sm:inline">beta</span>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <Link href="/app" className="text-sm text-slate-300 hover:text-white transition-colors">My Stocks</Link>
            <Link href="/app/sectors" className="text-sm text-slate-300 hover:text-white transition-colors">Sectors</Link>
            <Link href="/app/calendar" className="text-sm text-white font-medium border-b border-emerald-500 pb-0.5">Calendar</Link>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm text-center">
            <div className="text-3xl mb-4">📅</div>
            <h2 className="text-xl font-semibold text-white mb-2">Your earnings calendar</h2>
            <p className="text-slate-400 text-sm mb-6">
              Never miss an earnings date for a stock you own. Create a free account to track upcoming earnings and macro events for your portfolio.
            </p>
            <Link
              href="/app"
              className="inline-block bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3 rounded-xl text-sm transition-all"
            >
              Get started free →
            </Link>
            <p className="text-slate-600 text-xs mt-4">Already have an account? <Link href="/app" className="text-emerald-400 hover:text-emerald-300">Sign in</Link></p>
          </div>
        </div>
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
          <Link href="/app" className="text-sm text-slate-300 hover:text-white transition-colors">My Stocks</Link>
          <Link href="/app/calendar" className="text-sm text-white font-medium border-b border-emerald-500 pb-0.5">Calendar</Link>
          <span className="text-slate-400 text-xs hidden md:inline">{user.email}</span>
        </div>
      </nav>

      <main className="flex-1 px-6 pt-12 pb-16 max-w-2xl mx-auto w-full">
        <div className="mb-10">
          <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">Earnings Calendar</h2>
          <p className="text-slate-300 text-sm">Upcoming earnings for your saved tickers — next 60 days.</p>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <div className="w-4 h-4 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
            Loading earnings...
          </div>
        )}

        {noTickers && !loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-slate-400 text-sm mb-3">No tickers saved yet.</p>
            <Link href="/app" className="text-emerald-400 text-sm hover:underline">Go to Brief → add your tickers</Link>
          </div>
        )}

        {!loading && !noTickers && events.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-slate-400 text-sm">No upcoming earnings found for your tickers in the next 60 days.</p>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="space-y-3">
            {events.map((event, i) => (
              <div
                key={`${event.symbol}-${i}`}
                className="bg-slate-900 border border-slate-700 rounded-2xl px-6 py-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-5">
                  <div className="min-w-[64px]">
                    <p className="text-emerald-400 font-bold text-lg tracking-tight">{event.symbol}</p>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{formatDate(event.date)}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {event.hour === 'amc' ? 'After close' : event.hour === 'bmo' ? 'Before open' : 'Time TBD'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                    daysUntil(event.date) === 'Today'
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                      : daysUntil(event.date) === 'Tomorrow'
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-700 text-slate-200'
                  }`}>
                    {daysUntil(event.date)}
                  </span>
                  {event.epsEstimate !== null && (
                    <div className="relative group inline-block mt-2">
                      <p className="text-slate-400 text-xs cursor-help">EPS est. ${event.epsEstimate}</p>
                      <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-300 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl text-left">
                        <strong className="text-white">EPS Estimate</strong> — What analysts expect the company to earn (or lose) per share this quarter. A negative number means an expected loss. If the actual result beats this, the stock often rises.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Macro Events */}
        {!loading && macroEvents.length > 0 && (
          <div className="mt-12">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-1">Market Events</h3>
              <p className="text-slate-300 text-sm">High-impact macro events — FOMC, CPI, jobs reports, and more.</p>
            </div>
            <div className="space-y-3">
              {macroEvents.map((event, i) => (
                <div
                  key={i}
                  className="bg-slate-900 border border-slate-700 rounded-2xl px-6 py-5 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white text-sm font-semibold">{event.event}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-slate-400 text-xs">{formatDate(event.date)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        event.category === 'Fed'
                          ? 'bg-violet-500/25 text-violet-300 border border-violet-500/30'
                          : event.category === 'Inflation'
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/25 text-blue-300 border border-blue-500/30'
                      }`}>
                        {event.category}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                    daysUntil(event.date) === 'Today'
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                      : daysUntil(event.date) === 'Tomorrow'
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-700 text-slate-200'
                  }`}>
                    {daysUntil(event.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

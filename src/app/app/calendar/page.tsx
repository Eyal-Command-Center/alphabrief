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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400 text-sm">
          <Link href="/app" className="text-emerald-400 hover:underline">Sign in</Link> to view your earnings calendar.
        </p>
      </div>
    )
  }

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
          <Link href="/app/calendar" className="text-sm text-white font-medium border-b border-emerald-500 pb-0.5">Calendar</Link>
          <Link href="/app/screener" className="text-sm text-slate-400 hover:text-white transition-colors">Screener</Link>
          <span className="text-slate-500 text-xs">{user.email}</span>
        </div>
      </nav>

      <main className="flex-1 px-6 pt-12 pb-16 max-w-2xl mx-auto w-full">
        <div className="mb-10">
          <h2 className="text-3xl font-semibold tracking-tight text-white mb-2">Earnings Calendar</h2>
          <p className="text-slate-400 text-sm">Upcoming earnings for your saved tickers — next 60 days.</p>
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
                className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-5">
                  <div className="text-center min-w-[56px]">
                    <p className="text-white font-bold text-lg">{event.symbol}</p>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{formatDate(event.date)}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {event.hour === 'amc' ? 'After close' : event.hour === 'bmo' ? 'Before open' : 'Time TBD'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    daysUntil(event.date) === 'Today'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : daysUntil(event.date) === 'Tomorrow'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {daysUntil(event.date)}
                  </span>
                  {event.epsEstimate !== null && (
                    <p className="text-slate-500 text-xs mt-2">EPS est. ${event.epsEstimate}</p>
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
              <p className="text-slate-400 text-sm">High-impact macro events — FOMC, CPI, jobs reports, and more.</p>
            </div>
            <div className="space-y-3">
              {macroEvents.map((event, i) => (
                <div
                  key={i}
                  className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-5 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white text-sm font-medium">{event.event}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-slate-500 text-xs">{formatDate(event.date)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        event.category === 'Fed'
                          ? 'bg-violet-500/20 text-violet-400'
                          : event.category === 'Inflation'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {event.category}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    daysUntil(event.date) === 'Today'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : daysUntil(event.date) === 'Tomorrow'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-800 text-slate-400'
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

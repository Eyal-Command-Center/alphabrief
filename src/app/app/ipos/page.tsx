'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface IpoEntry {
  date: string
  name: string
  symbol: string | null
  price: string | null
  shares: number | null
  dealSize: number | null
  status: string
  exchange: string | null
}

function formatDealSize(val: number | null) {
  if (!val) return null
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`
  return `$${val.toLocaleString()}`
}

function formatShares(val: number | null) {
  if (!val) return null
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M shares`
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K shares`
  return `${val} shares`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `In ${diff} days`
}

function IpoRow({ ipo, onSymbolClick }: { ipo: IpoEntry; onSymbolClick: (s: string) => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
      <div className="flex items-start gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm">{ipo.name}</span>
            {ipo.symbol && (
              <button
                onClick={() => onSymbolClick(ipo.symbol!)}
                className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-colors shrink-0"
              >
                {ipo.symbol}
              </button>
            )}
            {ipo.exchange && (
              <span className="text-xs text-slate-500 bg-slate-800 border border-white/8 px-2 py-0.5 rounded shrink-0">
                {ipo.exchange}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-slate-500 text-xs">{formatDate(ipo.date)}</span>
            {ipo.price && <span className="text-slate-300 text-xs font-medium">@ ${ipo.price}</span>}
            {ipo.shares && <span className="text-slate-500 text-xs">{formatShares(ipo.shares)}</span>}
            {ipo.dealSize && <span className="text-slate-400 text-xs font-medium">{formatDealSize(ipo.dealSize)}</span>}
          </div>
        </div>
      </div>
      <div className="shrink-0 ml-4">
        {ipo.status === 'priced' ? (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            Priced
          </span>
        ) : ipo.status === 'expected' ? (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
            {daysUntil(ipo.date)}
          </span>
        ) : (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-white/8">
            {ipo.status}
          </span>
        )}
      </div>
    </div>
  )
}

export default function IposPage() {
  const [recent, setRecent] = useState<IpoEntry[]>([])
  const [upcoming, setUpcoming] = useState<IpoEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  useEffect(() => {
    fetch('/api/ipos')
      .then(r => r.json())
      .then(data => {
        setRecent(data.recent ?? [])
        setUpcoming(data.upcoming ?? [])
        setLoading(false)
      })
  }, [])

  function handleSymbolClick(symbol: string) {
    router.push(`/app?t=${symbol}`)
  }

  async function signOut() {
    await supabase.auth.signOut()
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
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="/app" className="text-sm text-slate-500 hover:text-white transition-colors">My Stocks</Link>
          <Link href="/app/sectors" className="text-sm text-slate-500 hover:text-white transition-colors">Sectors</Link>
          <Link href="/app/ipos" className="text-sm text-white font-medium border-b border-emerald-500 pb-0.5">IPOs</Link>
          <Link href="/app/calendar" className="text-sm text-slate-500 hover:text-white transition-colors">Calendar</Link>
          {user ? (
            <>
              <span className="text-slate-600 text-xs hidden md:inline">{user.email}</span>
              <button onClick={signOut} className="text-xs text-slate-500 hover:text-white transition-colors">Sign out</button>
            </>
          ) : (
            <Link href="/app" className="text-xs text-slate-400 hover:text-white transition-colors">Sign in</Link>
          )}
        </div>
      </nav>

      <main className="flex-1 px-4 md:px-8 pt-10 pb-16 max-w-3xl mx-auto w-full">

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-1.5">IPO Tracker</h2>
          <p className="text-slate-500 text-sm">Recent pricings and upcoming IPOs. Click a ticker to pull the full stock card.</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-slate-500 text-sm">
            <div className="w-4 h-4 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
            Loading IPO calendar...
          </div>
        ) : (
          <div className="space-y-8">

            {/* Upcoming */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                Coming Soon
                <span className="text-xs font-normal text-slate-500">next 60 days</span>
              </h3>
              {upcoming.length === 0 ? (
                <div className="bg-slate-900 border border-white/8 rounded-2xl px-5 py-8 text-center">
                  <p className="text-slate-500 text-sm">No upcoming IPOs found.</p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-white/8 rounded-2xl overflow-hidden">
                  {upcoming.map((ipo, i) => (
                    <IpoRow key={i} ipo={ipo} onSymbolClick={handleSymbolClick} />
                  ))}
                </div>
              )}
            </div>

            {/* Recent */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                Recently Priced
                <span className="text-xs font-normal text-slate-500">last 30 days</span>
              </h3>
              {recent.length === 0 ? (
                <div className="bg-slate-900 border border-white/8 rounded-2xl px-5 py-8 text-center">
                  <p className="text-slate-500 text-sm">No recent IPOs found.</p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-white/8 rounded-2xl overflow-hidden">
                  {recent.map((ipo, i) => (
                    <IpoRow key={i} ipo={ipo} onSymbolClick={handleSymbolClick} />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  )
}

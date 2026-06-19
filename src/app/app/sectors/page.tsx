'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { AuthModal } from '@/components/AuthModal'

interface SectorData {
  sector: string
  name: string
  etf: string
  price: number
  change: number
  topStocks: string[]
  thesis: string
  drivers: string[]
  catalyst: string
  outlook: string
}

interface SectorCard {
  sector: string
  name: string
  loading: boolean
  data: SectorData | null
  error: boolean
}

const SECTORS = [
  { key: 'technology',     name: 'Technology' },
  { key: 'healthcare',     name: 'Healthcare' },
  { key: 'financials',     name: 'Financials' },
  { key: 'energy',         name: 'Energy' },
  { key: 'consumer-disc',  name: 'Consumer Disc.' },
  { key: 'industrials',    name: 'Industrials' },
  { key: 'comm-services',  name: 'Comm. Services' },
]

const SECTOR_ICONS: Record<string, string> = {
  technology:      '💻',
  healthcare:      '🏥',
  financials:      '🏦',
  energy:          '⚡',
  'consumer-disc': '🛍️',
  industrials:     '🏭',
  'comm-services': '📡',
}

export default function SectorsPage() {
  const [cards, setCards] = useState<SectorCard[]>(
    SECTORS.map(s => ({ sector: s.key, name: s.name, loading: true, data: null, error: false }))
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const [user, setUser] = useState<User | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  useEffect(() => {
    fetch('/api/sectors/detail')
      .then(r => r.ok ? r.json() : null)
      .then(all => {
        if (!all) {
          setCards(prev => prev.map(c => ({ ...c, loading: false, error: true })))
          return
        }
        setCards(prev => prev.map(c => ({
          ...c,
          loading: false,
          data: all[c.sector] ?? null,
          error: !all[c.sector],
        })))
      })
  }, [])

  const current = cards[activeIndex]

  function prev() { setActiveIndex(i => (i - 1 + SECTORS.length) % SECTORS.length) }
  function next() { setActiveIndex(i => (i + 1) % SECTORS.length) }

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
          <Link href="/app/sectors" className="text-sm text-white font-medium border-b border-emerald-500 pb-0.5">Sectors</Link>
          <Link href="/app/ipos" className="text-sm text-slate-500 hover:text-white transition-colors">IPOs</Link>
          <Link href="/app/calendar" className="text-sm text-slate-500 hover:text-white transition-colors">Calendar</Link>
          <Link href="/app/settings" className="text-sm text-slate-500 hover:text-white transition-colors">Settings</Link>
          {user ? (
            <>
              <span className="text-slate-600 text-xs hidden md:inline">{user.email}</span>
              <button onClick={signOut} className="text-xs text-slate-500 hover:text-white transition-colors">Sign out</button>
            </>
          ) : (
            <button onClick={() => setShowAuth(true)} className="text-xs text-slate-400 hover:text-white transition-colors">Sign in</button>
          )}
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center px-4 md:px-8 pt-10 pb-16">
        <div className="w-full max-w-2xl">

          {/* Page title */}
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-1.5">Sector Thesis</h2>
            <p className="text-slate-500 text-sm">What&apos;s driving each sector, what to watch, and where the top names are.</p>
          </div>

          {/* Sector tabs */}
          <div className="flex gap-1.5 flex-wrap mb-6">
            {SECTORS.map((s, i) => {
              const card = cards[i]
              return (
                <button
                  key={s.key}
                  onClick={() => setActiveIndex(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    i === activeIndex
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900 border-white/8 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span>{SECTOR_ICONS[s.key]}</span>
                  {s.name}
                  {!card.loading && !card.error && (
                    <span className={`w-1.5 h-1.5 rounded-full ml-0.5 ${
                      card.data?.change && card.data.change >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                    }`} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Card + arrows */}
          <div className="flex items-start gap-3">

            {/* Left arrow */}
            <button
              onClick={prev}
              className="mt-6 p-2 rounded-xl bg-slate-900 border border-white/8 text-slate-400 hover:text-white hover:border-white/20 transition-all shrink-0"
            >
              ←
            </button>

            {/* Active card */}
            <div className="flex-1">
              {current.loading ? (
                <div className="bg-slate-900 border border-white/8 rounded-2xl p-6 flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin shrink-0" />
                  <span className="text-slate-400 text-sm">Analyzing {current.name}...</span>
                </div>
              ) : current.error || !current.data ? (
                <div className="bg-slate-900 border border-white/8 rounded-2xl p-5">
                  <p className="text-slate-500 text-sm">Couldn&apos;t load {current.name} data.</p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-white/8 rounded-2xl p-5 md:p-6">
                  {(() => {
                    const d = current.data!

                    return (
                      <>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-5">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{SECTOR_ICONS[d.sector]}</span>
                            <div>
                              <h3 className="text-white font-bold text-xl">{d.name}</h3>
                              <p className="text-slate-500 text-xs mt-0.5">{d.etf} ETF</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0 ml-4">
                            <div className="text-right">
                              <p className="text-white font-bold text-xl">${d.price?.toFixed(2)}</p>
                              <p className={`text-sm font-medium ${d.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {d.change >= 0 ? '+' : ''}{d.change?.toFixed(2)}%
                              </p>
                            </div>
                            {/* Top pick */}
                            {d.topStocks?.[0] && (
                              <button
                                onClick={() => router.push(`/app?t=${d.topStocks[0]}`)}
                                className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-2.5 py-1 hover:bg-emerald-500/20 transition-all"
                              >
                                <span className="text-slate-500 text-xs">Top pick</span>
                                <span className="text-emerald-400 text-xs font-bold">{d.topStocks[0]}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Thesis */}
                        {d.thesis && (
                          <div className="bg-slate-800/40 border border-white/5 rounded-xl p-4 mb-3">
                            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1.5">Thesis</p>
                            <p className="text-slate-200 text-sm leading-relaxed">{d.thesis}</p>
                          </div>
                        )}

                        {/* Drivers */}
                        {d.drivers?.length > 0 && (
                          <div className="bg-slate-800/40 border border-white/5 rounded-xl p-4 mb-3">
                            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">Key Drivers</p>
                            <ul className="space-y-2">
                              {d.drivers.map((driver, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-300 leading-relaxed">
                                  <span className="text-emerald-600 mt-0.5 shrink-0">▸</span>
                                  {driver}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Catalyst + Outlook */}
                        <div className="grid grid-cols-2 gap-2 mb-5">
                          {d.catalyst && (
                            <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3">
                              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1.5">Catalyst</p>
                              <p className="text-slate-300 text-xs leading-relaxed">{d.catalyst}</p>
                            </div>
                          )}
                          {d.outlook && (
                            <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3">
                              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1.5">Watch For</p>
                              <p className="text-slate-300 text-xs leading-relaxed">{d.outlook}</p>
                            </div>
                          )}
                        </div>

                        {/* Top names */}
                        {d.topStocks?.length > 0 && (
                          <div>
                            <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest mb-2">Top Names</p>
                            <div className="flex gap-2 flex-wrap">
                              {d.topStocks.map((ticker) => (
                                <button
                                  key={ticker}
                                  onClick={() => router.push(`/app?t=${ticker}`)}
                                  className="px-3 py-1.5 bg-slate-800 border border-white/8 rounded-lg text-emerald-400 text-xs font-semibold hover:bg-slate-700 hover:border-emerald-500/40 transition-all"
                                >
                                  {ticker}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}

              {/* Dots */}
              <div className="flex justify-center gap-1.5 mt-4">
                {SECTORS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`rounded-full transition-all ${
                      i === activeIndex ? 'w-4 h-1.5 bg-emerald-400' : 'w-1.5 h-1.5 bg-slate-700 hover:bg-slate-500'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Right arrow */}
            <button
              onClick={next}
              className="mt-6 p-2 rounded-xl bg-slate-900 border border-white/8 text-slate-400 hover:text-white hover:border-white/20 transition-all shrink-0"
            >
              →
            </button>

          </div>
        </div>
      </main>

      {showAuth && (
        <AuthModal
          onSuccess={u => { setUser(u); setShowAuth(false) }}
          onClose={() => setShowAuth(false)}
        />
      )}
    </div>
  )
}

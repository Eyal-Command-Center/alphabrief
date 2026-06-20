'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { AuthModal } from '@/components/AuthModal'
import { MobileNav } from '@/components/MobileNav'

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  // Email prefs
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('weekly')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingPrefs, setLoadingPrefs] = useState(true)

  // Pro / alerts
  const [isPro, setIsPro] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [alertTickers, setAlertTickers] = useState<string[]>([])
  const [savedTickers, setSavedTickers] = useState<string[]>([])
  const [savingAlerts, setSavingAlerts] = useState(false)
  const [savedAlerts, setSavedAlerts] = useState(false)

  const searchParams = useSearchParams()
  const justUpgraded = searchParams.get('upgraded') === 'true'

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user) return

    // Read localStorage cache instantly
    try {
      const cached = localStorage.getItem('ab_email_prefs')
      if (cached) {
        const { enabled, frequency: freq, is_pro, alert_tickers } = JSON.parse(cached)
        setEmailEnabled(enabled ?? false)
        setFrequency(freq ?? 'weekly')
        setIsPro(is_pro ?? false)
        setAlertTickers(alert_tickers ?? [])
        setLoadingPrefs(false)
      }
    } catch {}

    // Fetch fresh from API
    fetch('/api/email-prefs').then(r => r.json()).then(data => {
      setEmailEnabled(data.enabled ?? false)
      setFrequency(data.frequency ?? 'weekly')
      setIsPro(data.is_pro ?? false)
      setLoadingPrefs(false)
      try { localStorage.setItem('ab_email_prefs', JSON.stringify(data)) } catch {}
    })

    // Load alert tickers + full saved list — cache for instant display
    try {
      const cachedTickers = localStorage.getItem('ab_alert_tickers')
      if (cachedTickers) {
        const { alert_tickers, tickers } = JSON.parse(cachedTickers)
        setAlertTickers(alert_tickers ?? [])
        setSavedTickers(tickers ?? [])
      }
    } catch {}
    fetch('/api/alert-tickers').then(r => r.json()).then(data => {
      setAlertTickers(data.alert_tickers ?? [])
      setSavedTickers(data.tickers ?? [])
      try { localStorage.setItem('ab_alert_tickers', JSON.stringify(data)) } catch {}
    })
  }, [user])

  async function handleSave() {
    setSaving(true)
    const prefs = { enabled: emailEnabled, frequency }
    await fetch('/api/email-prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    })
    try {
      const cached = localStorage.getItem('ab_email_prefs')
      const prev = cached ? JSON.parse(cached) : {}
      localStorage.setItem('ab_email_prefs', JSON.stringify({ ...prev, ...prefs }))
    } catch {}
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleSaveAlerts() {
    setSavingAlerts(true)
    await fetch('/api/alert-tickers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert_tickers: alertTickers }),
    })
    // Update cache
    try {
      const cached = localStorage.getItem('ab_alert_tickers')
      const prev = cached ? JSON.parse(cached) : {}
      localStorage.setItem('ab_alert_tickers', JSON.stringify({ ...prev, alert_tickers: alertTickers }))
    } catch {}
    setSavingAlerts(false)
    setSavedAlerts(true)
    setTimeout(() => setSavedAlerts(false), 2500)
  }

  function toggleAlertTicker(t: string) {
    setAlertTickers(prev => {
      if (prev.includes(t)) return prev.filter(x => x !== t)
      if (prev.length >= 10) return prev // max 10
      return [...prev, t]
    })
  }

  async function handleUpgrade() {
    setCheckingOut(true)
    const res = await fetch('/api/lemon/checkout', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setCheckingOut(false)
  }

  async function handleCancel() {
    if (!cancelConfirm) { setCancelConfirm(true); return }
    setCancelling(true)
    await fetch('/api/lemon/cancel', { method: 'POST' })
    setIsPro(false)
    setCancelConfirm(false)
    setCancelling(false)
    try {
      const cached = localStorage.getItem('ab_email_prefs')
      const prev = cached ? JSON.parse(cached) : {}
      localStorage.setItem('ab_email_prefs', JSON.stringify({ ...prev, is_pro: false }))
    } catch {}
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <Nav />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm text-center">
            <h2 className="text-xl font-semibold text-white mb-1">Settings</h2>
            <p className="text-slate-500 text-sm mb-6">
              Manage your email reports — get your saved stocks delivered daily or weekly, straight to your inbox.
            </p>
            <button
              onClick={() => setShowAuth(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3 rounded-xl text-sm transition-all"
            >
              Sign in to manage settings
            </button>
          </div>
        </div>
        {showAuth && (
          <AuthModal
            onSuccess={u => { setUser(u); setShowAuth(false) }}
            onClose={() => setShowAuth(false)}
          />
        )}
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Nav />

      <main className="flex-1 px-4 md:px-8 pt-10 pb-24 md:pb-16 max-w-4xl mx-auto w-full">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-1.5">Settings</h2>
            <p className="text-slate-500 text-sm">{user.email}</p>
          </div>
          {isPro && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              ✦ Pro
            </span>
          )}
        </div>

        {/* Upgrade success banner */}
        {justUpgraded && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 mb-6">
            <span className="text-emerald-400 text-lg">✦</span>
            <p className="text-emerald-300 text-sm font-medium">
              Welcome to AlphaBrief Pro! Thesis alerts are now active for your stocks.
            </p>
          </div>
        )}

        {/* Side-by-side on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">

          {/* LEFT — Pro card */}
          {!isPro ? (
            <div className="bg-slate-900 border border-white/8 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Pro</span>
                  <span className="text-slate-500 text-xs">$9 / month</span>
                </div>
                <h3 className="text-white font-semibold text-lg mb-1">Thesis change alerts</h3>
                <p className="text-slate-400 text-sm mb-5">
                  We monitor up to 10 of your stocks daily. The moment a thesis flips, you get an email.
                </p>
                <div className="grid grid-cols-1 gap-2 mb-5">
                  {[
                    { icon: '📡', label: 'Daily monitoring', desc: 'Every trading day, 8am ET' },
                    { icon: '⚡', label: 'Instant alerts', desc: 'Email when thesis flips' },
                    { icon: '🎯', label: 'Up to 10 stocks', desc: 'Your most important holdings' },
                  ].map(f => (
                    <div key={f.label} className="flex items-center gap-3 bg-slate-800/50 border border-white/5 rounded-xl px-3 py-2.5">
                      <span className="text-base">{f.icon}</span>
                      <div>
                        <p className="text-white text-xs font-semibold">{f.label}</p>
                        <p className="text-slate-500 text-xs">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Example alert preview */}
                <div className="bg-slate-800/60 border border-white/5 rounded-xl p-4 mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold text-sm">TSLA thesis changed</span>
                    <span className="text-xs text-slate-500">today</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-700/50 rounded-lg px-2.5 py-1.5">
                      <span className="text-sm">🟢</span>
                      <span className="text-xs text-slate-300">Positive</span>
                    </div>
                    <span className="text-slate-600 text-sm">→</span>
                    <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">
                      <span className="text-sm">🔴</span>
                      <span className="text-xs text-red-300 font-semibold">Negative</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={checkingOut}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-bold px-6 py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  {checkingOut ? (
                    <><span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />Redirecting…</>
                  ) : 'Upgrade to Pro →'}
                </button>
                <p className="text-slate-600 text-xs mt-2 text-center">Cancel anytime. Billed monthly.</p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-6 flex flex-col gap-5">
              {/* Pro status */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-400 text-lg">✦</span>
                  <h3 className="text-white font-semibold">Thesis alerts active</h3>
                </div>
                <p className="text-slate-400 text-sm">
                  Monitoring up to 10 stocks daily. You&apos;ll be emailed the moment a thesis sentiment changes.
                </p>
              </div>

              {/* Stock picker */}
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">
                  Stocks to monitor
                  <span className="text-slate-600 normal-case tracking-normal ml-2 font-normal">
                    ({alertTickers.length}/10 selected)
                  </span>
                </p>
                {savedTickers.length === 0 ? (
                  <p className="text-slate-600 text-xs">Add stocks on the My Stocks page first.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {savedTickers.map(t => {
                      const active = alertTickers.includes(t)
                      const atMax = alertTickers.length >= 10 && !active
                      return (
                        <button
                          key={t}
                          onClick={() => toggleAlertTicker(t)}
                          disabled={atMax}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            active
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : atMax
                              ? 'bg-slate-800/30 border-white/5 text-slate-600 cursor-not-allowed'
                              : 'bg-slate-800/60 border-white/8 text-slate-400 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          {active && <span className="mr-1">✓</span>}{t}
                        </button>
                      )
                    })}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveAlerts}
                    disabled={savingAlerts}
                    className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-xl text-xs transition-all"
                  >
                    {savingAlerts ? 'Saving…' : 'Save selection'}
                  </button>
                  {savedAlerts && <span className="text-emerald-400 text-xs">✓ Saved</span>}
                </div>
              </div>

              {/* Cancel */}
              <div className="border-t border-white/5 pt-4">
                {!cancelConfirm ? (
                  <button
                    onClick={() => setCancelConfirm(true)}
                    className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                  >
                    Cancel subscription
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-slate-400 text-xs">Cancel at end of billing period?</p>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
                    >
                      {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                    </button>
                    <button
                      onClick={() => setCancelConfirm(false)}
                      className="text-xs text-slate-600 hover:text-white transition-colors"
                    >
                      Keep Pro
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RIGHT — Email Reports */}
          <div className="bg-slate-900 border border-white/8 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="text-white font-semibold text-base">Email Reports</h3>
                <p className="text-slate-500 text-sm mt-1">
                  Price & performance for your stocks, delivered to your inbox.
                </p>
              </div>
              {loadingPrefs ? (
                <div className="w-11 h-6 rounded-full bg-slate-700 animate-pulse shrink-0 ml-6 mt-0.5" />
              ) : (
                <button
                  onClick={() => setEmailEnabled(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-6 mt-0.5 ${emailEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              )}
            </div>

            <div className={`mt-5 transition-all ${emailEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Frequency</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setFrequency('daily')}
                  className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all ${
                    frequency === 'daily' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/8 bg-slate-800/50 hover:border-white/20'
                  }`}
                >
                  <p className={`text-sm font-semibold ${frequency === 'daily' ? 'text-emerald-300' : 'text-white'}`}>Daily</p>
                  <p className="text-slate-500 text-xs mt-0.5">Every trading day, 9am ET</p>
                </button>
                <button
                  onClick={() => setFrequency('weekly')}
                  className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all ${
                    frequency === 'weekly' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/8 bg-slate-800/50 hover:border-white/20'
                  }`}
                >
                  <p className={`text-sm font-semibold ${frequency === 'weekly' ? 'text-emerald-300' : 'text-white'}`}>Weekly</p>
                  <p className="text-slate-500 text-xs mt-0.5">Every Monday, 9am ET</p>
                </button>
              </div>

              <div className="mt-4 bg-slate-800/50 border border-white/5 rounded-xl p-4">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">What you&apos;ll receive</p>
                <ul className="space-y-1.5">
                  {[
                    'Current price & daily % change for each of your stocks',
                    'Which of your stocks moved most since last session',
                    'A direct link to open your full AlphaBrief cards',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                      <span className="text-emerald-600 mt-0.5 shrink-0">▸</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || loadingPrefs}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold px-5 py-2 rounded-xl text-sm transition-all"
              >
                {saving ? 'Saving…' : 'Save preferences'}
              </button>
              {saved && <span className="text-emerald-400 text-sm">✓ Saved</span>}
            </div>
          </div>

        </div>

        {/* Sign out */}
        <div className="mt-6">
          <button
            onClick={signOut}
            className="text-sm text-slate-600 hover:text-slate-400 transition-colors"
          >
            Sign out
          </button>
        </div>

      </main>
      <MobileNav />
    </div>
  )
}

function Nav() {
  return (
    <nav className="border-b border-white/5 px-4 md:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="text-emerald-400 text-2xl font-light" style={{ fontFamily: 'Georgia, serif' }}>α</span>
        <span className="text-white font-semibold text-lg tracking-tight">
          Alpha<span className="text-emerald-400">Brief</span>
        </span>
        <span className="ml-1 text-xs text-slate-600 border border-slate-800 rounded px-2 py-0.5 hidden sm:inline">beta</span>
      </div>
      <div className="hidden md:flex items-center gap-4 md:gap-6">
        <Link href="/app" className="text-sm text-slate-500 hover:text-white transition-colors">My Stocks</Link>
        <Link href="/app/sectors" className="text-sm text-slate-500 hover:text-white transition-colors">Sectors</Link>
        <Link href="/app/ipos" className="text-sm text-slate-500 hover:text-white transition-colors">IPOs</Link>
        <Link href="/app/calendar" className="text-sm text-slate-500 hover:text-white transition-colors">Calendar</Link>
        <Link href="/app/settings" className="text-sm text-white font-medium border-b border-emerald-500 pb-0.5">Settings</Link>
      </div>
    </nav>
  )
}

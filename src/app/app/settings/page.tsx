'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { AuthModal } from '@/components/AuthModal'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  const [emailEnabled, setEmailEnabled] = useState(false)
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('weekly')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingPrefs, setLoadingPrefs] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    fetch('/api/email-prefs')
      .then(r => r.json())
      .then(data => {
        setEmailEnabled(data.enabled ?? false)
        setFrequency(data.frequency ?? 'weekly')
        setLoadingPrefs(false)
      })
  }, [user])

  async function handleSave() {
    setSaving(true)
    await fetch('/api/email-prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: emailEnabled, frequency }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
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
        <Nav user={null} onSignOut={signOut} />
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Nav user={user} onSignOut={signOut} />

      <main className="flex-1 px-4 md:px-8 pt-10 pb-16 max-w-2xl mx-auto w-full">

        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-1.5">Settings</h2>
          <p className="text-slate-500 text-sm">{user.email}</p>
        </div>

        {/* Email Reports */}
        <div className="bg-slate-900 border border-white/8 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-white font-semibold text-base">Email Reports</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm">
                Get a snapshot of your saved stocks — current price, daily performance, and key moves — delivered to your inbox.
              </p>
            </div>
            {/* Toggle */}
            <button
              onClick={() => setEmailEnabled(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-6 mt-0.5 ${
                emailEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                emailEnabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Frequency picker — shown when enabled */}
          <div className={`mt-5 transition-all ${emailEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Frequency</p>
            <div className="flex gap-3">
              <button
                onClick={() => setFrequency('daily')}
                className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all ${
                  frequency === 'daily'
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-white/8 bg-slate-800/50 hover:border-white/20'
                }`}
              >
                <p className={`text-sm font-semibold ${frequency === 'daily' ? 'text-emerald-300' : 'text-white'}`}>
                  Daily
                </p>
                <p className="text-slate-500 text-xs mt-0.5">Every trading day, 9am ET</p>
              </button>

              <button
                onClick={() => setFrequency('weekly')}
                className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all ${
                  frequency === 'weekly'
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-white/8 bg-slate-800/50 hover:border-white/20'
                }`}
              >
                <p className={`text-sm font-semibold ${frequency === 'weekly' ? 'text-emerald-300' : 'text-white'}`}>
                  Weekly
                </p>
                <p className="text-slate-500 text-xs mt-0.5">Every Monday, 9am ET</p>
              </button>
            </div>

            {/* What you'll get */}
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

          {/* Save button */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || loadingPrefs}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold px-5 py-2 rounded-xl text-sm transition-all"
            >
              {saving ? 'Saving…' : 'Save preferences'}
            </button>
            {saved && (
              <span className="text-emerald-400 text-sm">✓ Saved</span>
            )}
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
    </div>
  )
}

function Nav({ user, onSignOut }: { user: User | null; onSignOut: () => void }) {
  return (
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
        <Link href="/app/ipos" className="text-sm text-slate-500 hover:text-white transition-colors">IPOs</Link>
        <Link href="/app/calendar" className="text-sm text-slate-500 hover:text-white transition-colors">Calendar</Link>
        <Link href="/app/settings" className="text-sm text-white font-medium border-b border-emerald-500 pb-0.5">Settings</Link>
        {user && (
          <button onClick={onSignOut} className="text-xs text-slate-500 hover:text-white transition-colors">Sign out</button>
        )}
      </div>
    </nav>
  )
}

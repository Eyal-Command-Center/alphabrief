import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AlphaBrief — My Stocks',
  description: 'AI-powered stock briefs. Instant thesis, catalyst, analyst consensus, and news for any ticker.',
  openGraph: {
    title: 'AlphaBrief — Know what moves your portfolio.',
    description: 'AI thesis, upcoming catalysts, analyst consensus, and top news for any stock — in seconds.',
    url: 'https://alphabrief.io/app',
    siteName: 'AlphaBrief',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'AlphaBrief — Know what moves your portfolio.',
    description: 'AI thesis, upcoming catalysts, analyst consensus, and top news for any stock — in seconds.',
  },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <footer className="border-t border-white/5 px-6 py-4 flex items-center justify-center gap-6 mt-auto">
        <a href="/privacy" className="text-slate-700 hover:text-slate-500 text-xs transition-colors">Privacy Policy</a>
        <span className="text-slate-800 text-xs">·</span>
        <a href="/terms" className="text-slate-700 hover:text-slate-500 text-xs transition-colors">Terms of Service</a>
      </footer>
    </>
  )
}

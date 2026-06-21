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
  return children
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'

export default async function SharedBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: brief } = await supabase
    .from('briefs')
    .select('*')
    .eq('id', id)
    .single()

  if (!brief) notFound()

  const date = new Date(brief.created_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* Nav */}
      <nav className="border-b border-slate-800/60 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-emerald-400 text-2xl font-light" style={{ fontFamily: 'Georgia, serif' }}>α</span>
          <span className="text-white font-semibold text-lg tracking-tight">
            Alpha<span className="text-emerald-400">Brief</span>
          </span>
        </Link>
        <Link
          href="/app"
          className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Try it free →
        </Link>
      </nav>

      <main className="flex-1 px-6 pt-12 pb-16 max-w-2xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
            Morning Brief
          </span>
          <span className="text-slate-400 text-xs">{date}</span>
        </div>

        {/* Tickers */}
        <div className="flex flex-wrap gap-2 mb-10">
          {brief.tickers.map((t: string) => (
            <span
              key={t}
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Content */}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: ({ children }) => (
              <h2 className="text-xl font-semibold text-white mt-12 mb-5 pb-4 border-b border-slate-800 first:mt-0 tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-5 bg-emerald-500 rounded-full inline-block shrink-0" />
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mt-6 mb-2">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-slate-300 text-sm leading-7 mb-3">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="text-white font-semibold">{children}</strong>
            ),
            ul: ({ children }) => <ul className="mb-4 space-y-2.5">{children}</ul>,
            li: ({ children }) => (
              <li className="text-slate-300 text-sm leading-relaxed flex gap-3">
                <span className="text-emerald-500 mt-1.5 shrink-0 text-xs">▸</span>
                <span>{children}</span>
              </li>
            ),
            hr: () => <div className="my-10 border-t border-slate-800/60" />,
          }}
        >
          {brief.content}
        </ReactMarkdown>

        {/* CTA */}
        <div className="mt-16 border-t border-slate-800 pt-10 text-center">
          <p className="text-slate-400 text-sm mb-4">Get your own AI-powered morning brief.</p>
          <Link
            href="/"
            className="inline-block bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3 rounded-xl transition-all text-sm"
          >
            Try AlphaBrief free →
          </Link>
        </div>

      </main>
    </div>
  )
}

import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — AlphaBrief',
  description: 'How AlphaBrief collects, uses, and protects your personal information.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="px-6 md:px-12 py-5 flex items-center justify-between border-b border-white/5 max-w-4xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-emerald-400 text-2xl font-light" style={{ fontFamily: 'Georgia, serif' }}>α</span>
          <span className="text-white font-semibold text-lg tracking-tight">
            Alpha<span className="text-emerald-400">Brief</span>
          </span>
        </Link>
        <Link href="/app" className="text-sm text-slate-400 hover:text-white transition-colors">
          Back to app →
        </Link>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 md:px-12 py-16">
        <h1 className="text-3xl font-semibold mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-12">Last updated: June 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">1. Overview</h2>
            <p>
              AlphaBrief (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is a stock research tool operated at alphabrief.io.
              This Privacy Policy explains what data we collect, how we use it, and your rights around it.
              By using AlphaBrief, you agree to the practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">2. Information We Collect</h2>
            <p className="mb-3"><strong className="text-white">Account data.</strong> When you sign up, we collect your email address and, if you use Google Sign-In, your Google profile name and email. This is handled by Supabase Auth.</p>
            <p className="mb-3"><strong className="text-white">Usage data.</strong> We log the tickers you search, your watchlist, and feedback you submit (thumbs up/down on stock briefs). This helps us improve the product.</p>
            <p className="mb-3"><strong className="text-white">Payment data.</strong> If you subscribe to AlphaBrief Pro, your payment is processed by Lemon Squeezy. We do not store credit card numbers. We receive a subscription status and customer ID from Lemon Squeezy.</p>
            <p><strong className="text-white">Device/technical data.</strong> Like most web applications, we receive your IP address, browser type, and referring URL when you access the service. We do not run third-party advertising trackers.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="mb-2">We use your data to:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 mb-3">
              <li>Provide and operate the AlphaBrief service</li>
              <li>Send thesis-change email alerts (Pro users who opt in)</li>
              <li>Send your daily morning brief emails (if enabled)</li>
              <li>Manage your subscription and billing via Lemon Squeezy</li>
              <li>Improve the product based on aggregate usage patterns</li>
              <li>Respond to support requests</li>
            </ul>
            <p>We do not sell your personal data to third parties. We do not use your data to train AI models.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">4. Third-Party Services</h2>
            <p className="mb-3">AlphaBrief integrates with the following third-party services. Each has its own privacy policy:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><strong className="text-slate-300">Supabase</strong> — authentication and database hosting</li>
              <li><strong className="text-slate-300">Finnhub</strong> — stock market data (tickers you search are sent to their API)</li>
              <li><strong className="text-slate-300">Massive.com</strong> — real-time and historical stock price data</li>
              <li><strong className="text-slate-300">Anthropic Claude</strong> — AI-generated stock analysis (ticker and market data is sent; no personal data is sent)</li>
              <li><strong className="text-slate-300">Lemon Squeezy</strong> — subscription billing and payments</li>
              <li><strong className="text-slate-300">Resend</strong> — transactional email delivery</li>
              <li><strong className="text-slate-300">Vercel</strong> — application hosting and edge infrastructure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">5. Data Retention</h2>
            <p>We retain your account and watchlist data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where required by law (e.g., billing records).</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">6. Cookies & Local Storage</h2>
            <p>We use browser localStorage to cache stock card data (for performance) and store your session token. We use Supabase cookies for authentication. We do not use third-party advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">7. Your Rights</h2>
            <p className="mb-3">Depending on your jurisdiction, you may have rights to access, correct, or delete your personal data. To exercise these rights or request account deletion, email us at <a href="mailto:support@alphabrief.io" className="text-emerald-400 hover:underline">support@alphabrief.io</a>.</p>
            <p>If you are in the European Economic Area (EEA), you have rights under GDPR. If you are in California, you have rights under CCPA.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">8. Security</h2>
            <p>We use industry-standard measures including HTTPS encryption, Supabase row-level security, and server-side API key management. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">9. Children</h2>
            <p>AlphaBrief is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such data, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">10. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify you of material changes by email or by a notice in the app. Continued use after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">11. Contact</h2>
            <p>Questions? Email <a href="mailto:support@alphabrief.io" className="text-emerald-400 hover:underline">support@alphabrief.io</a>.</p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 md:px-12 py-5 max-w-4xl mx-auto w-full flex items-center justify-between">
        <span className="text-slate-700 text-xs">© 2026 AlphaBrief</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">Privacy</Link>
          <Link href="/terms" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  )
}

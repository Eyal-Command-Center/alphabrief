import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — AlphaBrief',
  description: 'Terms and conditions for using AlphaBrief.',
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-semibold mb-2">Terms of Service</h1>
        <p className="text-slate-500 text-sm mb-12">Last updated: June 2025</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using AlphaBrief (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree, do not use the Service. These terms apply to all users, including free and paid subscribers.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">2. Description of Service</h2>
            <p>
              AlphaBrief is an AI-powered stock research and monitoring tool. It provides stock summaries, AI-generated
              analysis, analyst consensus data, news aggregation, and portfolio monitoring features. The Service is
              provided for informational purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">3. Not Financial Advice</h2>
            <p className="mb-3">
              <strong className="text-white">AlphaBrief is not a registered investment advisor. Nothing on this platform constitutes financial advice, investment advice, trading advice, or any other type of advice.</strong>
            </p>
            <p className="mb-3">
              The AI-generated summaries, thesis assessments, and analyst data are provided for informational and
              educational purposes only. You should not make investment decisions based solely on information from
              AlphaBrief.
            </p>
            <p>
              Always conduct your own research and consult with a licensed financial advisor before making any
              investment decisions. Past performance is not indicative of future results. Investing involves risk,
              including the possible loss of principal.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">4. User Accounts</h2>
            <p className="mb-3">You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately of any unauthorized use of your account.</p>
            <p>You must provide accurate information when creating your account. You may not impersonate others or create accounts for deceptive purposes.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">5. Free and Pro Plans</h2>
            <p className="mb-3"><strong className="text-white">Free plan.</strong> The free plan provides access to basic stock brief features with usage limits. Free features may change at any time.</p>
            <p className="mb-3"><strong className="text-white">Pro plan.</strong> The Pro plan is a paid subscription that unlocks thesis-change email alerts, expanded watchlist capacity, and other premium features. Pro subscriptions are billed monthly or annually as selected at checkout.</p>
            <p><strong className="text-white">Billing.</strong> Subscription payments are processed by Lemon Squeezy. By subscribing, you authorize recurring charges to your payment method. All prices are in USD unless otherwise stated.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">6. Cancellation and Refunds</h2>
            <p className="mb-3">You may cancel your Pro subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period — you retain Pro access until then.</p>
            <p>We offer refunds at our discretion. If you believe you were charged in error, contact <a href="mailto:support@alphabrief.io" className="text-emerald-400 hover:underline">support@alphabrief.io</a> within 7 days of the charge.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">7. Acceptable Use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Scrape, crawl, or systematically download data from AlphaBrief</li>
              <li>Attempt to reverse-engineer, decompile, or access the Service&apos;s underlying APIs or source code</li>
              <li>Use the Service to distribute misinformation or market manipulation</li>
              <li>Share your account credentials with others</li>
              <li>Use automated tools to access the Service at a rate that disrupts normal operations</li>
              <li>Use the Service for any unlawful purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">8. Data Accuracy</h2>
            <p>
              AlphaBrief aggregates data from third-party providers including Finnhub, Massive.com, and Anthropic&apos;s Claude AI.
              We make reasonable efforts to display accurate information, but we do not guarantee the accuracy,
              completeness, or timeliness of any data. Market data may be delayed. AI-generated analysis may contain errors.
              Use the data at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">9. Intellectual Property</h2>
            <p>The AlphaBrief name, logo, and original content are the property of AlphaBrief. Stock data and news articles are sourced from third parties and subject to their respective licenses. You may not reproduce or redistribute our platform or its AI-generated content without permission.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, AlphaBrief and its operators shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, including loss of profits or
              investment losses, arising out of or relating to your use of the Service. Our total liability shall
              not exceed the amount you paid us in the three months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">11. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied.
              We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">12. Termination</h2>
            <p>We reserve the right to suspend or terminate your account for violations of these Terms, at our discretion. You may terminate your account at any time by contacting us or using account settings.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">13. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Material changes will be communicated by email or in-app notice. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">14. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of Delaware, USA, without regard to its conflict of law provisions. Disputes shall be resolved through binding arbitration or in the courts of Delaware.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">15. Contact</h2>
            <p>Questions about these Terms? Email <a href="mailto:support@alphabrief.io" className="text-emerald-400 hover:underline">support@alphabrief.io</a>.</p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 md:px-12 py-5 max-w-4xl mx-auto w-full flex items-center justify-between">
        <span className="text-slate-700 text-xs">© 2025 AlphaBrief</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">Privacy</Link>
          <Link href="/terms" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  )
}

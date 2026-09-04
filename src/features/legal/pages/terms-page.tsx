import { Link } from 'react-router-dom';
import { LegalPageShell } from '../components/legal-page-shell';

export default function TermsPage() {
  return (
    <LegalPageShell>
      <article className="max-w-3xl space-y-8 leading-relaxed text-white/80">
        <header>
          <h1 className="text-4xl font-bold text-white">Terms and Conditions</h1>
          <p className="mt-2 text-sm text-white/55">Last updated: September 4, 2026</p>
        </header>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">1. Agreement</h2>
          <p>
            These Terms and Conditions (“Terms”) govern use of the Wealth Builder web application at
            app.iamawealthbuilder.com and iamawealthbuilder.com (the “Service”), operated by Wealth
            Builders. By signing in, you agree to these Terms and to our{' '}
            <Link to="/privacy-policy" className="text-[#f5d66a] underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">2. The Service</h2>
          <p>
            Wealth Builder is a business platform for invited associates, mentors, and staff. It
            provides tools for appointments, BPM meetings, events, education, licensing, team
            activity, and related reporting. Features available to you depend on your role and
            account status.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">3. Accounts</h2>
          <p>
            You must keep your login credentials confidential and provide accurate profile
            information. Access may be provisioned, limited, or removed by Wealth Builders
            administrators. You are responsible for activity under your account.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">4. Google Calendar</h2>
          <p>
            Connecting Google Calendar is optional. If you connect it, you authorize Wealth Builder
            to access Google Calendar as described in the Privacy Policy, solely to sync calendars
            and events you enable. You can disconnect at any time in Settings or by revoking access
            in your Google Account. Google’s own terms also apply to your use of Google services.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">5. Acceptable use</h2>
          <p>
            You may use the Service only for lawful Wealth Builder business purposes. You may not
            attempt to access other users’ data without authorization, disrupt the Service, or
            misuse Google API access granted through the app.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">6. Content</h2>
          <p>
            You retain rights to content you submit. You grant Wealth Builders a license to host and
            display that content as needed to operate the Service for you and for other users who
            are meant to see it (for example an appointment shared with a mentor).
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">7. Disclaimer</h2>
          <p>
            The Service is provided “as is.” We do not warrant uninterrupted availability. Calendar
            sync depends on Google’s APIs and on permissions you grant; we are not responsible for
            Google outages or for events you choose not to sync.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">8. Contact</h2>
          <p>
            Questions:{' '}
            <a href="mailto:website@iamawealthbuilder.com" className="text-[#f5d66a] underline">
              website@iamawealthbuilder.com
            </a>
          </p>
        </section>
      </article>
    </LegalPageShell>
  );
}

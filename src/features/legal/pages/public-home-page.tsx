import { Link } from 'react-router-dom';
import { LegalPageShell } from '../components/legal-page-shell';

const FEATURES = [
  {
    title: 'Match Up appointments',
    body: 'Schedule and track training appointments so associates and mentors stay aligned.',
  },
  {
    title: 'BPM meetings',
    body: 'Plan business presentation meetings, manage guests, and keep attendance in one place.',
  },
  {
    title: 'Events and education',
    body: 'Run events, tickets, licensing progress, and training content for the Wealth Builder community.',
  },
  {
    title: 'Google Calendar sync',
    body: 'Optionally connect Google Calendar so appointments, meetings, and events stay in sync with calendars you choose.',
  },
];

export default function PublicHomePage() {
  return (
    <LegalPageShell>
      <section className="max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#f5d66a]">
          Wealth Builder platform
        </p>
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">
          A business operating system for Wealth Builder associates
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-white/80">
          Wealth Builder is a private web application used by Wealth Builders associates, mentors,
          and staff to run the day-to-day of the business: appointments, team activity, events,
          education, licensing, and reporting. It is not a consumer social app. Access is by
          invitation for people who already work with Wealth Builders.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-white/80">
          The purpose of this application is to give those users one place to manage their Wealth
          Builder work and, if they choose, to connect Google Calendar so those same appointments
          and meetings appear on the calendars they already use.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="rounded-xl bg-gradient-to-br from-[rgba(255,215,0,0.95)] to-[rgba(255,215,0,0.75)] px-5 py-3 font-bold text-black"
          >
            Sign in to Wealth Builder
          </Link>
          <Link
            to="/privacy-policy"
            className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white hover:border-[#f5d66a] hover:text-[#f5d66a]"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms-and-conditions"
            className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white hover:border-[#f5d66a] hover:text-[#f5d66a]"
          >
            Terms and Conditions
          </Link>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">What this app does</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
            >
              <h3 className="text-lg font-semibold text-[#f5d66a]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/75">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-2xl border border-[#f5d66a]/30 bg-[#f5d66a]/5 p-6">
        <h2 className="text-2xl font-semibold">Why we ask for Google Calendar access</h2>
        <p className="mt-4 leading-relaxed text-white/80">
          Calendar access is optional. When a signed-in user connects Google from Settings, Wealth
          Builder uses Google Calendar to:
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-white/80">
          <li>List the calendars on that Google account so the user can pick a destination calendar.</li>
          <li>Create a dedicated Wealth Builder calendar if the user asks us to.</li>
          <li>
            Create, update, and remove events that correspond to Match Up appointments, BPM
            meetings, events, and personal items the user has chosen to sync.
          </li>
          <li>Read those calendars so two-way sync and busy/availability stay accurate.</li>
        </ul>
        <p className="mt-4 leading-relaxed text-white/80">
          We do not use Google Calendar data for advertising, and we do not sell it. Users can
          disconnect at any time in Settings or revoke access in their Google Account. Details are
          in our{' '}
          <Link to="/privacy-policy" className="font-semibold text-[#f5d66a] underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}

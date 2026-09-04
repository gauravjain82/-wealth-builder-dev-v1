import { Link } from 'react-router-dom';
import { LegalPageShell } from '../components/legal-page-shell';

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell>
      <article className="max-w-3xl space-y-8 leading-relaxed text-white/80">
        <header>
          <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
          <p className="mt-2 text-sm text-white/55">Last updated: September 4, 2026</p>
        </header>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">1. Who we are</h2>
          <p>
            This Privacy Policy describes how Wealth Builders (“Wealth Builder,” “we,” “us”) collects,
            uses, stores, and shares information in the Wealth Builder web application at{' '}
            <a href="https://app.iamawealthbuilder.com/" className="text-[#f5d66a] underline">
              app.iamawealthbuilder.com
            </a>{' '}
            (also reached from iamawealthbuilder.com).
          </p>
          <p className="mt-3">
            Wealth Builder is a business platform for invited associates, mentors, and staff. It is
            not offered as a public consumer social network.
          </p>
          <p className="mt-3">
            Questions: {' '}
            <a href="mailto:website@iamawealthbuilder.com" className="text-[#f5d66a] underline">
              website@iamawealthbuilder.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">2. What the app does</h2>
          <p>
            Wealth Builder helps users manage Match Up training appointments, BPM (business
            presentation) meetings, events, team activity, education, licensing, files, and related
            reporting. Users may optionally connect a Google account so those appointments and
            meetings can sync with Google Calendar.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">3. Information we collect</h2>
          <h3 className="mb-2 text-lg font-semibold text-[#f5d66a]">Account and profile</h3>
          <p>
            Name, email address, password or session token, phone number, address, profile photo,
            role/plan, and other profile fields the user or an administrator provides (for example
            licensing and team information).
          </p>
          <h3 className="mb-2 mt-4 text-lg font-semibold text-[#f5d66a]">Business activity in the app</h3>
          <p>
            Appointments, guests, event registrations, messages, files, goals, production records,
            and similar content users create or that administrators assign in the platform.
          </p>
          <h3 className="mb-2 mt-4 text-lg font-semibold text-[#f5d66a]">Technical data</h3>
          <p>
            Device and browser information, IP address, cookies or local storage needed to keep you
            signed in, and logs used to operate, secure, and debug the service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">4. Google user data</h2>
          <p>
            Some features ask for permission to access Google user data. We only request that access
            after the user starts the connection, and we only use the data to provide those features.
          </p>

          <h3 className="mb-2 mt-4 text-lg font-semibold text-[#f5d66a]">Google Calendar</h3>
          <p>
            When a user connects Google Calendar from Settings → Calendar Sync, Wealth Builder
            requests Google Calendar access (the Google Calendar API, including the ability to list
            calendars and read/write events). We access, use, and store that data as follows:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-white">Access:</strong> We list calendars on the connected
              Google account. We read events on calendars the user maps for sync. We create, update,
              and delete events that correspond to Wealth Builder Match Up, BPM, Events, and personal
              items the user has enabled. If the user asks us to, we may create a dedicated Wealth
              Builder calendar on that account.
            </li>
            <li>
              <strong className="text-white">Use:</strong> Calendar data is used only to keep the
              user’s Wealth Builder schedule and the selected Google calendars in sync, including
              two-way updates and busy/availability. We do not use Google Calendar data to advertise,
              to train unrelated AI models, or to build marketing profiles.
            </li>
            <li>
              <strong className="text-white">Storage:</strong> We store OAuth tokens so the
              connection can keep working, plus the calendar IDs and sync settings the user chooses.
              Event content needed for sync is stored in our application database in connection with
              the user’s Wealth Builder records.
            </li>
            <li>
              <strong className="text-white">Sharing:</strong> We do not sell Google user data. We do
              not share Google Calendar data with third parties for advertising. We may use
              infrastructure providers (hosting, databases) that process data only to run the app,
              and we send Calendar API requests to Google. Other Wealth Builder users only see
              schedule information that the product already shows inside the app (for example a
              mentor seeing an appointment they are part of), not a dump of the user’s entire Google
              Calendar.
            </li>
          </ul>

          <h3 className="mb-2 mt-4 text-lg font-semibold text-[#f5d66a]">Limited Use</h3>
          <p>
            Wealth Builder’s use of information received from Google APIs adheres to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              className="text-[#f5d66a] underline"
              target="_blank"
              rel="noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. Google user data is used only to provide or
            improve user-facing features of Wealth Builder that are prominent in the requesting
            application.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">5. How we use information</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>To operate accounts, authentication, and the features listed above.</li>
            <li>To sync calendars when the user has connected Google Calendar.</li>
            <li>To communicate about the service, including support and security notices.</li>
            <li>To protect the platform against abuse and to meet legal obligations.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">6. How to disconnect Google and delete data</h2>
          <p>
            Users can disconnect Google Calendar in the app at Settings → Calendar Sync → Disconnect.
            That stops future sync and we stop using the stored Google tokens for that account.
          </p>
          <p className="mt-3">
            Users can also revoke Wealth Builder’s access at{' '}
            <a
              href="https://myaccount.google.com/permissions"
              className="text-[#f5d66a] underline"
              target="_blank"
              rel="noreferrer"
            >
              myaccount.google.com/permissions
            </a>
            .
          </p>
          <p className="mt-3">
            To request deletion of account data or Google user data we still hold, email{' '}
            <a href="mailto:website@iamawealthbuilder.com" className="text-[#f5d66a] underline">
              website@iamawealthbuilder.com
            </a>
            . We will delete or anonymize that data except where we must keep a limited record for
            legal, security, or financial reasons.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">7. Retention</h2>
          <p>
            We keep account and business records for as long as the account is active and as needed
            to operate the platform. Google OAuth tokens are kept only while Calendar Sync remains
            connected. After disconnect or a valid deletion request, we delete or expire those tokens
            and related sync credentials.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">8. Cookies and similar technologies</h2>
          <p>
            We use cookies and browser storage to keep users signed in, remember preferences, and
            protect the session. These are used to run the application, not to sell ads.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">9. Children</h2>
          <p>
            Wealth Builder is a business tool for adult professionals. It is not directed at children
            under 13, and we do not knowingly collect personal information from children.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">10. Changes</h2>
          <p>
            If we change how we use Google user data or other personal information, we will update
            this page and change the “Last updated” date. Material changes to Google data use will
            be reflected here before we expand that use.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-white">11. Contact</h2>
          <p>
            Privacy questions and deletion requests:{' '}
            <a href="mailto:website@iamawealthbuilder.com" className="text-[#f5d66a] underline">
              website@iamawealthbuilder.com
            </a>
          </p>
          <p className="mt-3">
            Related documents:{' '}
            <Link to="/terms-and-conditions" className="text-[#f5d66a] underline">
              Terms and Conditions
            </Link>
            .
          </p>
        </section>
      </article>
    </LegalPageShell>
  );
}

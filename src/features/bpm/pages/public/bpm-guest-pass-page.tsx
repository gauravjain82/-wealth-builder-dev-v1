/**
 * Hosted guest pass — `/bpm/pass/:token`.
 *
 * The page a BPM guest is linked to from their invitation email or text, and the
 * reason the host-to-guest direction works at all: an SMS cannot carry an image
 * and an emailed one is blocked by half the mail clients in use, so the message
 * carries a link and this page renders the code.
 *
 * Reachable with no account — the token in the URL *is* the credential, exactly
 * as it is for the events module's hosted ticket, which this follows.
 *
 * Three deliberate constraints:
 *
 * - **It imports nothing from `features/events` and nothing from the app shell.**
 *   A guest standing outside a venue on one bar of signal should download a page,
 *   not an application. Only `shared/components/qr-code` is pulled in, because one
 *   QR renderer across the app is the point of that module.
 * - **The square encodes the bare token, not this URL.** Every other BPM code does
 *   the same: a code a stranger's camera can act on is a code a photograph of
 *   somebody's screen can act on. The host's own scanner is the only intended
 *   reader.
 * - **There is no "I'm here" button.** Only a host scanning the pass records an
 *   attendance. Self-service arrival on an unauthenticated page is an attendance
 *   anybody holding the link could claim from home, and attendance feeds the
 *   leaderboards.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';

import { QrCode } from '@shared/components/qr-code';
import { publicBpmService } from '../../services/public-bpm-service';
import type { PublicBPMGuestPass } from '../../types';

export default function BpmGuestPassPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [pass, setPass] = useState<PublicBPMGuestPass | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPass(await publicBpmService.getGuestPass(token));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'This pass could not be found. Ask whoever invited you to send it again.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PassShell>
      {loading ? (
        <p className="py-16 text-center text-sm text-slate-600 dark:text-white/70">
          Loading your pass…
        </p>
      ) : error || !pass ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error ?? 'This pass could not be found.'}
        </div>
      ) : (
        <PassCard pass={pass} />
      )}
    </PassShell>
  );
}

/** Page chrome: centred, narrow, and stripped back to nothing when printed. */
function PassShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}

function PassCard({ pass }: { pass: PublicBPMGuestPass }) {
  // CANCELLED and HIDDEN dates never reach this page at all — the server serves
  // no pass for them. ARCHIVED does, and a guest holding a pass into an archived
  // date should be told rather than sent out, so the banner covers whatever is
  // left that is not a date to turn up to.
  const isOver = pass.status === 'COMPLETED' || pass.status === 'ARCHIVED';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900 print:border-0 print:shadow-none">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
          Your pass
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
          {pass.bpm_name}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-white/70">
          {pass.when} ({pass.timezone})
        </p>
        {pass.venue ? (
          <p className="text-sm text-slate-600 dark:text-white/70">{pass.venue}</p>
        ) : null}
      </div>

      {isOver ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-center text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          This event has already taken place.
        </p>
      ) : null}

      <div className="mt-6 flex flex-col items-center">
        <QrCode
          value={pass.token}
          size={240}
          muted={isOver}
          alt={`Check-in code for ${pass.guest_name}`}
          fallbackText="Your code could not be drawn. Show this page at the door instead."
        />
        <p className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
          {pass.guest_name}
        </p>
        {pass.checked_in ? (
          <span className="mt-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-500/15 dark:text-green-200">
            Checked in
          </span>
        ) : (
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-white/60">
            Show this code at the door and someone will check you in.
          </p>
        )}
      </div>

      <dl className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-sm dark:border-white/10">
        {pass.inviter_name ? (
          <DetailRow label="Invited by" value={pass.inviter_name} />
        ) : null}
        {pass.webinar_url ? (
          <div className="flex items-start justify-between gap-4">
            <dt className="shrink-0 text-slate-500 dark:text-white/50">Join online</dt>
            <dd className="break-all text-right font-medium">
              <a
                href={pass.webinar_url}
                className="text-blue-700 underline dark:text-blue-300"
              >
                {pass.webinar_url}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6 flex justify-center print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10"
        >
          Print
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-slate-500 dark:text-white/50">{label}</dt>
      <dd className="text-right font-medium text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

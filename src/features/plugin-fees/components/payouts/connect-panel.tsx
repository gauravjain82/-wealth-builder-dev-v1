/**
 * "Get paid" (P5, contract §7): the SMD's Stripe Connect payout account, on their own
 * statement page above the ledger. `GET me/connect/` → status, balance and what Stripe
 * still needs; the button asks `POST me/connect/onboarding-link/` for a link and
 * redirects there.
 *
 * Stripe returns to `/plugin-fees/statement?connect=return` (finished or left) or
 * `?connect=refresh` (the link expired). On `return` the account is polled every 3 s for
 * up to 30 s until its status differs from the one before the redirect (remembered per
 * tab), the same shape as the `?fee_pay=` return; the parameter is stripped either way.
 * Rendered only for an SMD — `me/connect/` answers anyone else `403 not_eligible`.
 * Screens and states: `docs/plugin-fees/UI.md` §2.5.
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/shared/components';
import { usePageRestored } from '@/hooks/use-page-restored';
import { useToastStore } from '@/store';

import { useCreateConnectOnboardingLink, useMyConnect } from '../../hooks/use-plugin-fees';
import { PluginFeesError } from '../../services/plugin-fees-service';
import { describeError, formatDateTime } from '../../utils/plugin-fees-format';
import {
  connectActionLabel,
  connectStatusWording,
  humanizeRequirements,
} from '../../utils/plugin-fees-payout';
import { SignedAmount } from '../statement/statement-view';
import { StatusBadge } from '../submission-parts';

const POLL_EVERY_MS = 3000;
const POLL_FOR_MS = 30000;

/** The status before the redirect, so the return can tell when Stripe's update lands. */
const STATUS_KEY = 'wb.pf.connectStatusBefore';

function rememberStatus(status: string): void {
  try {
    window.sessionStorage.setItem(STATUS_KEY, status);
  } catch {
    /* storage unavailable — the return polls until the account is enabled instead */
  }
}

function takeStatus(): string | null {
  try {
    const value = window.sessionStorage.getItem(STATUS_KEY);
    window.sessionStorage.removeItem(STATUS_KEY);
    return value;
  } catch {
    return null;
  }
}

const EXPLANATION =
  'Your positive balance is paid quarterly to your bank via Stripe. Stripe collects your bank and tax details (W-9) securely.';

export function ConnectPanel() {
  const { addToast } = useToastStore();
  const [searchParams, setSearchParams] = useSearchParams();
  /** `before` null: nothing remembered — wait for `enabled`. */
  const [poll, setPoll] = useState<{ before: string | null; startedAt: number } | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  usePageRestored(() => setRedirecting(false));
  const handledReturn = useRef<string | null>(null);

  const connect = useMyConnect(true, poll ? POLL_EVERY_MS : false);
  const link = useCreateConnectOnboardingLink();
  const { refetch } = connect;

  // Stripe's return: toast, poll on `return`, and strip the parameter.
  useEffect(() => {
    const result = searchParams.get('connect');
    if (!result) return;
    if (handledReturn.current !== result) {
      handledReturn.current = result;
      const before = takeStatus();
      if (result === 'return') {
        addToast({ type: 'info', message: 'Back from Stripe. Checking your payout account…' });
        setPoll({ before, startedAt: Date.now() });
        void refetch();
      } else if (result === 'refresh') {
        addToast({ type: 'warning', message: 'The link expired — click Finish setup again.' });
      }
    }
    const next = new URLSearchParams(searchParams);
    next.delete('connect');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, addToast, refetch]);

  const status = connect.data?.status;
  useEffect(() => {
    if (poll === null) return undefined;
    const changed = status !== undefined && (poll.before === null ? status === 'enabled' : status !== poll.before);
    if (changed) {
      setPoll(null);
      addToast({
        type: status === 'enabled' ? 'success' : 'info',
        message: `Payout account: ${connectStatusWording(status as string).label}.`,
      });
      return undefined;
    }
    const remaining = Math.max(0, POLL_FOR_MS - (Date.now() - poll.startedAt));
    const timer = window.setTimeout(() => {
      setPoll(null);
      addToast({
        type: 'info',
        message: 'Stripe has not updated your payout account yet. Refresh this page in a minute.',
      });
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [poll, status, addToast]);

  const onSetUp = async () => {
    setRedirecting(true);
    try {
      const { url } = await link.mutateAsync();
      if (!url) throw new Error('Payout setup is unavailable right now.');
      if (status) rememberStatus(status);
      window.location.href = url;
    } catch (error) {
      setRedirecting(false);
      if (error instanceof PluginFeesError && error.code === 'not_eligible') {
        addToast({ type: 'warning', message: 'Only an active SMD can set up payouts.' });
        return;
      }
      if (error instanceof PluginFeesError && error.code === 'stripe_unavailable') {
        addToast({
          type: 'error',
          message: 'Payout setup is temporarily unavailable. Please try again in a few minutes.',
        });
        return;
      }
      addToast({ type: 'error', message: describeError(error, 'Could not open payout setup.') });
    }
  };

  let body;
  if (connect.isLoading) {
    body = <p className="wb-pf-muted">Loading your payout account…</p>;
  } else if (connect.isError || !connect.data) {
    const notEligible = connect.error instanceof PluginFeesError && connect.error.code === 'not_eligible';
    body = (
      <div className="wb-pf-row">
        <span className={notEligible ? 'wb-pf-muted' : 'wb-pf-field-error'} role="alert">
          {notEligible
            ? 'Payouts are for active SMDs.'
            : describeError(connect.error, 'Unable to load your payout account.')}
        </span>
        {notEligible ? null : (
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        )}
      </div>
    );
  } else {
    const data = connect.data;
    const wording = connectStatusWording(data.status);
    const requirements = data.status === 'enabled' ? [] : humanizeRequirements(data.requirements_due ?? []);
    body = (
      <>
        <div className="wb-pf-connect-head">
          <div className="wb-pf-stack" style={{ gap: 6 }}>
            <span className="wb-pf-detail-label">Payout account</span>
            <StatusBadge status={data.status} label={wording.label} tone={wording.tone} />
            <span className="wb-pf-muted">
              {data.updated_at ? `Checked with Stripe ${formatDateTime(data.updated_at)}` : null}
            </span>
          </div>
          <div className="wb-pf-stack" style={{ gap: 6 }}>
            <span className="wb-pf-detail-label">Balance</span>
            <span className="wb-pf-stat-value">
              <SignedAmount cents={data.balance_cents} />
            </span>
          </div>
        </div>
        {requirements.length ? (
          <div className="wb-pf-callout wb-pf-callout--warning">
            <strong>Stripe still needs:</strong>
            <ul className="wb-pf-requirements">
              {requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {poll ? (
          <div className="wb-pf-callout" role="status">
            Waiting for Stripe to update your payout account…
          </div>
        ) : null}
        <div className="wb-pf-row">
          <Button
            type="button"
            variant={data.status === 'enabled' ? 'outline' : 'default'}
            onClick={() => void onSetUp()}
            disabled={redirecting || link.isPending}
          >
            {redirecting ? 'Opening Stripe…' : connectActionLabel(data.status)}
          </Button>
        </div>
      </>
    );
  }

  return (
    <section className="wb-pf-card" aria-labelledby="wb-pf-connect-heading">
      <h2 id="wb-pf-connect-heading" className="wb-pf-subheading">
        Get paid
      </h2>
      <p className="wb-pf-muted" style={{ margin: 0 }}>
        {EXPLANATION}
      </p>
      {body}
    </section>
  );
}

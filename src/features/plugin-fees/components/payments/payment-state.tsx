/**
 * An invoice's P4 payment state: the badge, the sentence under it, and (in detail views)
 * the collection facts. Renders the payload only; wording lives in
 * `utils/plugin-fees-payment.ts`. Screens: `docs/plugin-fees/UI.md` §2.5 and §2.9.
 */

import type { InvoicePaymentState } from '../../types';
import { formatDate, formatDateTime, formatTimestampDate } from '../../utils/plugin-fees-format';
import {
  collectionLabel,
  describeFailure,
  describePayment,
  paidViaLabel,
  type PaymentAudience,
} from '../../utils/plugin-fees-payment';
import { Detail, StatusBadge } from '../submission-parts';

/** "Paid via" with Klarna called out — every Klarna payment is the agent's own choice (D19). */
export function PaidVia({ state }: { state: InvoicePaymentState }) {
  if (!state.paid_via) return <span>—</span>;
  return (
    <span className="wb-pf-row" style={{ gap: 6 }}>
      <span>{paidViaLabel(state.paid_via)}</span>
      {state.paid_via === 'klarna' ? <span className="wb-pf-tag wb-pf-tag--klarna">Klarna</span> : null}
    </span>
  );
}

/** Badge plus headline; `compact` also shows the last failure on one line. */
export function PaymentStateCell({
  state,
  audience,
  showFailure = false,
}: {
  state: InvoicePaymentState;
  audience: PaymentAudience;
  showFailure?: boolean;
}) {
  const description = describePayment(state, audience);
  return (
    <span className="wb-pf-pay-state">
      <StatusBadge status={state.status} label={description.badge} tone={description.tone} />
      {description.headline ? (
        <span
          className={`wb-pf-pay-headline${
            description.tone === 'rejected' ? ' wb-pf-pay-headline--danger' : ''
          }`}
        >
          {description.headline}
        </span>
      ) : null}
      {showFailure && state.last_failure && state.status !== 'paid' ? (
        <span className="wb-pf-pay-failure">{describeFailure(state.last_failure)}</span>
      ) : null}
    </span>
  );
}

/** The collection facts of one invoice, for an expanded row. */
export function PaymentFacts({ state }: { state: InvoicePaymentState }) {
  return (
    <div className="wb-pf-details">
      <Detail label="Collection">{collectionLabel(state.collection)}</Detail>
      {state.collection === 'self_pay' ? <Detail label="Due by">{formatDate(state.due_date)}</Detail> : null}
      <Detail label="Charge attempts">
        {typeof state.attempts === 'number' ? state.attempts.toLocaleString() : '—'}
      </Detail>
      {state.next_retry_on ? <Detail label="Next retry">{formatDate(state.next_retry_on)}</Detail> : null}
      <Detail label="Last failure">
        {state.last_failure ? (
          <>
            {describeFailure(state.last_failure)}
            <span className="wb-pf-muted" style={{ display: 'block', fontWeight: 400 }}>
              {state.last_failure.code} · {formatDateTime(state.last_failure.at)}
            </span>
          </>
        ) : (
          '—'
        )}
      </Detail>
      <Detail label="Paid">{formatTimestampDate(state.paid_at)}</Detail>
      <Detail label="Paid via">
        <PaidVia state={state} />
      </Detail>
    </div>
  );
}

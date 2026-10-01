/**
 * How many of a month's invoices have gone to Stripe — "118 of 120 sent" — with a bar
 * and the pending count. Shared by the payments dashboard and the cycle report.
 */

import type { SendingProgress as SendingProgressData } from '../../types';

export function SendingProgress({ sending }: { sending: SendingProgressData }) {
  const { total, sent, pending } = sending;
  const percent = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;
  return (
    <div className="wb-pf-sending">
      <div className="wb-pf-row" style={{ justifyContent: 'space-between' }}>
        <span className="wb-pf-detail-label">Sending to Stripe</span>
        <span className="wb-pf-detail-value">
          {sent.toLocaleString()} of {total.toLocaleString()} sent
        </span>
      </div>
      <div
        className="wb-pf-progress"
        role="progressbar"
        aria-label="Invoices sent"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={sent}
      >
        <span className="wb-pf-progress-bar" style={{ width: `${percent}%` }} />
      </div>
      <span className={pending > 0 ? 'wb-pf-warn-text' : 'wb-pf-muted'}>
        {total === 0
          ? 'No invoices to send.'
          : pending > 0
            ? `${pending.toLocaleString()} waiting to be sent — this normally finishes within minutes of approval.`
            : 'Every invoice has been sent.'}
      </span>
    </div>
  );
}

/**
 * The body of an office or assistant submission card. Used by the agent's Settings
 * sections and by the Hierarchy Assistant review cards, which add their own header
 * and actions around it.
 */

import type { ReactNode } from 'react';

import type { AssistantSubmission, OfficeSubmission } from '../types';
import { formatDate, formatDateTime } from '../utils/plugin-fees-format';
import { ActionsList, Detail, FileLink, HoursList, StatusBadge } from './submission-parts';

function formatAddress(office: OfficeSubmission): string {
  const street = [office.address_line1, office.address_line2].filter(Boolean).join(', ');
  const locality = [office.city, [office.state, office.zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return [street, locality].filter(Boolean).join(', ') || '—';
}

export function DecisionDetails({
  submission,
  decidedLabel,
}: {
  submission: { decided_at: string | null; decided_by: string | null; decision_note: string };
  decidedLabel: string;
}) {
  if (!submission.decided_at && !submission.decision_note) return null;
  return (
    <>
      <Detail label={decidedLabel}>
        {submission.decided_by || '—'} · {formatDateTime(submission.decided_at)}
      </Detail>
      {submission.decision_note ? <Detail label="Note">{submission.decision_note}</Detail> : null}
    </>
  );
}

export function OfficeSummary({
  office,
  headerExtra,
  showActions = true,
}: {
  office: OfficeSubmission;
  headerExtra?: ReactNode;
  showActions?: boolean;
}) {
  return (
    <div className="wb-pf-card">
      <div className="wb-pf-card-header">
        <div className="wb-pf-row">
          <StatusBadge status={office.status} />
          <span className="wb-pf-muted">Submitted {formatDateTime(office.submitted_at)}</span>
        </div>
        {headerExtra}
      </div>
      <div className="wb-pf-details">
        <Detail label="Address">{formatAddress(office)}</Detail>
        <Detail label="Lease">
          <FileLink file={office.lease} label="Lease" />
        </Detail>
        <Detail label="Photo">
          <FileLink file={office.photo} label="Office photo" />
        </Detail>
        <DecisionDetails submission={office} decidedLabel="Decided by" />
      </div>
      {showActions ? <ActionsList actions={office.actions} /> : null}
    </div>
  );
}

export function AssistantSummary({
  assistant,
  headerExtra,
  showActions = true,
}: {
  assistant: AssistantSubmission;
  headerExtra?: ReactNode;
  showActions?: boolean;
}) {
  return (
    <div className="wb-pf-card">
      <div className="wb-pf-card-header">
        <div className="wb-pf-row">
          <StatusBadge status={assistant.status} />
          {assistant.reverify_open ? (
            <StatusBadge status="reverify" label="Re-verification due" />
          ) : null}
          <span className="wb-pf-muted">Submitted {formatDateTime(assistant.submitted_at)}</span>
        </div>
        {headerExtra}
      </div>
      <div className="wb-pf-details">
        <Detail label="Name">{assistant.name || '—'}</Detail>
        <Detail label="Phone">{assistant.phone || '—'}</Detail>
        <Detail label="Email">{assistant.email || '—'}</Detail>
        <Detail label="Hours">
          <HoursList hours={assistant.hours} />
        </Detail>
        <Detail label="Photo">
          <FileLink file={assistant.photo} label="Assistant photo" />
        </Detail>
        {assistant.verified_at ? (
          <Detail label="Verified">{formatDateTime(assistant.verified_at)}</Detail>
        ) : null}
        {assistant.reverify_due ? (
          <Detail label="Re-verify due">{formatDate(assistant.reverify_due)}</Detail>
        ) : null}
        <DecisionDetails submission={assistant} decidedLabel="Decided by" />
      </div>
      {showActions ? <ActionsList actions={assistant.actions} /> : null}
    </div>
  );
}

/**
 * Small presentational pieces shared by the Settings sections and the review page:
 * status badge, file link / thumbnail, the actions audit list, hours list, history.
 */

import type { ReactNode } from 'react';

import type { AssistantHours, PluginFeesFile, SubmissionAction } from '../types';
import { formatDateTime, humanize, weekdayLabel } from '../utils/plugin-fees-format';

const BADGE_TONE: Record<string, string> = {
  pending: 'pending',
  approved: 'approved',
  verified: 'verified',
  rejected: 'rejected',
  expired: 'expired',
  reverify: 'reverify',
};

/**
 * `tone` overrides the status → colour map, for vocabularies other than submissions
 * (invoices, cycles): `pending` amber, `approved` green, `rejected` red, `info` blue,
 * `neutral` grey.
 */
export function StatusBadge({ status, label, tone: toneOverride }: { status: string; label?: string; tone?: string }) {
  const tone = toneOverride ?? BADGE_TONE[status];
  return (
    <span className={`wb-pf-badge${tone ? ` wb-pf-badge--${tone}` : ''}`}>
      {label ?? humanize(status)}
    </span>
  );
}

/**
 * A stored file. Images render as a thumbnail linking to the full file; anything else
 * (the lease PDF) as a named link. Absent → `—`. The URL is signed and short-lived, so
 * it is used as given and never stored.
 */
export function FileLink({ file, label }: { file?: PluginFeesFile; label: string }) {
  if (!file) return <span>—</span>;
  if (!file.url) return <span title="File link unavailable — refresh to retry">{file.name}</span>;
  const isImage = file.mime.startsWith('image/');
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="wb-pf-link"
      aria-label={`Open ${label}: ${file.name}`}
    >
      {isImage ? <img src={file.url} alt={`${label}: ${file.name}`} className="wb-pf-thumb" /> : file.name}
    </a>
  );
}

export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="wb-pf-detail-label">{label}</span>
      <span className="wb-pf-detail-value">{children}</span>
    </div>
  );
}

/** Who did what and when, including rejection notes. */
export function ActionsList({ actions }: { actions: SubmissionAction[] }) {
  if (!actions.length) return <p className="wb-pf-muted">No actions recorded.</p>;
  return (
    <ul className="wb-pf-actions-list">
      {actions.map((entry, index) => (
        <li key={`${entry.at}-${index}`}>
          <strong>{humanize(entry.action)}</strong> by {entry.actor || 'System'} ·{' '}
          {formatDateTime(entry.at)}
          {entry.note ? <span className="wb-pf-note">“{entry.note}”</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function HoursList({ hours }: { hours: AssistantHours[] }) {
  if (!hours.length) return <span>—</span>;
  return (
    <span>
      {hours.map((row, index) => (
        <span key={`${row.day}-${index}`} style={{ display: 'block' }}>
          {weekdayLabel(row.day)} {row.start}–{row.end}
        </span>
      ))}
    </span>
  );
}

/** Collapsed history of submissions, newest first. */
export function History<T extends { id: number }>({
  items,
  render,
}: {
  items: T[];
  render: (item: T) => ReactNode;
}) {
  if (!items.length) return null;
  return (
    <details className="wb-pf-history">
      <summary>History ({items.length})</summary>
      <div className="wb-pf-stack">
        {items.map((item) => (
          <div key={item.id}>{render(item)}</div>
        ))}
      </div>
    </details>
  );
}

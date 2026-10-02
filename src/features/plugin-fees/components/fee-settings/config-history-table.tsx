/**
 * The change history of the fee schedule and billing settings (`GET config-history/`,
 * newest first, at most 50): when, who, what, the action, old → new per changed field
 * (cents fields as dollars) and the reason.
 */

import type { ConfigHistoryEntry } from '../../types';
import { formatDateTime, humanize } from '../../utils/plugin-fees-format';
import { formatHistoryValue, historyFieldLabel } from '../../utils/plugin-fees-fee-schedule';

const ACTION_LABEL: Record<string, string> = { create: 'Created', update: 'Changed', delete: 'Removed' };
const OBJECT_LABEL: Record<string, string> = { fee: 'Fee', settings: 'Settings' };

function Changes({ entry }: { entry: ConfigHistoryEntry }) {
  const fields = Object.entries(entry.changes ?? {});
  if (!fields.length) return <span className="wb-pf-muted">—</span>;
  return (
    <ul className="wb-pf-stack" style={{ gap: 2, margin: 0, padding: 0, listStyle: 'none' }}>
      {fields.map(([field, change]) => (
        <li key={field}>
          <span className="wb-pf-muted">{historyFieldLabel(field)}:</span>{' '}
          {formatHistoryValue(field, change?.old)} → <strong>{formatHistoryValue(field, change?.new)}</strong>
        </li>
      ))}
    </ul>
  );
}

export function ConfigHistoryTable({ entries }: { entries: ConfigHistoryEntry[] }) {
  if (!entries.length) return <p className="wb-pf-muted">No changes have been recorded.</p>;
  return (
    <div className="wb-pf-table-wrap">
      <table className="wb-pf-table wb-pf-table--dense">
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Who</th>
            <th scope="col">What</th>
            <th scope="col">Action</th>
            <th scope="col">Changes</th>
            <th scope="col">Reason</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{formatDateTime(entry.at)}</td>
              <td>
                {entry.actor_name || '—'}
                {entry.source ? (
                  <span className="wb-pf-muted" style={{ display: 'block' }}>
                    via {entry.source}
                  </span>
                ) : null}
              </td>
              <td>
                <span className="wb-pf-tag">{OBJECT_LABEL[entry.object] ?? humanize(entry.object)}</span>{' '}
                {entry.object_repr || '—'}
              </td>
              <td>{ACTION_LABEL[entry.action] ?? humanize(entry.action)}</td>
              <td>
                <Changes entry={entry} />
              </td>
              <td>{entry.reason ? <span className="wb-pf-note-cell">{entry.reason}</span> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

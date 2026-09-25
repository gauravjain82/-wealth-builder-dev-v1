/**
 * The proof dialog: where one number on a leaderboard came from.
 *
 * It opens **immediately** with a loading state and never waits on the summary
 * request — `UI_CONTRACT.md` is explicit about that, and the reason is that the
 * dialog is the answer to "is this number right", which is exactly the moment a
 * reader will not tolerate a blank screen.
 *
 * Nothing here decides what may be shown. Protected fields arrive already masked, or
 * not at all, so a column whose key is absent from a row renders as a dash. There is
 * deliberately no client-side masking to keep in step with the server's.
 */

import { useEffect, useMemo, useState } from 'react';

import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components/ui/button';
import { useLeaderboardDetail } from '../hooks/use-leaderboards';
import type { DetailRow, LeaderboardSelection } from '../types';
import { SCOPE_LABELS, formatDate, formatValue } from './format';

interface DetailRequest {
  agentId: string;
  agentName: string;
  detailMetric: string;
  metricLabel: string;
}

interface DetailDialogProps {
  request: DetailRequest | null;
  selection: LeaderboardSelection;
  onClose: () => void;
}

/** Keys rendered as dates rather than numbers. */
const DATE_KEYS = new Set(['ama_date', 'effective_date', 'approved_on', 'registered']);

function renderCell(row: DetailRow, key: string): string {
  const value = row[key];
  // Absent means "this viewer may not see it". A dash, not an empty cell that could
  // be read as "there is no client".
  if (value === undefined || value === null) return '—';
  if (DATE_KEYS.has(key)) return formatDate(String(value));
  if (typeof value === 'number') return formatValue(value);
  return String(value);
}

export function DetailDialog({ request, selection, onClose }: DetailDialogProps) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<DetailRow[]>([]);

  // A new subject or metric is a new question: drop the rows loaded for the old one
  // rather than appending to them.
  useEffect(() => {
    setCursor(undefined);
    setAccumulated([]);
  }, [request?.agentId, request?.detailMetric, selection.scope, selection.start, selection.end]);

  const { data, isLoading, isError, error } = useLeaderboardDetail(
    request ? { ...selection, agentId: request.agentId, detailMetric: request.detailMetric, cursor } : null
  );

  useEffect(() => {
    if (!data) return;
    setAccumulated((previous) => (cursor ? [...previous, ...data.rows] : data.rows));
  }, [data, cursor]);

  const subtitle = useMemo(() => {
    if (!request) return '';
    return `${request.agentName} · ${SCOPE_LABELS[selection.scope] ?? selection.scope}`;
  }, [request, selection.scope]);

  const hasMore = Boolean(data?.next_cursor);

  return (
    <Modal
      open={Boolean(request)}
      onClose={onClose}
      title={request ? `${request.metricLabel} — how this was calculated` : ''}
      contentClassName="wb-lb-detail"
    >
      <p className="wb-lb-detail__subtitle">{subtitle}</p>

      {isLoading && !accumulated.length && (
        <p className="wb-lb-detail__state" role="status">
          Loading the source rows…
        </p>
      )}

      {isError && (
        <p className="wb-lb-detail__state wb-lb-detail__state--error" role="alert">
          {(error as Error)?.message || 'Could not load the detail for this figure.'}
        </p>
      )}

      {data?.unavailable_reason && (
        <p className="wb-lb-detail__state wb-lb-detail__state--unavailable" role="status">
          {data.unavailable_reason}
        </p>
      )}

      {data && !data.unavailable_reason && (
        <>
          {data.cards.length > 0 && (
            <div className="wb-lb-detail__cards">
              {data.cards.map((card) => (
                <div key={card.label} className="wb-lb-detail__card">
                  <span className="wb-lb-detail__card-label">{card.label}</span>
                  <span className="wb-lb-detail__card-value">{formatValue(card.value)}</span>
                </div>
              ))}
            </div>
          )}

          {data.formula && <p className="wb-lb-detail__formula">{data.formula}</p>}

          {data.definition?.calculation_text && (
            <details className="wb-lb-detail__definition">
              <summary>How is this calculated?</summary>
              <p>{data.definition.definition_text}</p>
              <p>{data.definition.calculation_text}</p>
              {data.definition.interpretation_text && (
                <p className="wb-lb-detail__caveat">{data.definition.interpretation_text}</p>
              )}
            </details>
          )}

          {accumulated.length === 0 ? (
            <p className="wb-lb-detail__state">Nothing contributed to this figure in the selected period.</p>
          ) : (
            <div className="wb-lb-detail__table-wrap">
              <table className="wb-lb-detail__table">
                <thead>
                  <tr>
                    {data.columns.map((column) => (
                      <th key={column.key} scope="col">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accumulated.map((row, index) => (
                    <tr key={`${index}-${row[data.columns[0]?.key] ?? ''}`}>
                      {data.columns.map((column) => (
                        <td key={column.key}>{renderCell(row, column.key)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="wb-lb-detail__footer">
            <span className="wb-lb-detail__count">
              Showing {accumulated.length} of {data.total_rows}
            </span>
            {hasMore && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCursor(data.next_cursor ?? undefined)}
                disabled={isLoading}
              >
                {isLoading ? 'Loading…' : 'Load more'}
              </Button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

export default DetailDialog;

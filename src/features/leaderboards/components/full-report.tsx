/**
 * The Full Report: four metric columns, each with a gauge and both ranking panels.
 *
 * Layout is 4 / 2 / 1 columns above 1250px, 661–1250px and 660px and below, driven by
 * the stylesheet rather than by JavaScript so printing gets the same result.
 *
 * The month selector stops where the data does. The backend clamps it to the later of
 * January 2026 and the earliest row that exists, so the dropdown can never offer a
 * month that would come back empty.
 *
 * `source` is surfaced as a plain statement, not a warning. Until the reporting
 * pipeline's monthly snapshot job is switched on, every closed month legitimately
 * reads "summed from daily results".
 */

import { useState } from 'react';

import { useFullReport } from '../hooks/use-leaderboards';
import type { LeaderRow, LeaderboardSelection, Scope } from '../types';
import { DetailDialog } from './detail-dialog';
import { LeaderList } from './leader-list';
import { Speedometer } from './speedometer';
import { SOURCE_LABELS, formatMetricValue } from './format';
import '../leaderboards.css';

const MILESTONE_LABELS: Record<string, string> = {
  rr: '1st Recruit',
  rc: '10% Evaluation',
  rbe: 'Register for Convention',
};

interface FullReportProps {
  scope?: Scope;
}

export function FullReport({ scope = 'smd_base' }: FullReportProps) {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [detailRequest, setDetailRequest] = useState<
    { agentId: string; agentName: string; detailMetric: string; metricLabel: string } | null
  >(null);

  const { data, isLoading, isError, error } = useFullReport({ month, scope });

  const selection: LeaderboardSelection = {
    metric: 'points',
    scope,
    rangeKey: 'custom',
    start: data?.start,
    end: data?.end,
  };

  const openDetail = (row: LeaderRow, metricKey: string, metricLabel: string) =>
    setDetailRequest({
      agentId: row.agent_id,
      agentName: row.name || row.agent_id,
      detailMetric: metricKey,
      metricLabel,
    });

  return (
    <section className="wb-lb-report" aria-label="Leaderboard Stats">
      <header className="wb-lb-report__header">
        <h2 className="wb-lb-report__title">Leaderboard Stats</h2>

        {/* Hidden when printing: the printed page states its period as text instead. */}
        <label className="wb-lb-report__month wb-lb-no-print">
          <span>Period</span>
          <select
            value={month ?? ''}
            onChange={(event) => setMonth(event.target.value || undefined)}
          >
            <option value="">Current month to date</option>
            {(data?.available_months ?? []).map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </label>

        <p className="wb-lb-report__period">{data?.period_label}</p>
        <p className="wb-lb-report__status wb-lb-no-print">
          {data ? SOURCE_LABELS[data.source] : 'Loading…'}
        </p>
      </header>

      {isLoading && (
        <p className="wb-lb-report__message" role="status">
          Loading the report…
        </p>
      )}
      {isError && (
        <p className="wb-lb-report__message wb-lb-report__message--error" role="alert">
          {(error as Error)?.message || 'The report is unavailable right now.'}
        </p>
      )}

      {data && (
        <>
          <div className="wb-lb-report__columns">
            {data.metrics.map((column) => (
              <article key={column.key} className="wb-lb-report__column">
                <h3 className="wb-lb-report__column-title">{column.label}</h3>

                <Speedometer
                  value={Number(column.current)}
                  goal={Number(column.goal)}
                  percent={column.percent}
                  label={column.label}
                />

                <div className="wb-lb-report__panels">
                  <LeaderList
                    title="Top 5 SMD Base"
                    rows={column.smd}
                    metric={column.key}
                    reserveSlots
                    compact
                    onSelect={(row) => openDetail(row, column.key, column.label)}
                  />
                  <LeaderList
                    title="Top 5 MD Base"
                    rows={column.md}
                    metric={column.key}
                    reserveSlots
                    compact
                    onSelect={(row) => openDetail(row, column.key, column.label)}
                  />
                </div>

                {column.personal && column.personal.length > 0 && (
                  <div className="wb-lb-report__personal">
                    <h4 className="wb-lb-report__personal-title">Personal {column.label}</h4>
                    <ol className="wb-lb-report__personal-list">
                      {column.personal.map((row) => (
                        <li
                          key={`${column.key}-${row.agent_id}`}
                          className="wb-lb-report__personal-row"
                        >
                          <span className="wb-lb-report__personal-name" title={row.name}>
                            {row.name || row.agent_id}
                            {row.agent_id && (
                              <span className="wb-lb-report__personal-code"> ({row.agent_id})</span>
                            )}
                          </span>
                          <span className="wb-lb-report__personal-value">
                            {formatMetricValue(column.key, row.value)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </article>
            ))}
          </div>

          <section className="wb-lb-report__milestones" aria-label="First milestones">
            <h3>First milestones</h3>
            <ul>
              {data.milestones.map((milestone) => (
                <li key={milestone.key}>
                  <span className="wb-lb-report__milestone-label">
                    {MILESTONE_LABELS[milestone.key] ?? milestone.key}
                  </span>
                  {milestone.available ? (
                    <span className="wb-lb-report__milestone-value">
                      {milestone.completed} of {milestone.population}
                      {milestone.ratio !== null && ` · ${milestone.ratio}%`}
                    </span>
                  ) : (
                    // Never a zero: no recorded date is not the same as nobody
                    // completing the milestone.
                    <span
                      className="wb-lb-report__milestone-value wb-lb-report__milestone-value--unavailable"
                      title={milestone.reason}
                    >
                      No data recorded for this period
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <DetailDialog
        request={detailRequest}
        selection={selection}
        onClose={() => setDetailRequest(null)}
      />
    </section>
  );
}

export default FullReport;

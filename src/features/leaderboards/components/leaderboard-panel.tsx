/**
 * The expanded standard leaderboard: filters, metric tabs and both Top-5 panels.
 *
 * Two contract behaviours worth reading the code for:
 *
 * - **Draft dates do nothing until Apply.** Typing in the start or end field changes
 *   a draft, not the query. Without that, a half-typed date fires a request for a
 *   range nobody asked for and the results flicker through nonsense.
 * - **Milestone mode is shown, not chosen.** `UI_CONTRACT.md` forbids a per-view
 *   control for it; it is a Settings decision, because two people comparing screens
 *   would otherwise be comparing different populations.
 *
 * Scope options come from the server's `visible_scopes`, so Net Base appears only
 * where it has been switched on — and the backend refuses it regardless.
 */

import { useEffect, useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { useLeaderboard } from '../hooks/use-leaderboards';
import type {
  LeaderRow,
  LeaderboardMetric,
  LeaderboardSelection,
  Scope,
  StatsMode,
} from '../types';
import { DetailDialog } from './detail-dialog';
import { LeaderList } from './leader-list';
import { RATIO_LABELS, RATIO_METRICS, SCOPE_LABELS, SOURCE_LABELS, formatMetricValue } from './format';
import '../leaderboards.css';

/** Metrics that have a proof view. The ratios are derived, so they have none. */
const DETAILABLE = new Set(['recruits', 'points', 'licenses', 'convention']);

const MEASUREMENT_MODE_LABELS: Record<string, string> = {
  new_recruit_cohort: 'people recruited in the period',
  milestones_completed: 'people recruited in, or completing in, the period',
};

interface LeaderboardPanelProps {
  initialMetric?: LeaderboardMetric;
  initialScope?: Scope;
  /** Navigate to the Full Report. Omit to hide the action. */
  onOpenFullReport?: () => void;
}

export function LeaderboardPanel({
  initialMetric = 'points',
  initialScope = 'smd_base',
  onOpenFullReport,
}: LeaderboardPanelProps) {
  const [mode, setMode] = useState<StatsMode>('general');
  const [metric, setMetric] = useState<LeaderboardMetric>(initialMetric);
  const [scope, setScope] = useState<Scope>(initialScope);
  const [rangeKey, setRangeKey] = useState('current');

  // Draft dates are kept apart from the applied ones on purpose — see the module docstring.
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [applied, setApplied] = useState<{ start?: string; end?: string }>({});

  const [detailRequest, setDetailRequest] = useState<
    { agentId: string; agentName: string; detailMetric: string; metricLabel: string } | null
  >(null);

  const selection: LeaderboardSelection = { metric, scope, rangeKey, ...applied };
  const { data, isLoading, isError, error } = useLeaderboard(selection);

  // Switching tabs must not leave a ratio selected on the General tab, or the
  // request would ask for a metric the tab cannot display.
  useEffect(() => {
    if (mode === 'ratios' && !RATIO_METRICS.has(metric)) setMetric('npr');
    if (mode === 'general' && RATIO_METRICS.has(metric)) setMetric('points');
  }, [mode, metric]);

  const applyCustomRange = () => {
    if (!draftStart || !draftEnd) return;
    setApplied({ start: draftStart, end: draftEnd });
    setRangeKey('custom');
  };

  const selectNamedRange = (key: string) => {
    setRangeKey(key);
    setApplied({});
  };

  const openDetail = (row: LeaderRow) => {
    if (!DETAILABLE.has(metric)) return;
    setDetailRequest({
      agentId: row.agent_id,
      agentName: row.name || row.agent_id,
      detailMetric: metric,
      metricLabel: metricLabel(metric, data?.general_metrics),
    });
  };

  return (
    <section className="wb-lb-expanded" aria-label="Wealth Builders Leaderboards">
      <header className="wb-lb-expanded__header">
        <div>
          <h2 className="wb-lb-expanded__title">Wealth Builders Leaderboards</h2>
          <p className="wb-lb-expanded__status">
            {data ? `${data.period_label} · ${SOURCE_LABELS[data.source]}` : 'Loading…'}
          </p>
        </div>
        {onOpenFullReport && (
          <Button type="button" variant="outline" onClick={onOpenFullReport}>
            Full Report
          </Button>
        )}
      </header>

      <div className="wb-lb-expanded__controls">
        <div className="wb-lb-expanded__control-group" role="group" aria-label="Date range">
          {(data?.visible_ranges ?? [{ key: 'current', label: 'This Month' }]).map((range) => (
            <Button
              key={range.key}
              type="button"
              variant={rangeKey === range.key && !applied.start ? 'default' : 'outline'}
              onClick={() => selectNamedRange(range.key)}
            >
              {range.label}
            </Button>
          ))}
        </div>

        <div className="wb-lb-expanded__control-group wb-lb-expanded__dates">
          <label className="wb-lb-expanded__field">
            <span>From</span>
            <input
              type="date"
              value={draftStart}
              onChange={(event) => setDraftStart(event.target.value)}
            />
          </label>
          <label className="wb-lb-expanded__field">
            <span>To</span>
            <input
              type="date"
              value={draftEnd}
              onChange={(event) => setDraftEnd(event.target.value)}
            />
          </label>
          <Button type="button" onClick={applyCustomRange} disabled={!draftStart || !draftEnd}>
            Apply
          </Button>
        </div>

        <div className="wb-lb-expanded__control-group" role="group" aria-label="Statistics mode">
          <Button
            type="button"
            variant={mode === 'general' ? 'default' : 'outline'}
            onClick={() => setMode('general')}
          >
            General Stats
          </Button>
          <Button
            type="button"
            variant={mode === 'ratios' ? 'default' : 'outline'}
            onClick={() => setMode('ratios')}
          >
            Ratio Stats
          </Button>
        </div>

        <label className="wb-lb-expanded__field">
          <span>Scope</span>
          <select value={scope} onChange={(event) => setScope(event.target.value as Scope)}>
            {(data?.visible_scopes ?? ['smd_base']).map((option) => (
              <option key={option} value={option}>
                {SCOPE_LABELS[option] ?? option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="wb-lb-expanded__metrics" role="tablist" aria-label="Metric">
        {(mode === 'general'
          ? (data?.general_metrics ?? []).map((item) => ({ key: item.key, label: item.label }))
          : (data?.ratio_metrics ?? []).map((key) => ({ key, label: RATIO_LABELS[key] ?? key }))
        ).map((item) => (
          <Button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={metric === item.key}
            variant={metric === item.key ? 'default' : 'outline'}
            onClick={() => setMetric(item.key as LeaderboardMetric)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {isLoading && (
        <p className="wb-lb-expanded__message" role="status">
          Loading leaderboard…
        </p>
      )}
      {isError && (
        <p className="wb-lb-expanded__message wb-lb-expanded__message--error" role="alert">
          {(error as Error)?.message || 'The leaderboard is unavailable right now.'}
        </p>
      )}

      {data && (
        <>
          <div className="wb-lb-expanded__panels">
            <LeaderList
              title="Top 5 SMD"
              rows={data.smd}
              metric={metric}
              onSelect={DETAILABLE.has(metric) ? openDetail : undefined}
            />
            <LeaderList
              title="Top 5 MD"
              rows={data.md}
              metric={metric}
              onSelect={DETAILABLE.has(metric) ? openDetail : undefined}
            />
          </div>

          <aside className="wb-lb-expanded__viewer">
            <h3>Your {SCOPE_LABELS[data.scope] ?? data.scope}</h3>
            <dl>
              {data.general_metrics.map((item) => (
                <div key={item.key}>
                  <dt>{item.label}</dt>
                  <dd>{formatMetricValue(item.key, data.viewer.totals[item.key])}</dd>
                </div>
              ))}
            </dl>
            <p className="wb-lb-expanded__viewer-meta">
              {data.viewer.member_count} people in scope
              {data.viewer.uncoded_member_count > 0 && (
                <>
                  {' · '}
                  <span title="Agents without an agency code are not represented in the reporting tables.">
                    {data.viewer.uncoded_member_count} without an agency code
                  </span>
                </>
              )}
            </p>
          </aside>

          <p className="wb-lb-expanded__note">
            Milestone ratios count {MEASUREMENT_MODE_LABELS[data.measurement_mode]}. This is set
            in Settings, not here, so everyone compares the same population.
          </p>
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

/** The human label for a metric key, falling back to the ratio table. */
function metricLabel(
  metric: LeaderboardMetric,
  generalMetrics?: Array<{ key: string; label: string }>
): string {
  const general = generalMetrics?.find((item) => item.key === metric);
  return general?.label ?? RATIO_LABELS[metric] ?? metric;
}

export default LeaderboardPanel;

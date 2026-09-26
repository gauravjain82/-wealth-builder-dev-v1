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
import { HelpAction } from '@/features/gms';
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
import { GENERAL_METRIC_LABELS, RATIO_LABELS, RATIO_METRICS, SCOPE_LABELS } from './format';
import '../leaderboards.css';

/** Metrics that have a proof view. The ratios are derived, so they have none. */
const DETAILABLE = new Set(['recruits', 'points', 'licenses', 'convention']);

/**
 * The first-milestone metric keys. The API already returns these inside
 * `general_metrics`, so they are not added here — this set only tells the tab row
 * where to break: the milestones go on their own second line.
 */
const MILESTONE_KEYS = new Set<string>(['rr', 'rc', 'rbe']);

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

  // The API returns the milestone metrics inside `general_metrics`; we only split them
  // out so they land on their own row rather than trailing the additive metrics.
  const generalTabs = (data?.general_metrics ?? []).map((item) => ({
    key: item.key as LeaderboardMetric,
    label: GENERAL_METRIC_LABELS[item.key] ?? item.label,
  }));
  const additiveTabs = generalTabs.filter((tab) => !MILESTONE_KEYS.has(tab.key));
  const milestoneTabs = generalTabs.filter((tab) => MILESTONE_KEYS.has(tab.key));
  const ratioTabs = (data?.ratio_metrics ?? []).map((key) => ({
    key: key as LeaderboardMetric,
    label: RATIO_LABELS[key] ?? key,
  }));

  const renderTab = (item: { key: LeaderboardMetric; label: string }) => (
    <Button
      key={item.key}
      type="button"
      role="tab"
      aria-selected={metric === item.key}
      variant={metric === item.key ? 'default' : 'outline'}
      onClick={() => setMetric(item.key)}
    >
      {item.label}
    </Button>
  );

  return (
    <section className="wb-lb-expanded" aria-label="Wealth Builders Leaderboards">
      <header className="wb-lb-expanded__header">
        <h2 className="wb-lb-expanded__title">Wealth Builders Leaderboards</h2>
        <div className="wb-lb-expanded__status-group">
          <span className="wb-lb-expanded__dot" aria-hidden="true" />
          <span className="wb-lb-expanded__status">
            {data ? `${data.start} through ${data.end}` : 'Loading…'}
          </span>
          <HelpAction toolKey="leaderboards" />
        </div>
      </header>

      <div className="wb-lb-expanded__controls">
        <div className="wb-lb-expanded__controls-col">
          <label className="wb-lb-expanded__field">
            <span className="sr-only">Date range</span>
            <select
              className="wb-lb-expanded__range-select"
              value={applied.start ? 'custom' : rangeKey}
              onChange={(event) => {
                if (event.target.value !== 'custom') selectNamedRange(event.target.value);
              }}
            >
              {(data?.visible_ranges ?? [{ key: 'current', label: 'Current month' }]).map(
                (range) => (
                  <option key={range.key} value={range.key}>
                    {range.label}
                  </option>
                )
              )}
              {applied.start && <option value="custom">Custom range</option>}
            </select>
          </label>

          <div className="wb-lb-expanded__dates">
            <label className="wb-lb-expanded__field">
              <span>Start</span>
              <input
                type="date"
                value={draftStart}
                onChange={(event) => setDraftStart(event.target.value)}
              />
            </label>
            <label className="wb-lb-expanded__field">
              <span>End</span>
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
        </div>

        <div className="wb-lb-expanded__controls-col wb-lb-expanded__controls-col--right">
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

          <div className="wb-lb-expanded__control-group" role="group" aria-label="Scope">
            {(data?.visible_scopes ?? (['smd_base'] as Scope[])).map((option) => (
              <Button
                key={option}
                type="button"
                variant={scope === option ? 'default' : 'outline'}
                onClick={() => setScope(option)}
              >
                {SCOPE_LABELS[option] ?? option}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="wb-lb-expanded__metrics" role="tablist" aria-label="Metric">
        {mode === 'general' ? (
          <>
            <div className="wb-lb-expanded__metrics-row">{additiveTabs.map(renderTab)}</div>
            {milestoneTabs.length > 0 && (
              <div className="wb-lb-expanded__metrics-row">{milestoneTabs.map(renderTab)}</div>
            )}
          </>
        ) : (
          <div className="wb-lb-expanded__metrics-row">{ratioTabs.map(renderTab)}</div>
        )}
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

          {onOpenFullReport && (
            <footer className="wb-lb-expanded__footer">
              <Button type="button" onClick={onOpenFullReport}>
                Full Report
              </Button>
            </footer>
          )}
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

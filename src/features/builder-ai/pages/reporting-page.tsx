/**
 * BuilderReportingPage — trend & compare analytics over history (Decision 10:
 * Reporting is Phase 2, powered by the same `/timeseries` + `/breakdown`
 * endpoints; there is no separate analytics API).
 *
 * The user picks a metric and a segment; the page composes the trend, the
 * BaseShop-vs-Company comparison, and the status composition for that metric by
 * feeding synthetic widget payloads to the same chart widgets used on dashboards
 * (reuse, not duplication — Decision 24 DRY).
 */

import { useMemo, useState } from 'react';
import { Card, LoadingState, Select } from '@shared/components';
import { useDashboard, useLeaderboards, useRoster } from '../hooks/use-builder-ai';
import { SegmentControl, DEFAULT_SEGMENT_OPTIONS } from '../components/segment-control';
import { TrendWidget } from '../components/widgets/trend-widget';
import { CompareWidget } from '../components/widgets/compare-widget';
import { CompositionWidget } from '../components/widgets/composition-widget';
import { RankingWidget } from '../components/widgets/ranking-widget';
import type { DashboardScope, MetricRef, WidgetPayload } from '../types';

/** Build a widget payload that drives a leaderboard-mode RankingWidget by code. */
function leaderboardWidget(code: string, title: string): WidgetPayload {
  return { type: 'ranking', title, scope: 'superteam', config: { leaderboard: code }, color_rule: {}, order: 0 };
}

/** Build a minimal widget payload wrapping a metric for the chart widgets. */
function widgetFor(metric: MetricRef, type: string, scope: DashboardScope, title: string): WidgetPayload {
  return {
    type,
    title,
    scope,
    config: {},
    color_rule: {},
    order: 0,
    metric,
  };
}

/** Render the Reporting analytics page. */
export default function BuilderReportingPage() {
  const [scope, setScope] = useState<DashboardScope>('superteam');
  const [metricCode, setMetricCode] = useState<string>('');

  // The roster payload advertises the program's configured metrics — reuse it as
  // the metric catalogue so we never hardcode BDC metric codes (Decision 16/28).
  const roster = useRoster(scope, '');
  const metrics = useMemo<MetricRef[]>(() => roster.data?.metrics ?? [], [roster.data]);
  const selected = metrics.find((m) => m.code === metricCode) ?? metrics[0];

  // Reuse the dashboard's role-gated, program-labelled segment tiers for the toggle
  // (Decision 31) rather than hardcoding them here.
  const dashboard = useDashboard(scope);
  const segments = dashboard.data?.segments ?? DEFAULT_SEGMENT_OPTIONS;

  // Phase 5 leaderboards (named ranked top-N). Each RankingWidget self-fetches its
  // rows by code — the definition already encodes metric/scope/order/limit.
  const leaderboards = useLeaderboards();

  if (roster.isLoading && metrics.length === 0) {
    return <LoadingState pageHeading="Reporting" title="Loading metrics" description="Fetching…" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reporting</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-white/60">
            Trend and compare metrics over history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            variant="surface"
            value={selected?.code ?? ''}
            onChange={(event) => setMetricCode(event.target.value)}
            className="w-44"
          >
            {metrics.map((metric) => (
              <option key={metric.code} value={metric.code}>
                {metric.name}
              </option>
            ))}
          </Select>
          <SegmentControl value={scope} onChange={setScope} segments={segments} />
        </div>
      </div>

      {!selected ? (
        <Card className="p-8 text-center text-sm text-slate-500 dark:text-white/60">
          No metrics are configured for this program yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="xl:col-span-2">
            <TrendWidget widget={widgetFor(selected, 'trend', scope, `${selected.name} over time`)} scope={scope} />
          </div>
          <CompareWidget widget={widgetFor(selected, 'compare', scope, `${selected.name}: BaseShop vs Company`)} />
          <CompositionWidget
            widget={widgetFor(selected, 'composition', scope, `${selected.name} by status`)}
            scope={scope}
          />
        </div>
      )}

      {(leaderboards.data?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Leaderboards</h2>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {leaderboards.data!.map((board) => (
              <RankingWidget
                key={board.code}
                widget={leaderboardWidget(board.code, board.name)}
                scope={scope}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

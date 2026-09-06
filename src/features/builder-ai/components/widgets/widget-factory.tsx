/**
 * WidgetFactory — maps a widget's `type` to its renderer (Decision 29 OCP).
 *
 * Adding a new widget type is a new component + one entry here, never an edit to
 * a growing `if/else` inside a page. Stat/ring widgets render straight from the
 * dashboard payload; chart widgets fetch their own series by metric code + scope.
 *
 * `roster` is intentionally not handled here — the roster is a page-level widget
 * that needs its own search state, so pages render `<RosterList>` directly.
 */

import { GoalKpiCard } from '../goal-kpi-card';
import { ProgressRingWidget } from './progress-ring-widget';
import { TrendWidget } from './trend-widget';
import { CompositionWidget } from './composition-widget';
import { RankingWidget } from './ranking-widget';
import { CompareWidget } from './compare-widget';
import type { DashboardScope, WidgetPayload } from '../../types';

export interface WidgetFactoryProps {
  widget: WidgetPayload;
  scope: DashboardScope;
}

/** Render the component registered for `widget.type` (falls back to a stat card). */
export function WidgetFactory({ widget, scope }: WidgetFactoryProps) {
  switch (widget.type) {
    case 'stat_sparkline':
      return <GoalKpiCard widget={widget} />;
    case 'progress_ring':
      return <ProgressRingWidget widget={widget} />;
    case 'trend':
      return <TrendWidget widget={widget} scope={scope} />;
    case 'composition':
      return <CompositionWidget widget={widget} scope={scope} />;
    case 'ranking':
      return <RankingWidget widget={widget} scope={scope} />;
    case 'compare':
      return <CompareWidget widget={widget} />;
    case 'roster':
      // Roster is rendered at page level (needs search state); skip here.
      return null;
    default:
      // Unknown / not-yet-built types degrade to a stat card when a metric exists.
      return widget.metric ? <GoalKpiCard widget={widget} /> : null;
  }
}

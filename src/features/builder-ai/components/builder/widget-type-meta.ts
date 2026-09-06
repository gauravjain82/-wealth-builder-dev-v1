/**
 * Widget-type + segment metadata for the dashboard builder pickers.
 *
 * This is the single place that describes each renderer type to the editor (label,
 * icon, whether it needs a metric). Adding a widget type is a new entry here plus a
 * WidgetFactory registration — never an `if/else` in the editor (Decision 29 OCP).
 */

import {
  BarChart3,
  CalendarDays,
  Columns3,
  Gauge,
  LayoutGrid,
  ListOrdered,
  Network,
  PieChart,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Segment, WidgetType } from '../../types';

/** Descriptive metadata for one widget renderer type. */
export interface WidgetTypeMeta {
  type: WidgetType;
  label: string;
  icon: LucideIcon;
  /** Whether this widget must be bound to a metric (roster reads many via config). */
  needsMetric: boolean;
}

/** Ordered catalogue of widget types the builder can place. */
export const WIDGET_TYPES: WidgetTypeMeta[] = [
  { type: 'stat_sparkline', label: 'Stat + sparkline', icon: BarChart3, needsMetric: true },
  { type: 'progress_ring', label: 'Progress ring', icon: Gauge, needsMetric: true },
  { type: 'trend', label: 'Trend', icon: TrendingUp, needsMetric: true },
  { type: 'composition', label: 'Composition', icon: PieChart, needsMetric: true },
  { type: 'ranking', label: 'Ranking', icon: ListOrdered, needsMetric: true },
  { type: 'compare', label: 'Compare', icon: Columns3, needsMetric: true },
  { type: 'org_heat', label: 'Org heat tree', icon: Network, needsMetric: false },
  { type: 'heatmap', label: 'Activity heatmap', icon: CalendarDays, needsMetric: true },
  { type: 'roster', label: 'Builder roster', icon: Users, needsMetric: false },
];

/** Look up a widget type's metadata, falling back to a generic entry. */
export function widgetTypeMeta(type: WidgetType | string): WidgetTypeMeta {
  return (
    WIDGET_TYPES.find((w) => w.type === type) ?? {
      type: type as WidgetType,
      label: type,
      icon: LayoutGrid,
      needsMetric: false,
    }
  );
}

/** The builder segments a widget/section may target (Decisions 15/31). */
export const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'TEAM', label: 'Team' },
  { value: 'BASESHOP', label: 'BaseShop' },
  { value: 'SUPERBASE', label: 'SuperBase' },
  { value: 'SUPERTEAM', label: 'SuperTeam' },
  { value: 'ROLE', label: 'Role (rank band)' },
];

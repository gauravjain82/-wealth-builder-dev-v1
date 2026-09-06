/**
 * Builder AI — visual theme map.
 *
 * The single place that maps domain meaning (membership status, rank/level,
 * goal attainment, per-metric identity) to colours, so every widget paints
 * consistently (Decision 27 — data-as-visual; Decision 24 — one seam per concern).
 *
 * recharts needs concrete colour strings (hex/hsl), not Tailwind classes, so each
 * entry exposes a `hex` for SVG fills and, where relevant, a Badge `variant` and
 * Tailwind text/bg classes for DOM elements.
 */

import type { BadgeProps } from '@shared/components';
import type { AIReviewStatus, BuilderStatus } from './types';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

/** Label + Badge variant + dot class for an AI review status (Phase 7). */
export interface AIReviewStatusStyle {
  label: string;
  badge: BadgeVariant;
  dot: string;
}

const AI_REVIEW_STATUS_STYLES: Record<AIReviewStatus, AIReviewStatusStyle> = {
  PENDING: { label: 'Queued', badge: 'secondary', dot: 'bg-violet-400' },
  RUNNING: { label: 'Reviewing…', badge: 'info', dot: 'bg-blue-500' },
  COMPLETED: { label: 'Completed', badge: 'success', dot: 'bg-green-500' },
  FAILED: { label: 'Failed', badge: 'destructive', dot: 'bg-red-500' },
};

/** Resolve the visual style for an AI review status. */
export function aiReviewStatusStyle(status: AIReviewStatus | string): AIReviewStatusStyle {
  return AI_REVIEW_STATUS_STYLES[status as AIReviewStatus] ?? AI_REVIEW_STATUS_STYLES.PENDING;
}

/** Colour + label + Badge variant for a membership status (marathon split). */
export interface StatusStyle {
  label: string;
  hex: string;
  badge: BadgeVariant;
  /** Tailwind classes for a coloured dot / pill. */
  dot: string;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  ACTIVE: { label: 'Active', hex: '#3b82f6', badge: 'info', dot: 'bg-blue-500' },
  COMPLETED: { label: 'Completed', hex: '#22c55e', badge: 'success', dot: 'bg-green-500' },
  REMOVED: { label: 'Removed', hex: '#ef4444', badge: 'destructive', dot: 'bg-red-500' },
  TERMINATED: { label: 'Removed', hex: '#ef4444', badge: 'destructive', dot: 'bg-red-500' },
  INVITED: { label: 'Invited', hex: '#a78bfa', badge: 'secondary', dot: 'bg-violet-400' },
  SUSPENDED: { label: 'Suspended', hex: '#eab308', badge: 'warning', dot: 'bg-yellow-500' },
};

const STATUS_FALLBACK: StatusStyle = {
  label: 'Unknown',
  hex: '#94a3b8',
  badge: 'secondary',
  dot: 'bg-slate-400',
};

/** Resolve the visual style for a builder status. */
export function statusStyle(status: BuilderStatus | string): StatusStyle {
  return STATUS_STYLES[status] ?? STATUS_FALLBACK;
}

/** Ordered status buckets used by composition/legend widgets. */
export const STATUS_ORDER: BuilderStatus[] = ['ACTIVE', 'COMPLETED', 'REMOVED'];

// --------------------------------------------------------------------------- //
// Goal attainment — a behind/near/met traffic-light scale (Decision 23/27)
// --------------------------------------------------------------------------- //

export interface AttainmentStyle {
  hex: string;
  badge: BadgeVariant;
  /** Tailwind text colour class. */
  text: string;
}

/**
 * Map a percentage to a status colour: <60 behind (red), 60–99 near (amber),
 * >=100 met (green). Used by attainment rings and per-metric bars.
 */
export function attainmentStyle(pct: number): AttainmentStyle {
  if (pct >= 100) return { hex: '#22c55e', badge: 'success', text: 'text-green-600 dark:text-green-400' };
  if (pct >= 60) return { hex: '#eab308', badge: 'warning', text: 'text-yellow-600 dark:text-yellow-400' };
  return { hex: '#ef4444', badge: 'destructive', text: 'text-red-600 dark:text-red-400' };
}

// --------------------------------------------------------------------------- //
// Rank band — Company Owner (SMD+) vs participant (Decision 5)
// --------------------------------------------------------------------------- //

/** Accent for a rank band; owners get the video's gold accent. */
export function levelAccentHex(isCompanyOwner: boolean): string {
  return isCompanyOwner ? '#f59e0b' : '#64748b';
}

// --------------------------------------------------------------------------- //
// Per-metric identity colour (Decision 28 — colour is configuration)
// --------------------------------------------------------------------------- //

/**
 * Named colour tokens a MetricDefinition.display.color may reference, plus a
 * stable fallback palette keyed by metric code so charts stay legible even when
 * a metric ships without a configured colour.
 */
const METRIC_COLOR_TOKENS: Record<string, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f59e0b',
  amber: '#f59e0b',
  red: '#ef4444',
  violet: '#8b5cf6',
  purple: '#8b5cf6',
  teal: '#14b8a6',
  pink: '#ec4899',
  slate: '#64748b',
};

const FALLBACK_PALETTE = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#14b8a6',
  '#ec4899',
  '#ef4444',
  '#64748b',
];

/**
 * Resolve a metric's chart colour: prefer its configured `display.color` token,
 * otherwise fall back to a deterministic palette slot derived from the code.
 */
export function metricColorHex(code: string, displayColor?: string): string {
  if (displayColor) {
    const token = METRIC_COLOR_TOKENS[displayColor.toLowerCase()];
    if (token) return token;
    // Allow raw hex/hsl values to pass through untouched.
    if (/^(#|hsl|rgb)/i.test(displayColor)) return displayColor;
  }
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

/** A qualitative palette for breakdown groups without an intrinsic colour. */
export function paletteColor(index: number): string {
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

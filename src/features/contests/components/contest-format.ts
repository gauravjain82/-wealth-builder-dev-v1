/**
 * Formatting and gestures shared by the two placements' grids: the Home v2 card
 * (`contest-standings.tsx`, `contest-cell.tsx`, `tier-selector.tsx`) and the standalone
 * page (`contest-results.tsx`, `tier-cards.tsx`). One implementation, so a number reads
 * the same in both.
 */

import type { MetricProgress } from '../types';

/**
 * The server sends whole numbers (C20, as dtez shows them); it qualifies and sorts on the
 * exact value. `Math.round` only guards against a stale cached payload with decimals.
 */
export function formatPercent(value: number | null): string {
  return value === null ? '' : `${Math.round(value)}%`;
}

/**
 * A metric amount for display: whole numbers with thousands separators, as dtez's
 * `fmt`. Points arrive with cents (17385.53) but are read as a round score, so the
 * decimals are dropped; counts like recruits and licences are already integers.
 */
export function formatAmount(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return Math.round(numeric).toLocaleString('en-US');
}

/**
 * A metric pill's tooltip. Decision C5's label for the single-hop measures lives here:
 * the standalone page shows no banner above the grid (parity phase 18), so the BR/BP/LIC
 * pills carry it, and the proof dialog states it in full. A sourceless metric (C15)
 * says why it counts as 0.
 */
export function pillTitle(metric: MetricProgress, teamCreditNote: string): string {
  if (!metric.available) return metric.unavailable_reason;
  return metric.single_hop_team
    ? `${metric.label} — ${teamCreditNote || 'counts direct reports only'}`
    : metric.label;
}

/**
 * The three-state tier gesture (`docs/contests/ARCHITECTURE.md` §3.3): pressing a tier adds it;
 * pressing a selected one removes it, and removing the last returns to "all", which is
 * the empty selection.
 */
export function toggleTier(selected: number[], tierId: number): number[] {
  return selected.includes(tierId)
    ? selected.filter((id) => id !== tierId)
    : [...selected, tierId];
}

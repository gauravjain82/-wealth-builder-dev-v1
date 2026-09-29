/**
 * The standalone page's tier cards, as dtez's `render()` draws them (parity phase 19).
 *
 *   MD
 *   0 qualified · 0 close · 511 in running
 *   2026-07-01 to 2026-12-31
 *   BR 30 · BP 120,000              ← dtez's tierSummary(t), "· Non-License" appended
 *   Reward: …                       ← only when the server sends one (show_rewards)
 *   Tap to show this tier           ← "Tap to add" once any is selected; "Selected · tap to remove"
 *
 * The cards are the tier toggles, with the same three-state gesture as the Home v2
 * card's `TierSelector` (`toggleTier`). A wide board lays them out as dtez's
 * auto-fit grid; a narrow one as a sideways strip that sticks to the top of the page
 * while the standings scroll under it (`contests.css`, "tier cards").
 *
 * The Home v2 card keeps `TierSelector`: its compact slot has no room for these
 * (decision recorded in `docs/contests/PHASES.md` §3, parity phase 19).
 */

import type { TierSummary } from '../types';
import { formatAmount, toggleTier } from './contest-format';

interface TierCardsProps {
  tiers: TierSummary[];
  selected: number[];
  showNearQualifiers: boolean;
  onChange: (next: number[]) => void;
}

/** dtez's `tierSummary(t)`: the required goals in catalogue order, then Non-License. */
function goalsLine(tier: TierSummary): string {
  const parts = tier.requirements.map(
    (requirement) => `${requirement.metric.toUpperCase()} ${formatAmount(requirement.value)}`,
  );
  if (tier.non_license) parts.push('Non-License');
  return parts.join(' · ') || 'No qualification goals';
}

export function TierCards({ tiers, selected, showNearQualifiers, onChange }: TierCardsProps) {
  if (!tiers.length) return null;

  return (
    <section className="wb-ct-tier-selector">
      <div className="wb-ct-tier-overview" role="group" aria-label="Filter results by tier">
        {tiers.map((tier) => {
          const isSelected = selected.includes(tier.id);
          const hint = isSelected
            ? 'Selected · tap to remove'
            : selected.length
              ? 'Tap to add'
              : 'Tap to show this tier';
          return (
            <button
              key={tier.id}
              type="button"
              className="wb-ct-tier-card"
              aria-pressed={isSelected}
              onClick={() => onChange(toggleTier(selected, tier.id))}
            >
              <strong className="wb-ct-tier-card__name">{tier.name}</strong>
              <span className="wb-ct-tier-line">
                {tier.qualified} qualified
                {showNearQualifiers ? ` · ${tier.near} close` : ''} · {tier.in_running} in
                running
              </span>
              <span className="wb-ct-tier-line">{tier.period_label}</span>
              {/* A sourceless goal counts as 0 (C15); the goals line's tooltip says which. */}
              <span
                className="wb-ct-tier-line"
                title={
                  tier.unmeasured.length
                    ? `${tier.unmeasured.map((key) => key.toUpperCase()).join(', ')}: no source, counts as 0`
                    : undefined
                }
              >
                {goalsLine(tier)}
              </span>
              {tier.reward ? (
                <span className="wb-ct-tier-line">Reward: {tier.reward}</span>
              ) : null}
              <span className="wb-ct-tier-line wb-ct-tier-hint">{hint}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Tier overview cards, which double as the tier toggles.
 *
 * The three-state gesture from `UI_CONTRACT.md`, implemented exactly:
 *
 *   - nothing selected  → every visible tier is shown;
 *   - one or more selected → only those;
 *   - toggling the **last** selected tier off → back to all.
 *
 * The third is what makes the gesture reversible without a separate "clear" control,
 * and it is why "none selected" and "all selected" are the same instruction rather
 * than opposites. `aria-pressed` carries the state for assistive technology.
 *
 * On a narrow card the row becomes a horizontally scrollable, snap-friendly strip —
 * inside the card, never at page level.
 */

import type { TierSummary } from '../types';

interface TierSelectorProps {
  tiers: TierSummary[];
  selected: number[];
  showCounts: boolean;
  onChange: (next: number[]) => void;
}

export function TierSelector({ tiers, selected, showCounts, onChange }: TierSelectorProps) {
  if (!tiers.length) return null;

  const toggle = (tierId: number) => {
    const isSelected = selected.includes(tierId);
    // Deselecting the last one returns to "all", which is the empty selection.
    const next = isSelected ? selected.filter((id) => id !== tierId) : [...selected, tierId];
    onChange(next);
  };

  return (
    <div className="wb-ct-tiers" role="group" aria-label="Contest tiers">
      {tiers.map((tier) => {
        const isSelected = selected.includes(tier.id);
        return (
          <button
            key={tier.id}
            type="button"
            className="wb-ct-tier"
            aria-pressed={isSelected}
            onClick={() => toggle(tier.id)}
          >
            <div className="wb-ct-tier-name">{tier.name}</div>
            {showCounts ? (
              <div className="wb-ct-tier-counts">
                {tier.qualified} qualified · {tier.near} close · {tier.in_running} in
                running
              </div>
            ) : null}
            <div className="wb-ct-tier-period">{tier.period_label}</div>
            {tier.reward ? <div className="wb-ct-tier-period">{tier.reward}</div> : null}
            {tier.unmeasured.length ? (
              <div className="wb-ct-tier-period">
                {tier.unmeasured.map((key) => key.toUpperCase()).join(', ')} cannot be
                measured
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

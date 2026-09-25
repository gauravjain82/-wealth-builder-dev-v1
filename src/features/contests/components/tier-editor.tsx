/**
 * One tier's editor row: identity, eligibility, period override, thresholds, notes.
 *
 * **This is where decision C5 is discharged for the person who can actually act on
 * it.** `BR`, `BP` and `LIC` count one hop of Leader with no base-shop boundary, so
 * they read materially lower than the Production Tracker for the same agent. Until
 * this screen existed, that warning reached the agent reading standings but not the
 * manager typing `BR >= 50` — which is the moment it matters, because a contest
 * threshold is a promise about a prize.
 *
 * Three rules the form enforces, all from `DATA_CONTRACT.md` and all also enforced
 * server-side, because a disabled input is not validation:
 *
 * - `TR`, `TP` and `TE` are result components, never threshold inputs. They are not
 *   rendered at all, and the backend rejects them if a hand-written request sends one.
 * - a metric this deployment cannot measure (`BE`, `C`) cannot be made a requirement;
 *   the input is disabled and says why.
 * - eligibility levels come from the host's level table. All ticked and none ticked
 *   are the same instruction — "anyone" — because the backend stores the shorter of
 *   the two encodings and both collapse to empty.
 */

import type { EditableTier, LevelOption, MetricOption, ThresholdMetric } from '../types';

interface TierEditorProps {
  tier: EditableTier;
  index: number;
  levels: LevelOption[];
  metrics: MetricOption[];
  selectedLevels: string[];
  onChange: (patch: Partial<EditableTier>) => void;
  onLevelsChange: (codes: string[]) => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}

export function TierEditor({
  tier,
  index,
  levels,
  metrics,
  selectedLevels,
  onChange,
  onLevelsChange,
  onToggleHidden,
  onDelete,
}: TierEditorProps) {
  const usesSingleHop = metrics.some(
    (metric) => metric.single_hop_team && Number(tier.thresholds[metric.metric] ?? 0) > 0
  );

  const toggleLevel = (code: string) => {
    const next = selectedLevels.includes(code)
      ? selectedLevels.filter((value) => value !== code)
      : [...selectedLevels, code];
    onLevelsChange(next);
  };

  return (
    <fieldset
      className={`wb-ct-tier-editor${tier.pending_delete ? ' wb-ct-tier-editor--deleting' : ''}`}
    >
      <legend className="wb-ct-sr-only">Tier {index + 1}</legend>

      <div className="wb-ct-editor-row">
        <label className="wb-ct-field wb-ct-field--grow">
          <span>Tier name</span>
          <input
            type="text"
            value={tier.tier_name}
            onChange={(event) => onChange({ tier_name: event.target.value })}
          />
        </label>

        <label className="wb-ct-field">
          <span>Position</span>
          <input
            type="number"
            min={1}
            value={tier.tier_order}
            onChange={(event) => onChange({ tier_order: Number(event.target.value) })}
          />
        </label>

        <label className="wb-ct-field wb-ct-field--grow">
          <span>Reward</span>
          <input
            type="text"
            value={tier.reward}
            onChange={(event) => onChange({ reward: event.target.value })}
          />
        </label>
      </div>

      <div className="wb-ct-editor-row">
        <div className="wb-ct-field wb-ct-field--grow">
          <span>Eligible levels</span>
          <div className="wb-ct-levels" role="group" aria-label="Eligible levels">
            {levels.map((level) => (
              <label key={level.code} className="wb-ct-check">
                <input
                  type="checkbox"
                  checked={selectedLevels.includes(level.code)}
                  disabled={tier.non_license}
                  onChange={() => toggleLevel(level.code)}
                />
                <span>{level.label}</span>
              </label>
            ))}
          </div>
          {selectedLevels.length === 0 || selectedLevels.length === levels.length ? (
            <small>Anyone is eligible.</small>
          ) : null}
        </div>

        <label className="wb-ct-check wb-ct-field">
          <input
            type="checkbox"
            checked={tier.non_license}
            onChange={(event) => onChange({ non_license: event.target.checked })}
          />
          <span>Non-License</span>
        </label>
      </div>

      {tier.non_license ? (
        <p className="wb-ct-note">
          Non-License takes priority over the level list, which is ignored. Only people
          whose licence flag is false are eligible; anyone licensed gets a blank cell
          rather than a score.
        </p>
      ) : null}

      <div className="wb-ct-editor-row">
        <label className="wb-ct-field">
          <span>Period</span>
          <select
            value={tier.tier_period_mode}
            onChange={(event) => onChange({ tier_period_mode: event.target.value })}
          >
            <option value="inherit">Same as the contest</option>
            <option value="fixed">Fixed dates</option>
            <option value="rolling">Rolling window</option>
            <option value="monthly">Calendar month</option>
          </select>
        </label>

        {tier.tier_period_mode === 'fixed' ? (
          <>
            <label className="wb-ct-field">
              <span>From</span>
              <input
                type="date"
                value={tier.tier_start ?? ''}
                onChange={(event) => onChange({ tier_start: event.target.value || null })}
              />
            </label>
            <label className="wb-ct-field">
              <span>To</span>
              <input
                type="date"
                value={tier.tier_end ?? ''}
                onChange={(event) => onChange({ tier_end: event.target.value || null })}
              />
            </label>
          </>
        ) : null}

        {tier.tier_period_mode === 'rolling' ? (
          <label className="wb-ct-field">
            <span>Days</span>
            <input
              type="number"
              min={1}
              max={3650}
              value={tier.tier_rolling_days ?? ''}
              onChange={(event) =>
                onChange({
                  tier_rolling_days: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          </label>
        ) : null}
      </div>

      <div className="wb-ct-metrics">
        {metrics.map((metric) => (
          <label
            key={metric.metric}
            className={`wb-ct-field wb-ct-metric-field${
              metric.single_hop_team ? ' wb-ct-metric-field--team' : ''
            }`}
          >
            <span>
              {metric.metric.toUpperCase()}
              {metric.single_hop_team ? (
                <abbr title={metric.note} className="wb-ct-flag">
                  {' '}
                  ⚑
                </abbr>
              ) : null}
            </span>
            <input
              type="number"
              min={0}
              max={metric.maximum}
              step={1}
              disabled={!metric.measurable}
              placeholder={metric.measurable ? '—' : 'n/a'}
              title={
                metric.measurable
                  ? `${metric.label}, up to ${metric.maximum.toLocaleString()}`
                  : `${metric.label} cannot be measured in this system.`
              }
              value={tier.thresholds[metric.metric] ?? ''}
              onChange={(event) =>
                onChange({
                  thresholds: {
                    ...tier.thresholds,
                    [metric.metric as ThresholdMetric]: event.target.value
                      ? Number(event.target.value)
                      : null,
                  },
                })
              }
            />
          </label>
        ))}
      </div>

      {usesSingleHop ? (
        <p className="wb-ct-note wb-ct-note--warn">
          ⚑ {metrics.find((metric) => metric.single_hop_team)?.note}
        </p>
      ) : null}

      <div className="wb-ct-editor-row">
        <label className="wb-ct-field wb-ct-field--grow">
          <span>Notes</span>
          <input
            type="text"
            value={tier.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
          />
        </label>

        <div className="wb-ct-header-actions">
          <button type="button" className="wb-ct-pill" onClick={onToggleHidden}>
            {tier.is_hidden ? 'Unhide' : 'Hide'}
          </button>
          <button type="button" className="wb-ct-pill" onClick={onDelete}>
            {tier.pending_delete ? 'Keep' : 'Delete'}
          </button>
        </div>
      </div>

      {tier.is_hidden ? (
        <small>Hidden tiers stay here but never appear in standings.</small>
      ) : null}
      {tier.pending_delete ? (
        <small>This tier will be deleted when you save.</small>
      ) : null}
    </fieldset>
  );
}

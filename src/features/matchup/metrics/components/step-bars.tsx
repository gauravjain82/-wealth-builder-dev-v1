import { TrendingDown } from 'lucide-react';

import type { MetricsSection, StepCounts, StepMeta } from '../types';
import { percent } from './format';
import { OutcomeBar, OutcomeLegend } from './outcome-bar';

interface StepBarsProps {
  steps: StepMeta[];
  counts: Record<string, StepCounts>;
  section: MetricsSection;
}

/** A step needs this many past bookings before its show rate is called out. */
const MIN_RESOLVED = 5;

/** Show rate over bookings that have already happened (upcoming excluded), as in the table view. */
function showShare(row: StepCounts): number | null {
  const resolved = row.booked - row.upcoming;
  return resolved > 0 ? row.showed / resolved : null;
}

/**
 * One stacked bar per step: where that step's bookings ended up. The same
 * numbers as `StepTable`, which stays one click away.
 */
export function StepBars({ steps, counts, section }: StepBarsProps) {
  const rows = steps.flatMap((step) => (counts[step.key] ? [{ step, row: counts[step.key] }] : []));

  const ranked = rows
    .filter(({ row }) => row.booked - row.upcoming >= MIN_RESOLVED)
    .map(({ step, row }) => ({ step, share: showShare(row) as number }))
    .sort((a, b) => a.share - b.share);
  const weakest = ranked.length > 1 ? ranked[0] : null;

  return (
    <>
      <ul className="mm-steps">
        <li className="mm-steps-head" aria-hidden="true">
          <span>Step</span>
          <span>Where bookings ended up</span>
          <span>Booked</span>
          <span>Show rate</span>
        </li>
        {rows.map(({ step, row }) => (
          <li key={step.key}>
            <span className="mm-steps-label">
              {step.label}
              {step.historical && <em className="mm-tag">historical</em>}
            </span>
            {row.booked ? (
              <OutcomeBar counts={row} section={section} label={step.label} />
            ) : (
              <span className="mm-steps-none">Nothing booked</span>
            )}
            <strong>{row.booked.toLocaleString()}</strong>
            <small>{percent(row.showed, row.booked - row.upcoming)}</small>
          </li>
        ))}
      </ul>
      <OutcomeLegend section={section} />
      {weakest && (
        <p className="mm-callout">
          <TrendingDown size={16} aria-hidden="true" />
          <span>
            Biggest leak: <strong>{weakest.step.label}</strong>. Only {Math.round(weakest.share * 100)}% of past
            bookings showed up.
          </span>
        </p>
      )}
    </>
  );
}

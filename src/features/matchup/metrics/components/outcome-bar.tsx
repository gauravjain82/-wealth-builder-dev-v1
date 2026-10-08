import { useState } from 'react';

import type { MetricsSection, OutcomeCounts } from '../types';
import { type OutcomeSegmentKey, percent, segmentValue, segmentsFor } from './format';

interface OutcomeBarProps {
  counts: OutcomeCounts;
  section: MetricsSection;
  /** Names the bar for screen readers ("Step 1", "Everyone booked"). */
  label: string;
  size?: 'lg' | 'sm';
}

/** Below this share a segment is too narrow for its own percent label. */
const MIN_LABEL_SHARE = 10;

/**
 * One 100% bar of where everything booked ended up. The buckets add up to
 * "booked" (the backend counts each unit under its best outcome), so the
 * segments are the whole story. Hover shows the count; the table view and
 * the aria-label carry the same numbers.
 */
export function OutcomeBar({ counts, section, label, size = 'sm' }: OutcomeBarProps) {
  const [hovered, setHovered] = useState<OutcomeSegmentKey | null>(null);
  const segments = segmentsFor(section)
    .map((segment) => ({ ...segment, value: segmentValue(counts, segment.key) }))
    .filter((segment) => segment.value > 0);
  const whole = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (!whole) {
    return <div className={`mm-obar mm-obar--${size} is-empty`} role="img" aria-label={`${label}: nothing booked`} />;
  }

  const description = segments.map((segment) => `${segment.label} ${segment.value}`).join(', ');
  return (
    <div
      className={`mm-obar mm-obar--${size}`}
      role="img"
      aria-label={`${label}: ${description}`}
      onMouseLeave={() => setHovered(null)}
    >
      {segments.map((segment) => {
        const share = (segment.value / whole) * 100;
        return (
          <span
            key={segment.key}
            className={`mm-obar-seg mm-o--${segment.key}${hovered && hovered !== segment.key ? ' is-dimmed' : ''}`}
            style={{ flexGrow: segment.value }}
            onMouseEnter={() => setHovered(segment.key)}
          >
            {size === 'lg' && share >= MIN_LABEL_SHARE && <em>{Math.round(share)}%</em>}
            {hovered === segment.key && (
              <span className="mm-tip" role="tooltip">
                <i className={`mm-swatch mm-o--${segment.key}`} />
                {segment.label}
                <strong>{segment.value.toLocaleString()}</strong>
                <small>{percent(segment.value, whole)}</small>
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** Swatch + label for every segment the section can show. */
export function OutcomeLegend({ section }: { section: MetricsSection }) {
  return (
    <ul className="mm-legend">
      {segmentsFor(section).map((segment) => (
        <li key={segment.key}>
          <i className={`mm-swatch mm-o--${segment.key}`} />
          {segment.label}
        </li>
      ))}
    </ul>
  );
}

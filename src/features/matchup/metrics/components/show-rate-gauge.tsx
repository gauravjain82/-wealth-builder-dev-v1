import type { ReactNode } from 'react';

import { useCountUp } from './use-count-up';

interface ShowRateGaugeProps {
  /** Backend rate, 0..1, or null when nothing was booked. */
  rate: number | null;
  showed: number;
  total: number;
  unit: string;
  /** Change vs the previous period, when there is one. */
  delta?: ReactNode;
}

/** Half-ring gauge for the headline show rate — the one hero figure on the page. */
export function ShowRateGauge({ rate, showed, total, unit, delta }: ShowRateGaugeProps) {
  const target = rate == null ? 0 : Math.round(Math.min(rate, 1) * 100);
  const shown = useCountUp(target);

  return (
    <figure className="mm-gauge">
      <svg viewBox="0 0 160 92" aria-hidden="true">
        <path className="mm-gauge-track" d="M 12 82 A 68 68 0 0 1 148 82" pathLength={100} />
        {shown > 0 && (
          <path
            className="mm-gauge-fill"
            d="M 12 82 A 68 68 0 0 1 148 82"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - shown}
          />
        )}
      </svg>
      <div className="mm-gauge-value">
        <strong>{rate == null ? '—' : `${shown}%`}</strong>
        <span>show rate</span>
      </div>
      <figcaption>
        {showed.toLocaleString()} of {total.toLocaleString()} {unit} showed up
      </figcaption>
      {delta}
    </figure>
  );
}

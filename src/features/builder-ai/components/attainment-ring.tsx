/**
 * AttainmentRing — a circular progress gauge coloured by attainment.
 *
 * Pure SVG (no chart dependency) so it stays crisp at any size and cheap to
 * paint. The ring fill honours the goal's cap (Decision 23: pass an already
 * capped percentage for rings), while the centre label may show the raw number.
 */

import { attainmentStyle } from '../theme';

export interface AttainmentRingProps {
  /** Fill percentage (0–100). Callers pass the capped value for rings. */
  pct: number;
  /** Optional raw label shown in the centre (defaults to `Math.round(pct)%`). */
  label?: string;
  /** Diameter in px. */
  size?: number;
  /** Stroke width in px. */
  stroke?: number;
}

/** Render a colour-coded circular attainment gauge. */
export function AttainmentRing({ pct, label, size = 56, stroke = 6 }: AttainmentRingProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = attainmentStyle(pct).hex;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-slate-200 dark:text-white/10"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 400ms ease' }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-slate-700 text-[11px] font-semibold dark:fill-white"
      >
        {label ?? `${Math.round(pct)}%`}
      </text>
    </svg>
  );
}

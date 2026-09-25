/**
 * The Full Report's progress gauge.
 *
 * Geometry is fixed by `UI_CONTRACT.md` and is not a style choice: viewBox
 * `0 0 200 120`, centre `(100,100)`, track radius 78, zone radius 84, 20 tick
 * intervals with 5 labelled major positions, and a needle sweeping -90° at 0% to
 * +90° at 100%.
 *
 * Two behaviours that look like bugs and are not:
 *
 * - the needle **caps** at 100% while the printed number does not, so a leader at
 *   140% of goal reads "140%" with the needle pinned at full — a needle that swung
 *   past the arc would point at nothing;
 * - the animation runs once and is suppressed entirely under
 *   `prefers-reduced-motion`.
 */

import { useEffect, useRef, useState } from 'react';

import { formatCompact } from './format';

const VIEWBOX = { width: 200, height: 120 };
const CENTRE = { x: 100, y: 100 };
const TRACK_RADIUS = 78;
const ZONE_RADIUS = 84;
const TICK_COUNT = 20;
const MAJOR_TICKS = [0, 25, 50, 75, 100];

/** Zone boundaries as percentages of goal, and the colour each one paints. */
const ZONES = [
  { from: 0, to: 50, colour: '#dc2626' },
  { from: 50, to: 80, colour: '#f59e0b' },
  { from: 80, to: 100, colour: '#16a34a' },
];

/** Degrees for a percentage: 0% is -90°, 100% is +90°, capped at both ends. */
function angleFor(percent: number): number {
  const clamped = Math.max(0, Math.min(percent, 100));
  return -90 + (clamped / 100) * 180;
}

function pointOnArc(radius: number, percent: number) {
  const radians = (angleFor(percent) - 90) * (Math.PI / 180);
  return {
    x: CENTRE.x + radius * Math.cos(radians),
    y: CENTRE.y + radius * Math.sin(radians),
  };
}

/** An SVG arc path between two percentages at a given radius. */
function arcPath(radius: number, from: number, to: number): string {
  const start = pointOnArc(radius, from);
  const end = pointOnArc(radius, to);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface SpeedometerProps {
  /** The achieved value; may exceed the goal. */
  value: number;
  /** The target. Zero means "no target", and the gauge says so. */
  goal: number;
  /** Percentage of goal, from the server. Null when the goal is zero. */
  percent: number | null;
  /** What the numbers count, for the accessible label. */
  label: string;
}

export function Speedometer({ value, goal, percent, label }: SpeedometerProps) {
  const target = percent ?? 0;
  const [needlePercent, setNeedlePercent] = useState(prefersReducedMotion() ? target : 0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion() || hasAnimated.current) {
      setNeedlePercent(target);
      return;
    }
    // One frame's delay so the needle starts at zero and transitions to the value,
    // rather than mounting already in place.
    hasAnimated.current = true;
    const frame = requestAnimationFrame(() => setNeedlePercent(target));
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const needleEnd = pointOnArc(TRACK_RADIUS - 12, needlePercent);
  const accessibleLabel =
    goal > 0
      ? `${label}: ${value.toLocaleString()} of a ${goal.toLocaleString()} goal, ${percent ?? 0}%`
      : `${label}: ${value.toLocaleString()}, no goal set`;

  return (
    <div className="wb-lb-gauge">
      <svg
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        role="img"
        aria-label={accessibleLabel}
        className="wb-lb-gauge__svg"
      >
        {ZONES.map((zone) => (
          <path
            key={zone.from}
            d={arcPath(ZONE_RADIUS, zone.from, zone.to)}
            stroke={zone.colour}
            strokeWidth={6}
            fill="none"
            strokeLinecap="butt"
          />
        ))}

        <path
          d={arcPath(TRACK_RADIUS, 0, 100)}
          className="wb-lb-gauge__track"
          strokeWidth={10}
          fill="none"
        />

        {Array.from({ length: TICK_COUNT + 1 }, (_, index) => {
          const tickPercent = (index / TICK_COUNT) * 100;
          const isMajor = MAJOR_TICKS.includes(tickPercent);
          const outer = pointOnArc(TRACK_RADIUS - 6, tickPercent);
          const inner = pointOnArc(TRACK_RADIUS - (isMajor ? 16 : 11), tickPercent);
          return (
            <line
              key={tickPercent}
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              className={isMajor ? 'wb-lb-gauge__tick--major' : 'wb-lb-gauge__tick'}
            />
          );
        })}

        {MAJOR_TICKS.map((tickPercent) => {
          const position = pointOnArc(TRACK_RADIUS - 28, tickPercent);
          return (
            <text
              key={tickPercent}
              x={position.x}
              y={position.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="wb-lb-gauge__tick-label"
            >
              {goal > 0 ? formatCompact((goal * tickPercent) / 100) : `${tickPercent}%`}
            </text>
          );
        })}

        <line
          x1={CENTRE.x}
          y1={CENTRE.y}
          x2={needleEnd.x}
          y2={needleEnd.y}
          className="wb-lb-gauge__needle"
        />
        <circle cx={CENTRE.x} cy={CENTRE.y} r={5} className="wb-lb-gauge__hub" />
      </svg>

      <div className="wb-lb-gauge__readout">
        <span className="wb-lb-gauge__value">{value.toLocaleString()}</span>
        <span className="wb-lb-gauge__goal">
          {goal > 0 ? `of ${goal.toLocaleString()}` : 'no goal set'}
        </span>
        {percent !== null && <span className="wb-lb-gauge__percent">{percent}%</span>}
      </div>
    </div>
  );
}

export default Speedometer;

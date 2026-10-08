import { type MouseEvent, useState } from 'react';

import type { TrendWeek } from '../types';
import { formatWindow } from './format';
import type { SparkPoint } from './trend-series';

interface SparklineProps {
  weeks: TrendWeek[];
  points: SparkPoint[];
  format: 'rate' | 'count';
  /** Names the series for screen readers and the tooltip ("Weekly show rate"). */
  label: string;
  /** The page's selected dates; weeks overlapping them are drawn in the accent. */
  window: { start: string; end: string };
  width: number;
  height: number;
  className?: string;
}

/** Room around the plot for the end marker and its ring. */
const PAD = 6;
/** Rates are never stretched to fill less than this span, so a 2-point wobble stays near flat. */
const MIN_RATE_SPAN = 0.1;

interface Run {
  key: string;
  points: string;
  accent: boolean;
  soft: boolean;
}

function show(value: number, format: 'rate' | 'count'): string {
  return format === 'rate' ? `${Math.round(value * 100)}%` : value.toLocaleString();
}

/**
 * A single-series weekly sparkline, no axes. The whole line is muted; the
 * weeks inside the selected dates are drawn in the accent. Empty weeks
 * (rates) are gaps, weeks under `MIN_SAMPLE` are hollow points, unsettled
 * and in-progress weeks are dashed, and the last point carries the end
 * marker (hollow when the week is in progress or too small).
 *
 * Hover snaps to the nearest week across the whole height, so the pointer
 * aims at a date rather than at a 2px line.
 */
export function Sparkline({ weeks, points, format, label, window, width, height, className }: SparklineProps) {
  const [hovered, setHovered] = useState<{ index: number; left: number; top: number } | null>(null);
  const count = Math.min(weeks.length, points.length);
  const values = points.slice(0, count).map((point) => point.value);
  const present = values.filter((value): value is number => value != null);
  if (count < 2 || !present.length) return null;

  // Rates: the range of the weeks big enough to trust (a 1-of-3 week would flatten the rest),
  // widened to MIN_RATE_SPAN and kept in 0..1; small weeks outside it sit on the edge. Counts: from 0.
  const trusted = values.filter((value, index): value is number => value != null && !points[index].small);
  const scaled = trusted.length ? trusted : present;
  let low = format === 'rate' ? Math.min(...scaled) : 0;
  let high = Math.max(...scaled);
  if (format === 'rate' && high - low < MIN_RATE_SPAN) {
    const middle = (high + low) / 2;
    low = Math.max(0, Math.min(middle - MIN_RATE_SPAN / 2, 1 - MIN_RATE_SPAN));
    high = low + MIN_RATE_SPAN;
  }
  if (high === low) high = low + 1;

  const step = (width - PAD * 2) / (count - 1);
  const x = (index: number) => PAD + index * step;
  const y = (value: number) => {
    const share = Math.min(Math.max((value - low) / (high - low), 0), 1);
    return height - PAD - share * (height - PAD * 2);
  };
  const inWindow = weeks.slice(0, count).map((week) => week.end >= window.start && week.start <= window.end);
  const soft = (index: number) => points[index].unsettled || weeks[index].partial;

  // Consecutive segments that share a style become one polyline (round joins within it).
  const runs: Run[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    const from = values[index];
    const to = values[index + 1];
    if (from == null || to == null) continue;
    const accent = inWindow[index] && inWindow[index + 1];
    const dashed = soft(index + 1);
    const last = runs[runs.length - 1];
    const joined = last && last.accent === accent && last.soft === dashed && last.key.endsWith(`-${index}`);
    const point = `${x(index + 1)},${y(to)}`;
    if (joined) {
      last.points += ` ${point}`;
      last.key = last.key.replace(/-\d+$/, `-${index + 1}`);
    } else {
      runs.push({ key: `${index}-${index + 1}`, points: `${x(index)},${y(from)} ${point}`, accent, soft: dashed });
    }
  }

  const lastIndex = values.reduce<number>((found, value, index) => (value != null ? index : found), -1);
  const isolated = (index: number) =>
    values[index] != null && (index === 0 || values[index - 1] == null) && (index === count - 1 || values[index + 1] == null);

  const tone = (index: number) => (inWindow[index] ? 'is-accent' : 'is-muted');
  const endHollow = weeks[lastIndex].partial || points[lastIndex].small;

  // Summary for screen readers: first → last, and the high / low weeks.
  const firstIndex = values.findIndex((value) => value != null);
  const highIndex = values.indexOf(Math.max(...present));
  const lowIndex = values.indexOf(Math.min(...present));
  const weekOf = (index: number) => formatWindow(weeks[index].start, weeks[index].end);
  const description =
    `${label}, ${count} weeks: ${show(values[firstIndex] as number, format)} to ${show(values[lastIndex] as number, format)}` +
    `; high ${show(values[highIndex] as number, format)} (${weekOf(highIndex)})` +
    `, low ${show(values[lowIndex] as number, format)} (${weekOf(lowIndex)})`;

  function hover(index: number, event: MouseEvent<SVGRectElement>) {
    const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!box) return;
    setHovered({ index, left: box.left + (x(index) / width) * box.width, top: box.top });
  }

  const active = hovered ? points[hovered.index] : null;
  const activeValue = hovered ? values[hovered.index] : null;
  const activeWeek = hovered ? weeks[hovered.index] : null;
  // Keep the tooltip's centre far enough from the viewport edges to stay on screen.
  const viewport = typeof document === 'undefined' ? 0 : document.documentElement.clientWidth;
  const tipLeft = hovered ? Math.min(Math.max(hovered.left, 120), Math.max(viewport - 120, 120)) : 0;

  return (
    <div className={['mm-trend', className].filter(Boolean).join(' ')} onMouseLeave={() => setHovered(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={description}>
        {hovered && <line className="mm-trend-hair" x1={x(hovered.index)} x2={x(hovered.index)} y1={0} y2={height} />}
        {runs.map((run) => (
          <polyline
            key={run.key}
            points={run.points}
            className={`mm-trend-line ${run.accent ? 'is-accent' : 'is-muted'}${run.soft ? ' is-soft' : ''}`}
          />
        ))}
        {values.map((value, index) => {
          if (value == null || index === lastIndex) return null;
          if (points[index].small) {
            return <circle key={index} cx={x(index)} cy={y(value)} r={2.5} className={`mm-trend-dot is-hollow ${tone(index)}`} />;
          }
          if (isolated(index)) return <circle key={index} cx={x(index)} cy={y(value)} r={2} className={`mm-trend-dot ${tone(index)}`} />;
          return null;
        })}
        <circle cx={x(lastIndex)} cy={y(values[lastIndex] as number)} r={6} className="mm-trend-ring" />
        <circle
          cx={x(lastIndex)}
          cy={y(values[lastIndex] as number)}
          r={4}
          className={`mm-trend-dot ${tone(lastIndex)}${endHollow ? ' is-hollow' : ''}`}
        />
        {hovered && activeValue != null && hovered.index !== lastIndex && (
          <>
            <circle cx={x(hovered.index)} cy={y(activeValue)} r={6} className="mm-trend-ring" />
            <circle
              cx={x(hovered.index)}
              cy={y(activeValue)}
              r={4}
              className={`mm-trend-dot ${tone(hovered.index)}${active?.small ? ' is-hollow' : ''}`}
            />
          </>
        )}
        {values.map((_, index) => (
          <rect
            key={index}
            className="mm-trend-hit"
            x={index === 0 ? 0 : x(index) - step / 2}
            width={index === 0 || index === count - 1 ? step / 2 + PAD : step}
            y={0}
            height={height}
            onMouseEnter={(event) => hover(index, event)}
          />
        ))}
      </svg>
      {hovered && active && activeWeek && (
        <div className="mm-tip mm-trend-tip" role="tooltip" style={{ left: tipLeft, top: hovered.top }}>
          <div className="mm-trend-tip-head">{formatWindow(activeWeek.start, activeWeek.end)}</div>
          <div className="mm-trend-tip-value">
            {activeValue == null ? '—' : show(activeValue, format)}
            <div className="mm-trend-tip-detail">{active.detail}</div>
          </div>
          {activeWeek.partial && <div className="mm-trend-tip-note">Week in progress</div>}
          {active.unsettled && <div className="mm-trend-tip-note">Still settling — many upcoming or forms pending</div>}
          {active.small && <div className="mm-trend-tip-note">Too few booked to compare</div>}
        </div>
      )}
    </div>
  );
}

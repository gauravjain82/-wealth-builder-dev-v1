/**
 * Time helpers for the schedule grid. `Intl` only; no timezone library.
 *
 * The grid is always drawn in the viewer's own zone. A training keeps the zone
 * its host scheduled it in, and when the two differ the UI shows both — see
 * `differsFromViewer`.
 */

import { browserTimezone } from '@/shared/components/timezone-select/timezones';

export const viewerTimezone = browserTimezone;

/** "7:00 PM" in `timeZone` (the viewer's zone when omitted). */
export function formatTime(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' });
}

export function formatTimeRange(start: string, end: string, timeZone?: string): string {
  return `${formatTime(start, timeZone)} – ${formatTime(end, timeZone)}`;
}

/** "Wed, Oct 14" in `timeZone` (the viewer's zone when omitted). */
export function formatDay(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** The zone's short name at `at`, e.g. "CDT"; falls back to the IANA name. */
export function zoneAbbreviation(timeZone: string, at: string | Date = new Date()): string {
  try {
    return (
      new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
        .formatToParts(new Date(at))
        .find((part) => part.type === 'timeZoneName')?.value ?? timeZone
    );
  } catch {
    return timeZone;
  }
}

function offsetMinutes(timeZone: string, at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value])
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute)
  );
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/**
 * Whether the training's clock reads differently from the viewer's at `iso`.
 * Compared by offset, not name: Chicago and Mexico City are different zones
 * that can show the same time, and then there is nothing to warn about.
 */
export function differsFromViewer(timeZone: string, iso: string): boolean {
  try {
    const at = new Date(iso);
    return offsetMinutes(timeZone, at) !== offsetMinutes(viewerTimezone(), at);
  } catch {
    return false;
  }
}

/** Midnight on the Sunday of `date`'s week, in the viewer's zone. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** `yyyy-MM-dd` for a local date. */
export function toDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The link a host shares in the meeting chat. */
export function attendanceUrl(token: string): string {
  return `${window.location.origin}/training-schedule/attend/${token}`;
}

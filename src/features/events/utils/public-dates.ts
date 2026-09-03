/**
 * Date formatting for the public event pages.
 *
 * Events carry their own IANA `timezone`, and an attendee in another zone must
 * still see the *local* start time of the event ("9:00 AM" means 9am at the
 * venue). Every formatter here therefore renders in the event's timezone, not
 * the browser's, and labels it so there is no ambiguity.
 */

/** Format options shared by the range formatters. */
const DATE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

const TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
};

/**
 * Build a formatter in the event's timezone, falling back to the browser's.
 *
 * `timezone` is free text on the backend, so an invalid value must not throw
 * and blank out the page.
 */
function formatter(
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone });
  } catch {
    return new Intl.DateTimeFormat('en-US', options);
  }
}

/** Parse an ISO string, returning `null` for missing or unparseable input. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Format a single timestamp as date + time in the event's timezone. */
export function formatEventDateTime(
  value: string | null | undefined,
  timeZone: string,
): string {
  const date = parseDate(value);
  if (!date) return '';
  return formatter(timeZone, { ...DATE_OPTS, ...TIME_OPTS }).format(date);
}

/** Format a date only (no time) in the event's timezone. */
export function formatEventDate(
  value: string | null | undefined,
  timeZone: string,
): string {
  const date = parseDate(value);
  if (!date) return '';
  return formatter(timeZone, DATE_OPTS).format(date);
}

/**
 * Format an event's start→end span as compactly as the dates allow.
 *
 * Same day collapses to one date with a time range; different days show both
 * dates in full. The timezone is appended so remote attendees aren't misled.
 */
export function formatEventRange(
  beginAt: string | null | undefined,
  endAt: string | null | undefined,
  timeZone: string,
): string {
  const begin = parseDate(beginAt);
  if (!begin) return 'Date to be announced';

  const end = parseDate(endAt);
  const dateFmt = formatter(timeZone, DATE_OPTS);
  const timeFmt = formatter(timeZone, TIME_OPTS);
  const zoneLabel = shortTimeZone(begin, timeZone);

  if (!end) {
    return `${dateFmt.format(begin)} · ${timeFmt.format(begin)} ${zoneLabel}`.trim();
  }

  const sameDay = dateFmt.format(begin) === dateFmt.format(end);
  if (sameDay) {
    return `${dateFmt.format(begin)} · ${timeFmt.format(begin)} – ${timeFmt.format(end)} ${zoneLabel}`.trim();
  }
  return `${dateFmt.format(begin)} – ${dateFmt.format(end)} ${zoneLabel}`.trim();
}

/** Return the short timezone name (e.g. `EST`), or `''` if unavailable. */
export function shortTimeZone(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(date);
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

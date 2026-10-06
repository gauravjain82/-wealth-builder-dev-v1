/**
 * Wall-clock time in an event's timezone, independent of the viewer's.
 *
 * An agenda is written in the venue's local time ("8:45 AM, Grand Ballroom"),
 * but the organiser editing it — or the door staff reading it — may be
 * anywhere. The shared `DateTimePicker` works in the *browser's* zone, so the
 * agenda editor instead takes a day plus a start/end time in the event's zone
 * and converts with these helpers. Uses `Intl` only; no timezone library.
 */

interface WallClock {
  /** `yyyy-MM-dd` */
  date: string;
  /** `HH:mm` (24h) */
  time: string;
}

function parts(instant: Date, timeZone: string): Record<string, string> {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  return Object.fromEntries(formatted.map((p) => [p.type, p.value]));
}

/** The zone's offset from UTC at `instant`, in minutes. */
function offsetMinutes(instant: Date, timeZone: string): number {
  const p = parts(instant, timeZone);
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/** Return `iso` as a day and time on the wall clock of `timeZone`. */
export function toWallClock(iso: string, timeZone: string): WallClock {
  const p = parts(new Date(iso), safeZone(timeZone));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/**
 * Return the UTC ISO instant for a wall-clock day/time in `timeZone`.
 * Two passes settle the offset across a DST change on that day.
 */
export function fromWallClock(date: string, time: string, timeZone: string): string {
  const zone = safeZone(timeZone);
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let guess = naive - offsetMinutes(new Date(naive), zone) * 60000;
  guess = naive - offsetMinutes(new Date(guess), zone) * 60000;
  return new Date(guess).toISOString();
}

/** `timeZone` if the browser knows it, else UTC. */
export function safeZone(timeZone: string | null | undefined): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timeZone || 'UTC' });
    return timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** "8:45 AM" in the event's zone. */
export function formatTime(iso: string | null, timeZone: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: safeZone(timeZone),
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "8:45 AM – 12:00 PM", or just the start for a point-in-time line. */
export function formatTimeRange(start: string, end: string | null, timeZone: string): string {
  const from = formatTime(start, timeZone);
  return end ? `${from} – ${formatTime(end, timeZone)}` : from;
}

/** "Friday, Oct 9" for a `yyyy-MM-dd` day. */
export function formatDayLabel(date: string, style: 'long' | 'short' = 'long'): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: style === 'long' ? 'long' : 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** The zone's short name for display, e.g. "CDT". */
export function zoneAbbreviation(timeZone: string, at: Date = new Date()): string {
  return (
    new Intl.DateTimeFormat('en-US', { timeZone: safeZone(timeZone), timeZoneName: 'short' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value ?? timeZone
  );
}

/** Every day from `begin` to `end` (ISO instants) in the event's zone. */
export function eventDays(
  begin: string | null | undefined,
  end: string | null | undefined,
  timeZone: string,
): string[] {
  if (!begin) return [];
  const first = toWallClock(begin, timeZone).date;
  const last = end ? toWallClock(end, timeZone).date : first;
  const days: string[] = [];
  const cursor = new Date(`${first}T00:00:00Z`);
  const stop = new Date(`${last}T00:00:00Z`);
  // Bounded so a mistyped end year cannot build a thousand tabs.
  while (cursor <= stop && days.length < 31) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export type SessionPhase = 'upcoming' | 'open' | 'live' | 'ended';

/**
 * Where a session stands right now: `open` while scanning has opened before
 * the start, `live` while it runs, `ended` once its scan window has closed.
 */
export function sessionPhase(
  session: {
    starts_at: string;
    ends_at: string | null;
    checkin_opens_minutes_before: number;
    checkin_closes_minutes_after: number;
  },
  now: number = Date.now(),
): SessionPhase {
  const start = new Date(session.starts_at).getTime();
  const opens = start - session.checkin_opens_minutes_before * 60000;
  const end = session.ends_at ? new Date(session.ends_at).getTime() : start;
  const closes = end + session.checkin_closes_minutes_after * 60000;
  if (now < opens) return 'upcoming';
  if (now < start) return 'open';
  if (now <= closes) return 'live';
  return 'ended';
}

/**
 * The session a door should open on: the one live now, else the next whose
 * check-in opens soonest, else the last one that ended.
 */
export function defaultSession<
  T extends Parameters<typeof sessionPhase>[0] & { starts_at: string },
>(sessions: T[], now: number): T | null {
  if (!sessions.length) return null;
  const sorted = [...sessions].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return (
    sorted.find((s) => sessionPhase(s, now) === 'live') ??
    sorted.find((s) => sessionPhase(s, now) === 'open') ??
    sorted.find((s) => sessionPhase(s, now) === 'upcoming') ??
    sorted[sorted.length - 1]
  );
}

/** `Wed, Oct 14` for a `YYYY-MM-DD` date, without shifting it into the device's timezone. */
export function formatDailySixDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** The device's IANA timezone, e.g. `America/Los_Angeles`. Empty when the browser does not report one. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}

function pad(value: number): string {
  return String(Math.abs(value)).padStart(2, '0');
}

/** The device's wall-clock time as ISO 8601 with its UTC offset, e.g. `2026-10-14T21:30:05-07:00`. */
export function deviceLocalTime(now: Date = new Date()): string {
  const offset = -now.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return `${date}T${time}${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`;
}

/** `YYYY-MM` of the device's current local month. */
export function deviceMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

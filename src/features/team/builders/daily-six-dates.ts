/** `Wed, Oct 14` for a `YYYY-MM-DD` date, without shifting it into the device's timezone. */
export function formatDailySixDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// IANA timezone choices for the event builder. The backend rejects any name not
// in its zone database, so the builder offers a list instead of free text.

export interface TimezoneOption {
  value: string;
  label: string;
}

function supportedTimezones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] };
  try {
    return intl.supportedValuesOf?.('timeZone') ?? [];
  } catch {
    return [];
  }
}

/** Today's offset, e.g. "GMT-4" — or null when the browser does not know the zone. */
function offsetLabel(timeZone: string): string | null {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName');
    return part?.value ?? '';
  } catch {
    return null;
  }
}

export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/**
 * Every zone the browser knows, labelled with its current offset. `UTC` is added
 * because some browsers leave it out, and `current` is kept even when unknown so a
 * stored typo stays visible — marked, so the organiser picks a real zone.
 */
export function timezoneOptions(current: string): TimezoneOption[] {
  const names = Array.from(new Set([current, browserTimezone(), 'UTC', ...supportedTimezones()]));
  return names.filter(Boolean).map((name) => {
    const offset = offsetLabel(name);
    if (offset === null) return { value: name, label: `${name} — not a valid timezone` };
    return { value: name, label: offset ? `${name} (${offset})` : name };
  });
}

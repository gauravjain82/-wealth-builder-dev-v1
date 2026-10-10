// IANA timezone choices for every timezone picker. The backend rejects any name
// not in its zone database, so pickers offer a list instead of free text.

export interface TimezoneOption {
  value: string;
  label: string;
  /** The zone's spoken name, e.g. "Eastern Time", so a search for it matches. */
  keywords?: string;
}

function supportedTimezones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] };
  try {
    return intl.supportedValuesOf?.('timeZone') ?? [];
  } catch {
    return [];
  }
}

/** One named part of today's date in `timeZone` — or null when the browser does not know the zone. */
function zoneName(timeZone: string, style: 'shortOffset' | 'longGeneric' | 'short'): string | null {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: style })
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

const optionCache = new Map<string, TimezoneOption>();

/** Builds a zone's option once; the offset shown is today's, e.g. "GMT-4". */
function optionFor(name: string): TimezoneOption {
  const cached = optionCache.get(name);
  if (cached) return cached;
  const offset = zoneName(name, 'shortOffset');
  const option: TimezoneOption =
    offset === null
      ? { value: name, label: `${name} — not a valid timezone` }
      : {
          value: name,
          label: offset ? `${name} (${offset})` : name,
          keywords: `${zoneName(name, 'longGeneric') ?? ''} ${zoneName(name, 'short') ?? ''}`,
        };
  optionCache.set(name, option);
  return option;
}

/**
 * Every zone the browser knows, labelled with its current offset. `UTC` is added
 * because some browsers leave it out, and `current` is kept even when unknown so a
 * stored typo stays visible — marked, so the organiser picks a real zone.
 */
export function timezoneOptions(current: string): TimezoneOption[] {
  const names = Array.from(new Set([current, browserTimezone(), 'UTC', ...supportedTimezones()]));
  return names.filter(Boolean).map(optionFor);
}

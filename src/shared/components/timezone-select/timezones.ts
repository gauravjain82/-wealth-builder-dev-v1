// IANA timezone choices for every timezone picker. The backend rejects any name
// not in its zone database, so pickers offer a list instead of free text.

export interface TimezoneOption {
  value: string;
  label: string;
  /** The zone's spoken names, e.g. "Eastern Time EST EDT", so a search for one matches. */
  keywords?: () => string;
}

function supportedTimezones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] };
  try {
    return intl.supportedValuesOf?.('timeZone') ?? [];
  } catch {
    return [];
  }
}

type ZoneNameStyle = 'shortOffset' | 'longGeneric' | 'short' | 'long';

/** The zone's name on `date` in `timeZone` — or null when the browser does not know the zone. */
function zoneName(
  timeZone: string,
  style: ZoneNameStyle,
  date: Date = new Date(),
  locale: string = 'en-US',
): string | null {
  try {
    const part = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: style })
      .formatToParts(date)
      .find((p) => p.type === 'timeZoneName');
    return part?.value ?? '';
  } catch {
    return null;
  }
}

export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

// A browser only abbreviates the zones its locale is at home in: "IST" comes from
// en-IN, "BST"/"CET" from en-GB, "AEST" from en-AU. Elsewhere it gives an offset.
const ABBREVIATION_LOCALES = ['en-US', 'en-IN', 'en-GB', 'en-AU'];

/**
 * Every name the zone goes by across the year. Names are seasonal — in October
 * Los Angeles is "PDT", not "PST" — so both a winter and a summer date are read,
 * letting a search for either the standard or the daylight name find the zone.
 */
function searchKeywords(timeZone: string): string {
  const year = new Date().getFullYear();
  const seasons = [new Date(Date.UTC(year, 0, 15)), new Date(Date.UTC(year, 6, 15))];
  const names = new Set<string>([zoneName(timeZone, 'longGeneric') ?? '']);
  for (const season of seasons) {
    for (const locale of ABBREVIATION_LOCALES) {
      names.add(zoneName(timeZone, 'short', season, locale) ?? '');
    }
    names.add(zoneName(timeZone, 'long', season) ?? '');
  }
  return Array.from(names).filter(Boolean).join(' ');
}

/** `searchKeywords`, deferred and computed once — it is the costly part of an option. */
function lazyKeywords(timeZone: string): () => string {
  let keywords: string | null = null;
  return () => (keywords ??= searchKeywords(timeZone));
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
          keywords: lazyKeywords(name),
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

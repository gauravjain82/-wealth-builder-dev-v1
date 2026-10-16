/**
 * Redaction helpers shared by the client error buffer and the page-context collector.
 *
 * Query-string values whose key contains any of the sensitive fragments below are
 * replaced by `[redacted]` (the backend applies the same rule again).
 */

/** Key fragments that mark a query value as sensitive (matched case-insensitively). */
const SENSITIVE_KEY_PATTERN = /token|key|password|secret|code|auth|signature|session/i;

/** Replacement for a sensitive query value. */
export const REDACTED = '[redacted]';

/** Longest string the contract accepts for a single value. */
export const MAX_STRING_LENGTH = 500;

/** Truncate `value` to `max` characters. */
export function clip(value: string, max: number = MAX_STRING_LENGTH): string {
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Redact sensitive values in a query string. Accepts `?a=1&b=2` or `a=1&b=2` and
 * returns `?a=1&b=2` (or '' when empty).
 */
export function redactSearch(search: string): string {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw) return '';
  const params = new URLSearchParams(raw);
  const out = new URLSearchParams();
  params.forEach((value, key) => {
    out.append(key, SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : value);
  });
  const text = out.toString();
  return text ? `?${text}` : '';
}

/**
 * Reduce any URL (absolute or relative) to path + redacted query, dropping the
 * origin and the hash. Unparseable input yields ''.
 */
export function redactUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl, window.location.origin);
    return clip(`${url.pathname}${redactSearch(url.search)}`);
  } catch {
    return '';
  }
}

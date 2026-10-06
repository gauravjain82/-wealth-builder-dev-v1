/**
 * Per-event branding and shared form styling for the public pages.
 *
 * Kept out of `public-event-shell.tsx` because that file exports React
 * components, and mixing component and non-component exports breaks Vite's
 * fast refresh (the `react-refresh/only-export-components` rule).
 */

/** Fallback brand color when an organizer hasn't picked one (the platform gold). */
export const DEFAULT_BRAND_COLOR = '#f5d66a';

/**
 * Normalise an organizer-supplied color into something safe for CSS.
 *
 * `brand_color` is free text on the backend, so anything could be in it. Only
 * 3/6/8-digit hex values are accepted; everything else falls back, which also
 * blocks CSS injection through the custom property the shell sets.
 */
export function brandColor(raw: string | null | undefined): string {
  const value = (raw || '').trim();
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)
    ? value
    : DEFAULT_BRAND_COLOR;
}

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * The accent for a themed page: the organizer's `brand_color` when it is a
 * valid hex, otherwise the theme's own default accent.
 */
export function accentColor(raw: string | null | undefined, themeDefault: string): string {
  const value = (raw || '').trim();
  return HEX_RE.test(value) ? value : themeDefault;
}

/**
 * Pick near-black or white text for legibility on `hex` (WCAG relative
 * luminance; the 0.179 crossover maximises contrast against either choice).
 */
export function readableTextOn(hex: string): string {
  let digits = hex.replace('#', '');
  if (digits.length === 3) digits = digits.replace(/./g, (c) => c + c);
  const channel = (i: number) => {
    const c = parseInt(digits.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance > 0.179 ? '#0b0b0c' : '#ffffff';
}

/**
 * Restyles a field inside a token theme (the shell sets
 * `data-event-surface="tokens"`, e.g. Champion): surface fill, accent hairline,
 * accent focus ring, squarer corners. The attribute variant comes after
 * `dark:` in Tailwind's output at equal specificity, so it wins.
 */
export const TOKEN_FIELD_CLASS =
  '[[data-event-surface=tokens]_&]:rounded-sm [[data-event-surface=tokens]_&]:border-[color:var(--event-hairline)] [[data-event-surface=tokens]_&]:bg-[var(--event-surface)] [[data-event-surface=tokens]_&]:py-2.5 [[data-event-surface=tokens]_&]:text-[color:var(--event-text)] [[data-event-surface=tokens]_&]:placeholder:text-[color:var(--event-muted)] [[data-event-surface=tokens]_&]:focus:border-[color:var(--event-brand)] [[data-event-surface=tokens]_&]:focus:outline-none [[data-event-surface=tokens]_&]:focus:ring-1 [[data-event-surface=tokens]_&]:focus:ring-[color:var(--event-brand)]';

/** Shared input/select/textarea classes so public forms stay visually consistent. */
export const PUBLIC_FIELD_CLASS = `w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 disabled:opacity-60 dark:border-white/20 dark:bg-black/30 dark:text-white dark:placeholder:text-white/50 ${TOKEN_FIELD_CLASS}`;

/**
 * Secondary (outline) button classes for public forms — "Apply", "Remove",
 * "Back to event". Token themes get an accent hairline and uppercase label.
 */
export const PUBLIC_SECONDARY_BUTTON_CLASS =
  'rounded-lg border border-slate-300 px-4 text-sm hover:bg-slate-100 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10 [[data-event-surface=tokens]_&]:rounded-sm [[data-event-surface=tokens]_&]:border-[color:var(--event-hairline-strong)] [[data-event-surface=tokens]_&]:text-xs [[data-event-surface=tokens]_&]:font-bold [[data-event-surface=tokens]_&]:uppercase [[data-event-surface=tokens]_&]:tracking-[0.12em] [[data-event-surface=tokens]_&]:text-[color:var(--event-brand)] [[data-event-surface=tokens]_&]:hover:bg-white/5';

/** Last theme + brand a visitor saw per event, for pre-fetch loading states. */
interface RememberedTheme {
  theme: string;
  brand: string;
}

const THEME_MEMORY_KEY = (shortcut: string) => `wb.eventTheme.${shortcut}`;

/**
 * Remember an event's theme for this tab, so the next public page for the
 * same event (e.g. checkout after landing) can theme its loading and error
 * states before its own fetch returns. Best effort: storage may be blocked.
 */
export function rememberEventTheme(shortcut: string, theme: string, brand: string): void {
  try {
    sessionStorage.setItem(THEME_MEMORY_KEY(shortcut), JSON.stringify({ theme, brand }));
  } catch {
    // Private mode / blocked storage: loading states just use the default theme.
  }
}

/** The remembered theme for `shortcut`, or `null`. */
export function recallEventTheme(shortcut: string | undefined): RememberedTheme | null {
  if (!shortcut) return null;
  try {
    const raw = sessionStorage.getItem(THEME_MEMORY_KEY(shortcut));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedTheme>;
    return typeof parsed.theme === 'string'
      ? { theme: parsed.theme, brand: typeof parsed.brand === 'string' ? parsed.brand : '' }
      : null;
  } catch {
    return null;
  }
}

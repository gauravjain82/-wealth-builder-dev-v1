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

/** Shared input/select/textarea classes so public forms stay visually consistent. */
export const PUBLIC_FIELD_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 disabled:opacity-60 dark:border-white/20 dark:bg-black/30 dark:text-white dark:placeholder:text-white/50';

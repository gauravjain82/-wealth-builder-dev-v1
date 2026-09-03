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

/** Shared input/select/textarea classes so public forms stay visually consistent. */
export const PUBLIC_FIELD_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 disabled:opacity-60 dark:border-white/20 dark:bg-black/30 dark:text-white dark:placeholder:text-white/50';

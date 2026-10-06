/**
 * Fixed set of public event-page themes.
 *
 * A theme is presentation only — color scheme, accent, typography, surfaces,
 * hero layout and section-heading style. Event content is theme-independent,
 * so organizers can switch freely without losing anything.
 *
 * Keys must match the backend `EventTheme` choices (events/models/event.py).
 * To add a theme: add the choice there (plus its no-op AlterField migration),
 * then an entry here.
 */

/** Display-font utility; falls back to the inherited font for themes without one. */
export const DISPLAY_FONT_CLASS = 'font-[family-name:var(--event-font-display,inherit)]';

/** Theme keys, mirrored from the backend `EventTheme` choices. */
export type EventThemeKey = 'classic' | 'bold_dark' | 'minimal_light' | 'champion';

/**
 * How the theme relates to light/dark mode.
 * - `auto`: follow the visitor's app setting (the `.dark` class on `<html>`).
 * - `light` / `dark`: force it, via `data-color-scheme` on the shell (see the
 *   `darkMode` variant in tailwind.config.js).
 */
export type ColorScheme = 'auto' | 'light' | 'dark';

/** Hero layout variants rendered by `EventHero`. */
export type HeroLayout = 'card' | 'immersive' | 'split';

/**
 * Section-heading treatments rendered by `PublicSection`.
 * `impact`: heavy uppercase display type over a small letter-spaced eyebrow,
 * centred, with sections laid out as alternating full-bleed bands (Champion).
 */
export type HeadingStyle = 'brand' | 'eyebrow' | 'serif' | 'impact';

/**
 * Primary call-to-action treatment.
 * - `solid`: flat fill in the accent colour.
 * - `metallic`: an uppercase gradient bar with a soft glow, every stop
 *   derived from `--event-brand` so a custom `brand_color` still works.
 */
export type ButtonStyle = 'solid' | 'metallic';

/** Where the landing countdown renders. */
export type CountdownPlacement = 'hero' | 'band';

/**
 * Fixed palette for themes that force a dark or light scheme and style
 * surfaces from CSS variables rather than Tailwind colour classes. The shell
 * publishes each as a custom property (`--event-page`, `--event-band`,
 * `--event-surface`, `--event-text`, `--event-muted`) plus two hairlines
 * derived from the accent (`--event-hairline`, `--event-hairline-strong`).
 * Hex only: the Stripe card iframe needs literal colours too.
 */
export interface ThemeTokens {
  /** Page background. */
  page: string;
  /** Alternate band background (every other section). */
  band: string;
  /** Card / input surface. */
  surface: string;
  /** Body text. */
  text: string;
  /** Secondary text. */
  muted: string;
}

export interface EventThemeDefinition {
  key: EventThemeKey;
  label: string;
  /** One line for the builder's theme picker. */
  description: string;
  scheme: ColorScheme;
  /** Accent used when the organizer leaves `brand_color` blank. */
  defaultAccent: string;
  /** Google Fonts stylesheet + the families it provides; omit to inherit. */
  fonts?: { href: string; display: string; body: string };
  hero: HeroLayout;
  heading: HeadingStyle;
  /** CTA treatment; omitted means `solid`. */
  button?: ButtonStyle;
  /** Countdown placement; omitted means inside the hero. */
  countdown?: CountdownPlacement;
  /** Label for the primary ticket CTA; omitted uses "Get Tickets — <price>". */
  ctaLabel?: string;
  /** Variable-driven palette (see `ThemeTokens`); omitted for class-styled themes. */
  tokens?: ThemeTokens;
  /** Border radius for call-to-action buttons (any CSS length). */
  buttonRadius: string;
  /** Page background + base text color. */
  pageClass: string;
  /** Header bar once scrolled (and always, except over an immersive hero). */
  headerClass: string;
  /** Surface used by `PublicCard`. */
  cardClass: string;
  /** Picker swatches: page, surface, accent. */
  swatches: [string, string, string];
}

export const EVENT_THEMES: Record<EventThemeKey, EventThemeDefinition> = {
  classic: {
    key: 'classic',
    label: 'Classic',
    description: 'Clean cards on a neutral page. Follows light/dark mode.',
    scheme: 'auto',
    defaultAccent: '#f5d66a',
    hero: 'card',
    heading: 'brand',
    buttonRadius: '0.5rem',
    pageClass: 'bg-slate-50 text-slate-900 dark:bg-[#0b0d12] dark:text-white',
    headerClass:
      'border-b border-slate-200 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-black/30',
    cardClass:
      'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5',
    swatches: ['#f8fafc', '#ffffff', '#f5d66a'],
  },
  bold_dark: {
    key: 'bold_dark',
    label: 'Bold Dark',
    description:
      'Cinematic full-screen hero, near-black page, crimson accent, editorial serif headings.',
    scheme: 'dark',
    defaultAccent: '#e11d2e',
    fonts: {
      href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap',
      display: '"Fraunces", Georgia, "Times New Roman", serif',
      body: '"DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
    },
    hero: 'immersive',
    heading: 'eyebrow',
    buttonRadius: '9999px',
    pageClass: 'bg-[#0a0a0b] text-[#e8e6e6]',
    headerClass: 'border-b border-white/10 bg-[#0a0a0b]/90 backdrop-blur-md',
    cardClass:
      'rounded-2xl border border-white/10 bg-[#17171a] p-6 shadow-[0_14px_34px_-14px_rgba(0,0,0,0.7)]',
    swatches: ['#0a0a0b', '#17171a', '#e11d2e'],
  },
  minimal_light: {
    key: 'minimal_light',
    label: 'Minimal Light',
    description: 'Airy white page, split hero, elegant serif type, square edges.',
    scheme: 'light',
    defaultAccent: '#1f2937',
    fonts: {
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@500;600;700&display=swap',
      display: '"Playfair Display", Georgia, serif',
      body: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    },
    hero: 'split',
    heading: 'serif',
    buttonRadius: '0',
    pageClass: 'bg-white text-slate-800',
    headerClass: 'border-b border-slate-200 bg-white/90 backdrop-blur',
    cardClass: 'border border-slate-200 bg-white p-6',
    swatches: ['#ffffff', '#f8fafc', '#1f2937'],
  },
  champion: {
    key: 'champion',
    label: 'Champion',
    description:
      'Black and gold. Full-screen video hero, heavy uppercase headlines, metallic buttons.',
    scheme: 'dark',
    defaultAccent: '#d4af37',
    fonts: {
      href: 'https://fonts.googleapis.com/css2?family=League+Spartan:wght@800;900&family=Montserrat:wght@400;600;700;800&display=swap',
      display: '"League Spartan", "Montserrat", system-ui, sans-serif',
      body: '"Montserrat", system-ui, -apple-system, "Segoe UI", sans-serif',
    },
    hero: 'immersive',
    heading: 'impact',
    button: 'metallic',
    countdown: 'band',
    ctaLabel: 'Claim your seat',
    tokens: {
      page: '#0b0a08',
      band: '#100e0a',
      surface: '#15120c',
      text: '#f6f1e4',
      muted: '#a89e84',
    },
    buttonRadius: '2px',
    pageClass: 'bg-[var(--event-page)] text-[var(--event-text)]',
    headerClass:
      'border-b border-[color:var(--event-hairline)] bg-[color:color-mix(in_srgb,var(--event-page)_90%,transparent)] backdrop-blur-md',
    cardClass:
      'rounded-md border border-[color:var(--event-hairline)] bg-[var(--event-surface)] p-6 shadow-[inset_0_1px_0_0_var(--event-hairline-strong)]',
    swatches: ['#0b0a08', '#15120c', '#d4af37'],
  },
};

/** Picker order. */
export const EVENT_THEME_LIST: EventThemeDefinition[] = [
  EVENT_THEMES.classic,
  EVENT_THEMES.bold_dark,
  EVENT_THEMES.minimal_light,
  EVENT_THEMES.champion,
];

/** Resolve a (possibly unknown/legacy) key to a theme, defaulting to classic. */
export function getEventTheme(key: string | null | undefined): EventThemeDefinition {
  return (key && EVENT_THEMES[key as EventThemeKey]) || EVENT_THEMES.classic;
}

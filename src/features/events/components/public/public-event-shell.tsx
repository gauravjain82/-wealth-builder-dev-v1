/**
 * Standalone layout for every public event page.
 *
 * These pages render outside `MainLayout` (no sidebar, no auth), so the shell
 * owns the full-viewport chrome. Its other job is theming: it resolves the
 * event's theme (`themes/registry.ts`) and exposes it two ways —
 *
 * - CSS custom properties on the root (`--event-brand`, its readable
 *   `--event-brand-contrast`, `--event-btn-radius`, the theme fonts, the
 *   accent-derived metallic stops `--event-brand-light|deep|glow|ink`, the
 *   hairlines `--event-hairline(-strong)`, and — for themes with `tokens` —
 *   `--event-page|band|surface|text|muted`), so leaf components style
 *   themselves without prop drilling;
 * - `EventThemeContext`, for structural choices (hero layout, heading style,
 *   card surface) made by the shared primitives below.
 *
 * Themes with a fixed color scheme set `data-color-scheme`, which the Tailwind
 * `dark:` variant honours, so existing `dark:` styles apply per theme.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@core/utils';

import {
  DISPLAY_FONT_CLASS,
  getEventTheme,
  type EventThemeDefinition,
} from '../../themes/registry';
import { EventThemeContext, useEventTheme } from '../../themes/theme-context';
import {
  accentColor,
  readableTextOn,
  rememberEventTheme,
} from '../../utils/public-brand';
import { scrollToAnchor, ticketsHref } from '../../utils/ticket-links';
import type { PublicEvent } from '../../types/public';
import { Reveal } from './reveal';

/**
 * Whether sections fade in on scroll. Only the landing page opts in; checkout
 * and ticket pages are task-focused forms where motion would get in the way.
 */
const AnimatedSectionsContext = createContext(false);

/** True once the window has scrolled past `threshold` px. */
function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

/** Inject the theme's Google Fonts stylesheet once per page lifetime. */
function useThemeFonts(href: string | undefined): void {
  useEffect(() => {
    if (!href || document.querySelector(`link[data-event-font="${href}"]`)) {
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.eventFont = href;
    document.head.appendChild(link);
  }, [href]);
}

/** CSS custom properties set by the shell for descendants to use. */
type ThemeStyle = CSSProperties & Record<`--event-${string}`, string | undefined>;

function themeStyle(
  theme: EventThemeDefinition,
  brand: string | null | undefined,
): ThemeStyle {
  // `accent` is a validated hex (see `accentColor`), so interpolating it into
  // the color-mix() values below cannot inject CSS.
  const accent = accentColor(brand, theme.defaultAccent);
  const contrast = readableTextOn(accent);
  return {
    '--event-brand': accent,
    '--event-brand-contrast': contrast,
    '--event-btn-radius': theme.buttonRadius,
    // Metallic CTA stops and glow, all derived from the accent.
    '--event-brand-light': `color-mix(in srgb, ${accent} 55%, white)`,
    '--event-brand-deep': `color-mix(in srgb, ${accent} 78%, black)`,
    '--event-brand-glow': `color-mix(in srgb, ${accent} 55%, transparent)`,
    // Text on the metallic gradient: a near-black tinted by the accent on a
    // light accent (gold → #1c1400-ish), white on a dark one.
    '--event-brand-ink':
      contrast === '#ffffff' ? '#ffffff' : `color-mix(in srgb, ${accent} 13%, black)`,
    '--event-hairline': `color-mix(in srgb, ${accent} 28%, transparent)`,
    '--event-hairline-strong': `color-mix(in srgb, ${accent} 60%, transparent)`,
    ...(theme.tokens
      ? {
          '--event-page': theme.tokens.page,
          '--event-band': theme.tokens.band,
          '--event-surface': theme.tokens.surface,
          '--event-text': theme.tokens.text,
          '--event-muted': theme.tokens.muted,
        }
      : {}),
    ...(theme.fonts
      ? {
          '--event-font-display': theme.fonts.display,
          fontFamily: theme.fonts.body,
        }
      : {}),
  };
}

interface PublicEventShellProps {
  /** Event name, shown beside the logo. */
  eventName?: string;
  logoUrl?: string | null;
  brand?: string | null;
  /** Backend theme key (`classic` when absent or unknown). */
  theme?: string | null;
  /** Public slug, used to link the header back to the landing page. */
  shortcut?: string;
  /** Rendered at the right of the header (e.g. a "Get tickets" button). */
  headerAction?: ReactNode;
  /**
   * Full-bleed content above the main column (the landing hero). Immersive
   * themes float a transparent header over it until the page scrolls.
   */
  hero?: ReactNode;
  /** When true the page uses a narrow, form-oriented column. */
  narrow?: boolean;
  /** Fade sections in as they scroll into view (landing page only). */
  animated?: boolean;
  children: ReactNode;
}

export function PublicEventShell({
  eventName,
  logoUrl,
  brand,
  theme: themeKey,
  shortcut,
  headerAction,
  hero,
  narrow = false,
  animated = false,
  children,
}: PublicEventShellProps) {
  const theme = getEventTheme(themeKey);
  const scrolled = useScrolled();
  useThemeFonts(theme.fonts?.href);

  // Lets the next page for this event theme its loading state (checkout).
  useEffect(() => {
    if (shortcut && themeKey) rememberEventTheme(shortcut, themeKey, brand ?? '');
  }, [shortcut, themeKey, brand]);

  // Over an immersive hero the header starts transparent (white text on the
  // media) and gains its themed bar once the visitor scrolls.
  const overlay = Boolean(hero) && theme.hero === 'immersive';
  const width = narrow ? 'max-w-3xl' : 'max-w-6xl';
  const impact = theme.heading === 'impact';

  return (
    <EventThemeContext.Provider value={theme}>
      <div
        style={themeStyle(theme, brand)}
        data-color-scheme={theme.scheme === 'auto' ? undefined : theme.scheme}
        data-event-theme={theme.key}
        // Token themes restyle shared form fields via this attribute (see
        // PUBLIC_FIELD_CLASS) without any prop drilling.
        data-event-surface={theme.tokens ? 'tokens' : undefined}
        className={cn(
          'min-h-screen',
          // Impact sections paint full-bleed bands wider than the column.
          impact && 'overflow-x-clip',
          theme.pageClass,
        )}
      >
        <header
          className={cn(
            'top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300',
            overlay ? 'fixed inset-x-0' : 'sticky',
            overlay && !scrolled
              ? 'border-b border-transparent bg-transparent text-white'
              : theme.headerClass,
            scrolled && 'shadow-md',
          )}
        >
          <div
            className={cn(
              'mx-auto flex items-center justify-between gap-4 px-4 py-4',
              width,
            )}
          >
            <HeaderIdentity
              eventName={eventName}
              logoUrl={logoUrl}
              shortcut={shortcut}
            />
            {headerAction}
          </div>
        </header>

        {hero}

        <main
          className={cn(
            'mx-auto w-full px-4',
            width,
            impact
              ? hero
                ? 'py-0'
                : 'py-12'
              : theme.hero === 'card' || !hero
                ? 'py-8'
                : 'py-16',
          )}
        >
          <AnimatedSectionsContext.Provider value={animated}>
            {children}
          </AnimatedSectionsContext.Provider>
        </main>

        <footer
          className={cn(
            'border-t py-6 text-center text-xs',
            impact
              ? 'border-[color:var(--event-hairline)] text-[color:var(--event-muted)]'
              : 'mt-8 border-slate-200 text-slate-500 dark:border-white/10 dark:text-white/50',
          )}
        >
          {eventName ? <p className="font-medium">{eventName}</p> : null}
          <p className="mt-1">Powered by WealthBuilder</p>
        </footer>
      </div>
    </EventThemeContext.Provider>
  );
}

/** Logo + event name, linking home to the landing page when we know the slug. */
function HeaderIdentity({
  eventName,
  logoUrl,
  shortcut,
}: Pick<PublicEventShellProps, 'eventName' | 'logoUrl' | 'shortcut'>) {
  const content = (
    <span className="flex items-center gap-3">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={eventName ? `${eventName} logo` : 'Event logo'}
          className="h-10 w-auto max-w-[160px] object-contain"
        />
      ) : null}
      <span className={cn('text-lg font-semibold', DISPLAY_FONT_CLASS)}>
        {eventName || 'Event'}
      </span>
    </span>
  );

  return shortcut ? (
    <Link to={`/event/${shortcut}`} className="hover:opacity-80">
      {content}
    </Link>
  ) : (
    content
  );
}

/** Section spacing per heading style (editorial themes breathe more). */
const SECTION_GAP: Record<EventThemeDefinition['heading'], string> = {
  brand: 'mt-10',
  eyebrow: 'mt-20',
  serif: 'mt-20',
  // Impact sections are contiguous bands; the padding is the gap.
  impact: '',
};

/**
 * Impact band: full-bleed background painted by a pseudo-element (the column
 * stays `max-w-6xl`), alternating page / warm-black on every other rendered
 * section. `nth-of-type` counts only sections that rendered, so a self-hiding
 * empty section never breaks the rhythm.
 */
const IMPACT_BAND = cn(
  'relative isolate py-16 sm:py-24',
  "before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:content-['']",
  '[&:nth-of-type(even)]:before:bg-[var(--event-band)]',
  '[&:not(:first-of-type)]:before:border-t [&:not(:first-of-type)]:before:border-white/[0.06]',
);

/** Horizontal alignment of a section heading. */
export type SectionAlign = 'left' | 'center';

/** A titled content block used to structure the landing page. */
export function PublicSection({
  title,
  eyebrow,
  description,
  children,
  className,
  id,
  align,
}: {
  title?: string;
  /** Small label above the title (rendered by every heading style). */
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** DOM id, for in-page anchors such as `#tickets`. */
  id?: string;
  /** Heading alignment; defaults to centred for `impact`, left otherwise. */
  align?: SectionAlign;
}) {
  const animated = useContext(AnimatedSectionsContext);
  const theme = useEventTheme();
  const impact = theme.heading === 'impact';
  const resolvedAlign = align ?? (impact ? 'center' : 'left');
  const hasHeading = Boolean(title || description || eyebrow);
  const body = (
    <>
      {title ? (
        <SectionTitle title={title} eyebrow={eyebrow} align={resolvedAlign} />
      ) : eyebrow ? (
        <Eyebrow className={resolvedAlign === 'center' ? 'text-center' : undefined}>
          {eyebrow}
        </Eyebrow>
      ) : null}
      {description ? (
        <p
          className={cn(
            impact
              ? 'mt-4 text-base text-[color:var(--event-muted)]'
              : 'mt-1 text-sm text-slate-600 dark:text-white/70',
            theme.heading !== 'brand' && !impact && 'mt-3 text-base',
            resolvedAlign === 'center' && 'mx-auto max-w-2xl text-center',
          )}
        >
          {description}
        </p>
      ) : null}
      <div
        className={
          hasHeading
            ? theme.heading === 'brand'
              ? 'mt-4'
              : impact
                ? 'mt-10 sm:mt-12'
                : 'mt-8'
            : undefined
        }
      >
        {children}
      </div>
    </>
  );

  return (
    <section
      id={id}
      className={cn(
        SECTION_GAP[theme.heading],
        impact ? IMPACT_BAND : 'first:mt-0',
        // Keep anchored sections clear of the sticky/fixed header.
        id && 'scroll-mt-24',
        className,
      )}
    >
      {animated ? <Reveal>{body}</Reveal> : body}
    </section>
  );
}

/**
 * Small accent-coloured, letter-spaced caps label ("KEYNOTE SPEAKERS",
 * "DOORS OPEN IN"). Pass `className` for alignment/spacing.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const theme = useEventTheme();
  return (
    <p
      className={cn(
        'uppercase',
        theme.heading === 'impact'
          ? 'text-[11px] font-bold tracking-[0.32em] sm:text-xs'
          : 'text-xs font-semibold tracking-[0.2em]',
        className,
      )}
      style={{ color: 'var(--event-brand)' }}
    >
      {children}
    </p>
  );
}

/**
 * Section heading in the active theme's style. `PublicSection` renders it for
 * you; use it directly for headings outside a section title slot (e.g. the
 * closing `cta_band`, with `size="display"`).
 */
export function SectionTitle({
  title,
  eyebrow,
  align = 'left',
  size = 'default',
  as: Tag = 'h2',
  className,
}: {
  title: string;
  eyebrow?: string;
  align?: SectionAlign;
  /** `display`: the oversized closing-heading scale (impact only). */
  size?: 'default' | 'display';
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  const theme = useEventTheme();
  const style = theme.heading;
  const center = align === 'center';
  const eyebrowNode = eyebrow ? (
    <Eyebrow className={cn('mb-3', center && 'text-center')}>{eyebrow}</Eyebrow>
  ) : null;

  if (style === 'impact') {
    return (
      <div className={cn(center && 'text-center', className)}>
        {eyebrowNode}
        <Tag
          className={cn(
            'font-black uppercase leading-[0.95] tracking-[-0.01em]',
            size === 'display'
              ? 'text-[clamp(2.5rem,9vw,5.375rem)]'
              : 'text-[clamp(2rem,6vw,3.125rem)]',
            DISPLAY_FONT_CLASS,
          )}
        >
          {title}
        </Tag>
      </div>
    );
  }

  if (style === 'eyebrow') {
    return (
      <div className={cn(center && 'text-center', className)}>
        {eyebrowNode}
        <span
          className={cn('mb-4 block h-1 w-12 rounded-full', center && 'mx-auto')}
          style={{ backgroundColor: 'var(--event-brand)' }}
          aria-hidden="true"
        />
        <Tag
          className={cn(
            'text-3xl font-semibold tracking-tight text-white sm:text-4xl',
            DISPLAY_FONT_CLASS,
          )}
        >
          {title}
        </Tag>
      </div>
    );
  }

  if (style === 'serif') {
    const heading = (
      <Tag
        className={cn(
          'border-b border-slate-200 pb-4 text-3xl font-medium text-slate-900 sm:text-4xl',
          DISPLAY_FONT_CLASS,
          center && 'text-center',
          !eyebrowNode && className,
        )}
      >
        {title}
      </Tag>
    );
    return eyebrowNode ? (
      <div className={className}>
        {eyebrowNode}
        {heading}
      </div>
    ) : (
      heading
    );
  }

  const heading = (
    <Tag
      className={cn(
        'text-xl font-bold',
        center && 'text-center',
        !eyebrowNode && className,
      )}
      style={{ color: 'var(--event-brand)' }}
    >
      {title}
    </Tag>
  );
  return eyebrowNode ? (
    <div className={className}>
      {eyebrowNode}
      {heading}
    </div>
  ) : (
    heading
  );
}

/** A surface card in the active theme's style. */
export function PublicCard({
  children,
  className,
  emphasis = false,
  id,
}: {
  children: ReactNode;
  className?: string;
  /**
   * The one card a section wants to stand out (pricing, the purchase form):
   * a full accent hairline plus, on token themes, a soft accent glow.
   */
  emphasis?: boolean;
  id?: string;
}) {
  const theme = useEventTheme();
  return (
    <div
      id={id}
      className={cn(
        theme.cardClass,
        emphasis &&
          (theme.tokens
            ? 'border-[color:var(--event-hairline-strong)] shadow-[0_0_80px_-30px_var(--event-brand-glow),inset_0_1px_0_0_var(--event-hairline-strong)]'
            : 'ring-1 ring-[color:var(--event-brand)]'),
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Size of a brand CTA. `lg` is the hero / pricing / closing-band button. */
export type BrandButtonSize = 'md' | 'lg';

/**
 * Class + inline style for the primary CTA in the active theme. Shared by
 * `BrandButton` (a `<button>`) and `BrandLink` (a router link or anchor).
 */
function useBrandCta(size: BrandButtonSize, glow: boolean) {
  const theme = useEventTheme();
  if (theme.button === 'metallic') {
    return {
      style: {
        backgroundImage:
          'linear-gradient(180deg, var(--event-brand-light) 0%, var(--event-brand) 60%, var(--event-brand-deep) 100%)',
        color: 'var(--event-brand-ink)',
        borderRadius: 'var(--event-btn-radius)',
      } satisfies CSSProperties,
      className: cn(
        'inline-flex items-center justify-center text-center font-extrabold uppercase tracking-[0.14em] transition',
        'shadow-[0_0_26px_-8px_var(--event-brand-glow),inset_0_1px_0_rgba(255,255,255,0.45)]',
        'hover:brightness-110 motion-safe:hover:-translate-y-px',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100',
        size === 'lg' ? 'px-9 py-4 text-sm' : 'px-6 py-3 text-xs',
        glow && 'motion-safe:animate-event-glow',
      ),
    };
  }
  return {
    style: {
      backgroundColor: 'var(--event-brand)',
      color: 'var(--event-brand-contrast)',
      borderRadius: 'var(--event-btn-radius)',
    } satisfies CSSProperties,
    className: cn(
      size === 'lg' ? 'px-6 py-3 text-sm' : 'px-5 py-2.5 text-sm',
      'font-semibold transition',
      'hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
    ),
  };
}

/** The primary call-to-action, filled with the event's accent color. */
export function BrandButton({
  children,
  className,
  type = 'button',
  size = 'md',
  glow = false,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: BrandButtonSize;
  /** Pulse the metallic glow (motion-safe only). No effect on solid buttons. */
  glow?: boolean;
}) {
  const cta = useBrandCta(size, glow);
  return (
    <button
      type={type}
      style={cta.style}
      className={cn(cta.className, className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * The primary CTA as a link. `to` starting with `/` is a router link,
 * `#anchor` scrolls smoothly in-page, anything else is a plain anchor
 * (external links open in a new tab).
 */
export function BrandLink({
  to,
  children,
  className,
  size = 'md',
  glow = false,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  size?: BrandButtonSize;
  glow?: boolean;
}) {
  const cta = useBrandCta(size, glow);
  const classes = cn(cta.className, className);

  if (to.startsWith('/')) {
    return (
      <Link to={to} style={cta.style} className={classes}>
        {children}
      </Link>
    );
  }
  if (to.startsWith('#')) {
    return (
      <a
        href={to}
        onClick={(e) => scrollToAnchor(e, to.slice(1))}
        style={cta.style}
        className={classes}
      >
        {children}
      </a>
    );
  }
  return (
    <a
      href={to}
      target="_blank"
      rel="noreferrer"
      style={cta.style}
      className={classes}
    >
      {children}
    </a>
  );
}

/**
 * The "get tickets" CTA: scrolls to the inline purchase form (`#tickets`)
 * when the layout has a `checkout` section, otherwise links to the checkout
 * route. Renders whatever `children` you give it; callers decide whether to
 * show it at all (it does not check `sales_state`).
 */
export function TicketsLink({
  event,
  children,
  className,
  size = 'md',
  glow = false,
}: {
  event: Pick<PublicEvent, 'sections' | 'shortcut'>;
  children: ReactNode;
  className?: string;
  size?: BrandButtonSize;
  glow?: boolean;
}) {
  return (
    <BrandLink to={ticketsHref(event)} className={className} size={size} glow={glow}>
      {children}
    </BrandLink>
  );
}

/** A labelled form field wrapper for the public forms. */
export function PublicField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium [[data-event-surface=tokens]_&]:text-xs [[data-event-surface=tokens]_&]:font-bold [[data-event-surface=tokens]_&]:uppercase [[data-event-surface=tokens]_&]:tracking-[0.12em]">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-slate-500 dark:text-white/50 [[data-event-surface=tokens]_&]:text-[color:var(--event-muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/** An inline error banner for public pages. */
export function PublicAlert({
  message,
  tone = 'error',
}: {
  message: string;
  tone?: 'error' | 'info' | 'warning';
}) {
  const tones = {
    error:
      'border-red-300 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200',
    warning:
      'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-300/30 dark:bg-amber-500/10 dark:text-amber-100',
    info: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-white/20 dark:bg-white/5 dark:text-white/80',
  };
  return (
    <div
      className={cn('rounded-lg border px-4 py-3 text-sm', tones[tone])}
      role="alert"
    >
      {message}
    </div>
  );
}

/**
 * Standalone layout for every public event page.
 *
 * These pages render outside `MainLayout` (no sidebar, no auth), so the shell
 * owns the full-viewport chrome. Its other job is theming: it resolves the
 * event's theme (`themes/registry.ts`) and exposes it two ways —
 *
 * - CSS custom properties on the root (`--event-brand`, its readable
 *   `--event-brand-contrast`, `--event-btn-radius`, and the theme fonts), so
 *   leaf components style themselves without prop drilling;
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
import { accentColor, readableTextOn } from '../../utils/public-brand';
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
interface ThemeStyle extends CSSProperties {
  '--event-brand': string;
  '--event-brand-contrast': string;
  '--event-btn-radius': string;
  '--event-font-display'?: string;
}

function themeStyle(
  theme: EventThemeDefinition,
  brand: string | null | undefined,
): ThemeStyle {
  const accent = accentColor(brand, theme.defaultAccent);
  return {
    '--event-brand': accent,
    '--event-brand-contrast': readableTextOn(accent),
    '--event-btn-radius': theme.buttonRadius,
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

  // Over an immersive hero the header starts transparent (white text on the
  // media) and gains its themed bar once the visitor scrolls.
  const overlay = Boolean(hero) && theme.hero === 'immersive';
  const width = narrow ? 'max-w-3xl' : 'max-w-6xl';

  return (
    <EventThemeContext.Provider value={theme}>
      <div
        style={themeStyle(theme, brand)}
        data-color-scheme={theme.scheme === 'auto' ? undefined : theme.scheme}
        data-event-theme={theme.key}
        className={cn('min-h-screen', theme.pageClass)}
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
            theme.hero === 'card' || !hero ? 'py-8' : 'py-16',
          )}
        >
          <AnimatedSectionsContext.Provider value={animated}>
            {children}
          </AnimatedSectionsContext.Provider>
        </main>

        <footer className="mt-8 border-t border-slate-200 py-6 text-center text-xs text-slate-500 dark:border-white/10 dark:text-white/50">
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
};

/** A titled content block used to structure the landing page. */
export function PublicSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const animated = useContext(AnimatedSectionsContext);
  const theme = useEventTheme();
  const hasHeading = Boolean(title || description);
  const body = (
    <>
      {title ? <SectionTitle title={title} style={theme.heading} /> : null}
      {description ? (
        <p
          className={cn(
            'mt-1 text-sm text-slate-600 dark:text-white/70',
            theme.heading !== 'brand' && 'mt-3 text-base',
          )}
        >
          {description}
        </p>
      ) : null}
      <div
        className={
          hasHeading ? (theme.heading === 'brand' ? 'mt-4' : 'mt-8') : undefined
        }
      >
        {children}
      </div>
    </>
  );

  return (
    <section
      className={cn(SECTION_GAP[theme.heading], 'first:mt-0', className)}
    >
      {animated ? <Reveal>{body}</Reveal> : body}
    </section>
  );
}

/** Section heading in the theme's style. */
function SectionTitle({
  title,
  style,
}: {
  title: string;
  style: EventThemeDefinition['heading'];
}) {
  if (style === 'eyebrow') {
    return (
      <div>
        <span
          className="mb-4 block h-1 w-12 rounded-full"
          style={{ backgroundColor: 'var(--event-brand)' }}
          aria-hidden="true"
        />
        <h2
          className={cn(
            'text-3xl font-semibold tracking-tight text-white sm:text-4xl',
            DISPLAY_FONT_CLASS,
          )}
        >
          {title}
        </h2>
      </div>
    );
  }

  if (style === 'serif') {
    return (
      <h2
        className={cn(
          'border-b border-slate-200 pb-4 text-3xl font-medium text-slate-900 sm:text-4xl',
          DISPLAY_FONT_CLASS,
        )}
      >
        {title}
      </h2>
    );
  }

  return (
    <h2 className="text-xl font-bold" style={{ color: 'var(--event-brand)' }}>
      {title}
    </h2>
  );
}

/** A surface card in the active theme's style. */
export function PublicCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const theme = useEventTheme();
  return <div className={cn(theme.cardClass, className)}>{children}</div>;
}

/** The primary call-to-action, filled with the event's accent color. */
export function BrandButton({
  children,
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      style={{
        backgroundColor: 'var(--event-brand)',
        color: 'var(--event-brand-contrast)',
        borderRadius: 'var(--event-btn-radius)',
      }}
      className={cn(
        'px-5 py-2.5 text-sm font-semibold transition',
        'hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
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
      <span className="mb-1 block text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-slate-500 dark:text-white/50">
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

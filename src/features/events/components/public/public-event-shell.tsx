/**
 * Standalone layout for every public event page.
 *
 * These pages render outside `MainLayout` (no sidebar, no auth), so the shell
 * owns the full-viewport chrome. Its other job is theming: an organizer's
 * `brand_color` is injected as the `--event-brand` CSS variable, which the
 * section components below consume. That keeps per-event branding out of every
 * child component and off inline styles scattered through the tree.
 */

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@core/utils';

import { brandColor } from '../../utils/public-brand';

/** CSS custom properties set by the shell for descendants to use. */
interface BrandStyle extends CSSProperties {
  '--event-brand': string;
}

interface PublicEventShellProps {
  /** Event name, shown beside the logo. */
  eventName?: string;
  logoUrl?: string | null;
  brand?: string | null;
  /** Public slug, used to link the header back to the landing page. */
  shortcut?: string;
  /** Rendered at the right of the header (e.g. a "Get tickets" button). */
  headerAction?: ReactNode;
  /** When true the page uses a narrow, form-oriented column. */
  narrow?: boolean;
  children: ReactNode;
}

export function PublicEventShell({
  eventName,
  logoUrl,
  brand,
  shortcut,
  headerAction,
  narrow = false,
  children,
}: PublicEventShellProps) {
  const style: BrandStyle = { '--event-brand': brandColor(brand) };

  return (
    <div
      style={style}
      className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b0d12] dark:text-white"
    >
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-black/30">
        <div
          className={cn(
            'mx-auto flex items-center justify-between gap-4 px-4 py-4',
            narrow ? 'max-w-3xl' : 'max-w-6xl',
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

      <main
        className={cn(
          'mx-auto w-full px-4 py-8',
          narrow ? 'max-w-3xl' : 'max-w-6xl',
        )}
      >
        {children}
      </main>

      <footer className="mt-8 border-t border-slate-200 py-6 text-center text-xs text-slate-500 dark:border-white/10 dark:text-white/50">
        {eventName ? <p className="font-medium">{eventName}</p> : null}
        <p className="mt-1">Powered by WealthBuilder</p>
      </footer>
    </div>
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
      <span className="text-lg font-semibold">{eventName || 'Event'}</span>
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
  return (
    <section className={cn('mt-10 first:mt-0', className)}>
      {title ? (
        <h2 className="text-xl font-bold" style={{ color: 'var(--event-brand)' }}>
          {title}
        </h2>
      ) : null}
      {description ? (
        <p className="mt-1 text-sm text-slate-600 dark:text-white/70">{description}</p>
      ) : null}
      <div className={title || description ? 'mt-4' : undefined}>{children}</div>
    </section>
  );
}

/** A bordered surface card, matching the public-page convention. */
export function PublicCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The primary call-to-action, filled with the event's brand color.
 *
 * Text is forced to near-black because organizer brand colors are typically
 * light/saturated; white text on gold is unreadable.
 */
export function BrandButton({
  children,
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      style={{ backgroundColor: 'var(--event-brand)' }}
      className={cn(
        'rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-950 transition',
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
    <div className={cn('rounded-lg border px-4 py-3 text-sm', tones[tone])} role="alert">
      {message}
    </div>
  );
}

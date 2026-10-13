import type { ReactNode } from 'react';

/** The module's text-control look, both themes. */
export const fieldClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 ' +
  'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 ' +
  'dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40';

export const mutedText = 'text-sm text-slate-600 dark:text-white/60';

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800 dark:text-white/90">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-slate-500 dark:text-white/50">{hint}</p> : null}
    </div>
  );
}

/** A tinted note: `warning` for things to check, `danger` for what will be lost. */
export function Notice({ tone, children }: { tone: 'info' | 'warning' | 'danger'; children: ReactNode }) {
  const tones = {
    info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-100',
    warning:
      'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100',
    danger: 'border-red-300 bg-red-50 text-red-900 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-100',
  }[tone];
  return <div className={`rounded-lg border px-3 py-2 text-sm ${tones}`}>{children}</div>;
}

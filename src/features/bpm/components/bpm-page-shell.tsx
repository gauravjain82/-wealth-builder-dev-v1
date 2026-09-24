import type { ReactNode } from 'react';

interface BPMPageShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function BPMPageShell({ title, description, actions, children }: BPMPageShellProps) {
  return (
    // Full-bleed rather than a centred max-w-6xl column: these are dense
    // working lists (guest check-in, invites) and the brief asks for the cards
    // to fill the available area instead of leaving wide empty side margins.
    // Side padding is kept so the content never touches the viewport edge.
    <main className="w-full px-4 py-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-white/60">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </main>
  );
}

interface BPMCardProps {
  children: ReactNode;
  className?: string;
}

export function BPMCard({ children, className }: BPMCardProps) {
  return (
    <section
      className={[
        'rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5',
        className || '',
      ]
        .join(' ')
        .trim()}
    >
      {children}
    </section>
  );
}

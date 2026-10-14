import type { ReactNode } from 'react';

/** The tooltip card every metrics chart uses: text in theme ink, never the series colour. */
export function ChartTooltipCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/15 dark:bg-[#1e2431]">
      <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
      <div className="mt-1 space-y-0.5 text-slate-600 dark:text-white/70">{children}</div>
    </div>
  );
}

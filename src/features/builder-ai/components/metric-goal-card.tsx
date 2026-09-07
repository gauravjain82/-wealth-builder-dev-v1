/** A single "current / goal" KPI card with a progress bar (Recruits, Points, ...). */

import type { BuilderMetricCard } from '../services/builder-ai-service';

const ACCENTS: Record<string, string> = {
  recruits: 'text-blue-600 bg-blue-500',
  points: 'text-emerald-600 bg-emerald-500',
  licenses: 'text-rose-600 bg-rose-500',
  registrations: 'text-amber-600 bg-amber-500',
};

function formatValue(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return String(value);
  return Number.isInteger(num) ? num.toLocaleString() : num.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

export function MetricGoalCard({ card }: { card: BuilderMetricCard }) {
  const accent = ACCENTS[card.key] ?? 'text-gray-600 bg-gray-500';
  const [textAccent, barAccent] = accent.split(' ');
  const pct = Math.min(card.pct, 100);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${barAccent}`} />
        <span className="text-sm font-medium text-gray-600 dark:text-white/70">{card.label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatValue(card.current)}
        </span>
        <span className="text-lg text-gray-400">/ {formatValue(card.goal)}</span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div className={`h-full rounded-full ${barAccent}`} style={{ width: `${pct}%` }} />
      </div>
      <div className={`mt-1 text-xs font-medium ${textAccent}`}>{card.pct}% of goal</div>
    </div>
  );
}

export function MetricGoalCardGrid({ cards }: { cards: BuilderMetricCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <MetricGoalCard key={card.key} card={card} />
      ))}
    </div>
  );
}

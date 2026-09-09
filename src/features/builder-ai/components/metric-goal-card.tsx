/** A compact KPI card matching the Builder AI mockup style. */

import type { BuilderMetricCard } from '../services/builder-ai-service';
import { Award, ClipboardCheck, Target, UserPlus } from 'lucide-react';

const ACCENTS = {
  recruits: { bar: 'from-blue-400 to-blue-600', edge: 'border-r-blue-500', icon: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10', glow: 'hover:shadow-blue-500/10', Icon: UserPlus },
  points: { bar: 'from-emerald-400 to-emerald-600', edge: 'border-r-emerald-500', icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10', glow: 'hover:shadow-emerald-500/10', Icon: Target },
  licenses: { bar: 'from-rose-400 to-rose-600', edge: 'border-r-rose-500', icon: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10', glow: 'hover:shadow-rose-500/10', Icon: Award },
  registrations: { bar: 'from-amber-400 to-orange-500', edge: 'border-r-amber-500', icon: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10', glow: 'hover:shadow-amber-500/10', Icon: ClipboardCheck },
};

function formatValue(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return String(value);
  return Number.isInteger(num) ? num.toLocaleString() : num.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

export function MetricGoalCard({ card }: { card: BuilderMetricCard }) {
  const accent = ACCENTS[card.key as keyof typeof ACCENTS] ?? ACCENTS.recruits;
  const progress = Number(card.goal) > 0 ? Math.min((Number(card.current) / Number(card.goal)) * 100, 100) : 0;
  const { Icon } = accent;

  return (
    <div className={`group rounded-2xl border border-r-[3px] border-[#e6ded6] bg-gradient-to-br from-white to-[#fdfbf9] p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.055)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(28,25,23,0.05),0_14px_32px_rgba(28,25,23,0.09)] ${accent.edge} ${accent.glow} dark:from-[#232934] dark:to-[#1b202a]`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${accent.icon}`}>
            <Icon size={19} strokeWidth={2.1} />
          </span>
          <span className="text-sm font-semibold text-[#3d3a38] dark:text-slate-200">{card.label}</span>
        </div>
        <span className="text-2xl font-black tracking-[-0.04em] text-[#1d1b1a] dark:text-white">
          {formatValue(card.current)}
        </span>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#eeeae6] dark:bg-black/20">
        <div className={`h-full rounded-full bg-gradient-to-r ${accent.bar} transition-[width] duration-500`} style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-[#7a7572] dark:text-slate-400">
        <span>{Number(card.current) === 0 && Number(card.goal) === 0 ? 'No activity yet' : 'Progress'}</span>
        <span className="font-semibold">{formatValue(card.current)} of {formatValue(card.goal)}</span>
      </div>
    </div>
  );
}

export function MetricGoalCardGrid({ cards }: { cards: BuilderMetricCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <MetricGoalCard key={card.key} card={card} />
      ))}
    </div>
  );
}

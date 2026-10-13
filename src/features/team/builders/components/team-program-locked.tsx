import { Lock } from 'lucide-react';
import { Block } from '@/shared/components';
import type { TeamProgram } from '../team-programs';

const DAILY_SIX = [
  'Make new friends',
  'Make your calls',
  'Set appointments',
  'Preplan tomorrow',
  'Read your business plan, morning and night',
  'Read 10 pages of a book',
];

/**
 * What someone below the program's minimum plan, and not flagged into the
 * program, sees: the page title and an invitation, and nothing else. It
 * fetches nothing.
 */
export function TeamProgramLocked({ program }: { program: TeamProgram }) {
  const { label, pluralLabel } = program;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto p-2">
      <Block title={pluralLabel} description="" titleVariant="h4" className="mb-2 flex-shrink-0" />

      <div className="mx-auto mt-6 w-full max-w-[580px] rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/40 bg-amber-400/10 text-amber-600 dark:text-amber-400">
          <Lock size={20} />
        </div>
        <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">Become a {label}</h2>
        <p className="text-sm leading-6 text-slate-500 dark:text-white/60">
          {pluralLabel} show up every day, log their Daily Six morning and night, and compete on the results and
          activity leaderboards.
        </p>

        <ul className="mx-auto mt-5 grid max-w-sm gap-2 text-left">
          {DAILY_SIX.map((item, index) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-white/80"
            >
              <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">{index + 1}</span>
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-white/50">
          Ask your leader what it takes to become a {label}.
        </p>
      </div>
    </div>
  );
}

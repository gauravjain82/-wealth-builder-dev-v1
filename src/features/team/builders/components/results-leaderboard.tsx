import type { ResultsLeaderboardEntry } from '../services/builders-service';
import { LeaderboardShell } from './leaderboard-shell';
import { ScoreBar } from './score-bar';

interface ResultsLeaderboardProps {
  rows: ResultsLeaderboardEntry[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function formatNumber(value: number | string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return parsed.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function ResultsLeaderboard({
  rows,
  loading,
  error,
  onRefresh,
}: ResultsLeaderboardProps) {
  return (
    <LeaderboardShell
      title="Results Leaderboard"
      description="Top 20 builders ranked against fixed Builder targets for recruits, points, licenses, and registrations."
      loading={loading}
      error={error}
      onPaceChange={() => undefined}
      onRefresh={onRefresh}
    >
      <div className="overflow-auto rounded-lg border border-slate-200 dark:border-white/10">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-white/60">
            <tr>
              <th className="w-16 px-4 py-3 text-center">#</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-center">Recruits</th>
              <th className="px-4 py-3 text-center">Points</th>
              <th className="px-4 py-3 text-center">Lic</th>
              <th className="px-4 py-3 text-center">Reg</th>
              <th className="px-4 py-3 text-left">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.user_id} className="border-t border-slate-200 dark:border-white/10">
                <td className="px-4 py-3 text-center text-lg font-bold text-slate-400 dark:text-white/40">
                  {row.rank}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900 dark:text-white">{row.name}</div>
                  <div className="text-xs text-slate-500 dark:text-white/50">{row.leader || 'No leader'}</div>
                </td>
                <td className="px-4 py-3 text-center font-semibold">{row.recruits}</td>
                <td className="px-4 py-3 text-center font-semibold">{formatNumber(row.points)}</td>
                <td className="px-4 py-3 text-center font-semibold">{row.licenses}</td>
                <td className="px-4 py-3 text-center font-semibold">{row.registrations}</td>
                <td className="px-4 py-3">
                  <ScoreBar value={row.score} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-white/60">
                  No results leaderboard records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </LeaderboardShell>
  );
}

import type { ActivityLeaderboardEntry, BuilderPace } from '../services/builders-service';
import { LeaderboardShell } from './leaderboard-shell';
import { ScoreBar } from './score-bar';

interface ActivityLeaderboardProps {
  paces: BuilderPace[];
  paceId: number | null;
  rows: ActivityLeaderboardEntry[];
  loading: boolean;
  error: string | null;
  onPaceChange: (paceId: number) => void;
  onRefresh: () => void;
}

function percent(value: number): string {
  return `${Math.round(value)}%`;
}

export function ActivityLeaderboard({
  paces,
  paceId,
  rows,
  loading,
  error,
  onPaceChange,
  onRefresh,
}: ActivityLeaderboardProps) {
  return (
    <LeaderboardShell
      title="Activity Leaderboard"
      description="Top 20 builders ranked by Daily Six activity against their own pace targets."
      paceId={paceId}
      paces={paces}
      loading={loading}
      error={error}
      onPaceChange={onPaceChange}
      onRefresh={onRefresh}
    >
      <div className="overflow-auto rounded-lg border border-slate-200 dark:border-white/10">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-white/60">
            <tr>
              <th className="w-16 px-4 py-3 text-center">#</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-center">Friends</th>
              <th className="px-4 py-3 text-center">Calls</th>
              <th className="px-4 py-3 text-center">Appts</th>
              <th className="px-4 py-3 text-center">Streak</th>
              <th className="px-4 py-3 text-left">7-Day Activity Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.user_id} className="border-t border-slate-200 dark:border-white/10">
                <td className="px-4 py-3 text-center text-lg font-bold text-slate-400 dark:text-white/40">
                  {row.rank}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{row.name}</td>
                <td className="px-4 py-3 text-center font-semibold">{percent(row.friends_pct)}</td>
                <td className="px-4 py-3 text-center font-semibold">{percent(row.calls_pct)}</td>
                <td className="px-4 py-3 text-center font-semibold">{percent(row.appts_pct)}</td>
                <td className="px-4 py-3 text-center font-semibold text-amber-600 dark:text-amber-300">
                  {row.streak || '-'}
                </td>
                <td className="px-4 py-3">
                  <ScoreBar value={row.activity_score} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-white/60">
                  No activity leaderboard records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </LeaderboardShell>
  );
}

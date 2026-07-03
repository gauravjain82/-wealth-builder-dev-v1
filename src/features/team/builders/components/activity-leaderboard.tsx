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

const ACTIVITY_METRICS = ['Friends', 'Calls', 'Appointments', 'Preplan', 'Business plan', '10 pages'];

function percent(value: number): string {
  return `${Math.round(value)}%`;
}

function MetricTag({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
      {label}
    </span>
  );
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
      title="Activity Leaderboard - Top 20"
      description="The grind board. Scored on the Daily Six against each person's own goal, so a part-timer at 90% of their target outranks a full-timer at 60% of theirs. Rolling average of the last 14 submissions (7 days, morning and night)."
      paceId={paceId}
      paces={paces}
      loading={loading}
      error={error}
      onPaceChange={onPaceChange}
      onRefresh={onRefresh}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-4 flex flex-shrink-0 flex-wrap gap-2">
          {ACTIVITY_METRICS.map((metric) => (
            <MetricTag key={metric} label={metric} />
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-white/10">
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
                <td className="px-4 py-3 text-center">
                  {row.streak ? (
                    <span className="inline-flex items-center justify-center gap-1 font-extrabold text-[#ffad32]">
                      <span aria-hidden="true">🔥</span>
                      <span>{row.streak}</span>
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-400 dark:text-white/40">-</span>
                  )}
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
      </div>
    </LeaderboardShell>
  );
}

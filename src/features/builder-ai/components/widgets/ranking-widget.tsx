/**
 * RankingWidget — a leaderboard: top builders by a metric.
 *
 * Two modes, chosen by config (Decision 29 — one component, no page `if/else`):
 *
 * - **Leaderboard mode** (`widget.config.leaderboard = "<code>"`): self-fetches the
 *   Phase 5 endpoint `/api/builder/leaderboards/{code}/`, which ranks builders from the
 *   precomputed aggregates server-side (Decision 12/26 — no live tree walk). Renders a
 *   rich ranked list: medal/rank, avatar (Company-Owner gold accent), name + level, and
 *   a value bar in the metric's colour (plan §856 — avatars/medals).
 * - **Fallback mode** (no leaderboard code): keeps the original `/breakdown?group_by=
 *   member` horizontal bar chart so ad-hoc ranking widgets still work.
 */

import { Card } from '@shared/components';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useBreakdown, useLeaderboard } from '../../hooks/use-builder-ai';
import { levelAccentHex, metricColorHex } from '../../theme';
import type { DashboardScope, LeaderboardPayload, LeaderboardRow, WidgetPayload } from '../../types';

export interface RankingWidgetProps {
  widget: WidgetPayload;
  scope: DashboardScope;
}

/** Medal glyph for the podium; plain `#n` below the top three. */
function rankBadge(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
}

/** Initials fallback for a missing avatar (mirrors the roster row). */
function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/** Compact value formatting (e.g. 360,000 → "360K") with an optional unit. */
function formatValue(value: number, unit?: string): string {
  const formatted =
    Math.abs(value) >= 1000
      ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
      : value.toLocaleString();
  return unit ? `${formatted} ${unit}` : formatted;
}

/** Render one ranked builder row with a proportional value bar. */
function LeaderboardListRow({ row, max, color }: { row: LeaderboardRow; max: number; color: string }) {
  const width = max > 0 ? Math.max((row.value / max) * 100, 2) : 0;
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="w-7 shrink-0 text-center text-sm font-semibold tabular-nums text-slate-500 dark:text-white/60">
        {rankBadge(row.rank)}
      </span>
      {row.avatar ? (
        <img
          src={row.avatar}
          alt={row.name}
          className="h-8 w-8 shrink-0 rounded-full object-cover"
          style={{ boxShadow: `0 0 0 2px ${levelAccentHex(row.is_company_owner)}` }}
        />
      ) : (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-white/80"
          style={{ boxShadow: `0 0 0 2px ${levelAccentHex(row.is_company_owner)}` }}
        >
          {initials(row.name)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{row.name}</span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
            {formatValue(row.value)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          {row.level_code && (
            <span className="shrink-0 rounded bg-slate-100 px-1 text-[11px] font-medium text-slate-500 dark:bg-white/10 dark:text-white/50">
              {row.level_code}
            </span>
          )}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
          </div>
        </div>
      </div>
    </li>
  );
}

/** Render the ranked leaderboard list (leaderboard mode). */
function LeaderboardList({
  title,
  payload,
  isLoading,
}: {
  title: string;
  payload: LeaderboardPayload | undefined;
  isLoading: boolean;
}) {
  const rows = payload?.rows ?? [];
  const color = metricColorHex(payload?.metric.code ?? '', payload?.metric.display?.color as string | undefined);
  const max = rows.reduce((acc, row) => Math.max(acc, row.value), 0);

  return (
    <Card className="p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
        {payload?.metric?.name && (
          <div className="text-xs text-slate-400 dark:text-white/40">{payload.metric.name}</div>
        )}
      </div>
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">No data yet</div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {rows.map((row) => (
            <LeaderboardListRow key={row.builder_id} row={row} max={max} color={color} />
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Render a ranking widget (leaderboard list, or the breakdown bar-chart fallback). */
export function RankingWidget({ widget, scope }: RankingWidgetProps) {
  const boardCode = typeof widget.config?.leaderboard === 'string' ? widget.config.leaderboard : '';

  // Both hooks are declared unconditionally (Rules of Hooks); only the relevant
  // one is enabled, so exactly one request fires.
  const leaderboard = useLeaderboard(boardCode, { enabled: Boolean(boardCode) });

  const code = widget.metric?.code ?? '';
  const limit = (widget.config?.limit as number) ?? 8;
  const breakdown = useBreakdown({
    metric: code,
    scope,
    group_by: 'member',
    enabled: !boardCode && Boolean(code),
  });

  // Leaderboard mode — the real Phase 5 ranked read path.
  if (boardCode) {
    return (
      <LeaderboardList
        title={widget.title || leaderboard.data?.name || 'Leaderboard'}
        payload={leaderboard.data}
        isLoading={leaderboard.isLoading}
      />
    );
  }

  // Fallback mode — group members by contribution (pre-Phase-5 behaviour).
  const color = metricColorHex(code, widget.metric?.display?.color as string | undefined);
  const rows = [...(breakdown.data?.groups ?? [])]
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((g) => ({ name: g.key, value: g.value }));

  return (
    <Card className="p-4">
      <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
        {widget.title || `Top ${widget.metric?.name ?? 'members'}`}
      </div>
      <div className="h-56">
        {breakdown.isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-slate-400"
              />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {rows.map((row) => (
                  <Cell key={row.name} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

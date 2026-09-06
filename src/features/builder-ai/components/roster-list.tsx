/**
 * RosterList — the core builder roster widget: a searchable list of builders
 * with attainment rings and per-metric bars. Search filters by name/agency code
 * (server-side via the roster endpoint's `search` param).
 */

import { Card, Input, LoadingState, NonIdealState } from '@shared/components';
import { Search } from 'lucide-react';
import { RosterRow } from './roster-row';
import type { RosterRow as RosterRowData, RosterPayload } from '../types';

export interface RosterListProps {
  data: RosterPayload | undefined;
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onRemove?: (row: RosterRowData) => void;
}

/** Render the roster card with a search box and one row per builder. */
export function RosterList({
  data,
  isLoading,
  search,
  onSearchChange,
  onRemove,
}: RosterListProps) {
  const rows = data?.rows ?? [];
  const metrics = data?.metrics ?? [];

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Builder roster</h3>
        <div className="relative w-56 max-w-full">
          <Search
            size={15}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            variant="surface"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name or agent code"
            className="pl-7"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState title="Loading roster" description="Fetching builders…" />
      ) : rows.length === 0 ? (
        <NonIdealState
          title="No builders yet"
          description="Invite members from your direct team to populate this roster."
        />
      ) : (
        <div className="rounded-lg border border-slate-100 dark:border-white/5">
          {rows.map((row) => (
            <RosterRow key={row.builder_id} row={row} metrics={metrics} onRemove={onRemove} />
          ))}
        </div>
      )}
    </Card>
  );
}

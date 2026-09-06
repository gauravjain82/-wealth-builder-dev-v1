/**
 * DashboardView — the shared Builder dashboard shell for Home/Company/BaseShop.
 *
 * Top bar (period + search + segment control) → config-driven widget sections
 * (painted by the WidgetFactory, so the KPI list is never hardcoded, Decision 10)
 * → the builder roster. The segment control flips the segment in place, mirroring
 * the live BDC dashboard. All numbers are precomputed reads (Decision 12); the
 * `as_of` badge shows how fresh they are.
 */

import { useMemo, useState } from 'react';
import { Inbox, Lock } from 'lucide-react';
import { Badge, ErrorState, LoadingState, NonIdealState } from '@shared/components';
import { useDashboard, useInvitationMutations, useRoster } from '../hooks/use-builder-ai';
import { HttpError, isNoBuilderProgramError } from '../services/http';
import { WidgetFactory } from './widgets/widget-factory';
import { RosterList } from './roster-list';
import { SegmentControl } from './segment-control';
import { RemoveBuilderModal } from './remove-builder-modal';
import type { DashboardScope, RosterRow } from '../types';

export interface DashboardViewProps {
  /** Page title (e.g. "Home", "Company", "BaseShop"). */
  title: string;
  /** Initial/anchor segment for the page. */
  initialScope: DashboardScope;
  /** Segments the in-place control may switch to (defaults to all three). */
  scopeOptions?: DashboardScope[];
  /** Whether roster rows expose a Remove action (direct-team leaders). */
  allowRemove?: boolean;
}

/** Format an ISO timestamp as a short "updated" label. */
function freshness(asOf: string | null): string {
  if (!asOf) return 'No data yet';
  const when = new Date(asOf);
  return `Updated ${when.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

/** Format a period as a human month/range label. */
function periodLabel(start: string | undefined, type: string | undefined): string {
  if (!start) return '';
  const date = new Date(start);
  if (type === 'MONTHLY' || !type) {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Render the Builder dashboard for a given anchor segment. */
export function DashboardView({
  title,
  initialScope,
  scopeOptions,
  allowRemove = false,
}: DashboardViewProps) {
  const [scope, setScope] = useState<DashboardScope>(initialScope);
  const [search, setSearch] = useState('');
  const [removeTarget, setRemoveTarget] = useState<RosterRow | null>(null);

  const dashboard = useDashboard(scope);
  const roster = useRoster(scope, search);
  const { remove } = useInvitationMutations();

  const sections = useMemo(
    () => [...(dashboard.data?.sections ?? [])].sort((a, b) => a.order - b.order),
    [dashboard.data],
  );

  if (dashboard.isError) {
    const status = dashboard.error instanceof HttpError ? dashboard.error.status : undefined;
    const noProgram = isNoBuilderProgramError(dashboard.error);

    // Not a failure — a calm empty state. "No matching builder program" means the
    // viewer simply isn't enrolled in a program; 403 means they lack access to this
    // segment. Neither is retryable, so no "Something went wrong" / Retry. (A stray
    // 404 that isn't the program signal falls through to the real error state.)
    if (noProgram || status === 403) {
      return (
        <div className="space-y-5">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
          {noProgram ? (
            <NonIdealState
              icon={<Inbox size={28} strokeWidth={1.5} />}
              title="Nothing to show yet"
              description="You're not part of a builder program yet, so there's no dashboard data to display."
            />
          ) : (
            <NonIdealState
              icon={<Lock size={28} strokeWidth={1.5} />}
              title="No access to this dashboard"
              description="You don't have permission to view this dashboard. Contact your leader if you think this is a mistake."
            />
          )}
        </div>
      );
    }

    // Genuine failure (network / 5xx) — keep the retryable error state.
    return (
      <ErrorState
        pageHeading={title}
        description={(dashboard.error as Error)?.message ?? 'Failed to load the dashboard.'}
        onRetry={() => dashboard.refetch()}
      />
    );
  }

  const period = dashboard.data?.period;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <div className="mt-0.5 flex items-center gap-2 text-sm text-slate-500 dark:text-white/60">
            {period && <span>{periodLabel(period.start_date, period.type)}</span>}
            <Badge variant="secondary">{freshness(dashboard.data?.as_of ?? null)}</Badge>
          </div>
        </div>
        <SegmentControl value={scope} onChange={setScope} options={scopeOptions} />
      </div>

      {dashboard.isLoading ? (
        <LoadingState title="Loading dashboard" description="Fetching your KPIs…" />
      ) : (
        <>
          {/* Config-driven widget sections */}
          {sections.map((section) => (
            <section key={`${section.title}-${section.order}`} className="space-y-3">
              {section.title && (
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-white/60">
                  {section.title}
                </h2>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[...section.widgets]
                  .sort((a, b) => a.order - b.order)
                  .map((widget, index) => (
                    <WidgetFactory key={`${widget.type}-${index}`} widget={widget} scope={scope} />
                  ))}
              </div>
            </section>
          ))}

          {/* Roster */}
          <RosterList
            data={roster.data}
            isLoading={roster.isLoading}
            search={search}
            onSearchChange={setSearch}
            onRemove={allowRemove ? setRemoveTarget : undefined}
          />
        </>
      )}

      <RemoveBuilderModal
        target={removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={async (reason) => {
          if (!removeTarget) return;
          await remove.mutateAsync({ profileId: removeTarget.builder_id, reason });
          setRemoveTarget(null);
        }}
        isSubmitting={remove.isPending}
      />
    </div>
  );
}

/**
 * The contest card — the piece that owns containment.
 *
 * This component replaces the `<CanvaVideoCard title="Event & Contests">` placeholder
 * on `/home-v2`. The host decides how big it is: on that page it sits in a two-column
 * grid beside the "Recognition" card, whose `aspect-ratio: 3 / 2` sets the row height,
 * and grid `align-items: stretch` hands that height here. Nothing in this component or
 * its stylesheet sets a pixel height, a `vh` unit, or a content-driven minimum — see
 * the containment contract at the top of `contests.css`.
 *
 * The consequence for anyone editing this file: the header, meta line, tier strip and
 * filter summary are fixed-size rows, and `.wb-ct-scroll` is the single flexible one.
 * Adding another `flex: 1` child, or dropping a `min-height: 0`, turns internal
 * scrolling into page growth and the failure is silent.
 *
 * All four overlays go through the shared `Modal`, which portals to `document.body`,
 * so `overflow: hidden` here cannot clip them.
 */

import { useMemo, useState } from 'react';

import { Modal } from '@/shared/components/ui/modal';

import '../contests.css';
import { useContests, useStandings } from '../hooks/use-contests';
import type {
  FilterDraft,
  MetricProgress,
  StandingRow,
  StandingsQuery,
  TierSummary,
} from '../types';
import { ContestFilters } from './contest-filters';
import {
  FlyerDialog,
  HelpDialog,
  ProfileDialog,
  ProofDialog,
  type ProofTarget,
} from './contest-dialogs';
import { ContestStandings } from './contest-standings';
import { TierSelector } from './tier-selector';

const DEFAULT_FILTERS: FilterDraft = {
  personId: null,
  personLabel: '',
  scope: 'base',
  net: false,
  leaders: true,
  agents: true,
};

interface ContestsCardProps {
  /** Rendered inside the host's own card chrome when false. Defaults to true. */
  withChrome?: boolean;
}

export function ContestsCard({ withChrome = true }: ContestsCardProps) {
  const { data: contests, isLoading: loadingContests } = useContests();

  const [contestId, setContestId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [selectedTiers, setSelectedTiers] = useState<number[]>([]);
  const [sortTier, setSortTier] = useState<number | null>(null);
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(50);

  const [showFilters, setShowFilters] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [flyerFor, setFlyerFor] = useState<number | null>(null);
  const [proofTarget, setProofTarget] = useState<ProofTarget | null>(null);
  const [profileTarget, setProfileTarget] =
    useState<{ contestId: number; agentId: number; name: string } | null>(null);

  // The selector prioritises active contests, which the backend already sorts for.
  const activeContestId = contestId ?? contests?.[0]?.id ?? null;
  const contest = contests?.find((item) => item.id === activeContestId) ?? null;

  const query: StandingsQuery | null = useMemo(
    () =>
      activeContestId === null
        ? null
        : {
            ...filters,
            contestId: activeContestId,
            tierIds: selectedTiers,
            sortTier,
            direction,
          },
    [activeContestId, filters, selectedTiers, sortTier, direction]
  );

  const { data, isLoading, isFetching, isError, error } = useStandings(query);

  /** Toggling the sorted tier flips direction; a new tier starts descending. */
  const handleSort = (tierId: number) => {
    if (sortTier === tierId) {
      setDirection((current) => (current === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortTier(tierId);
      setDirection('desc');
    }
  };

  const openProof = (row: StandingRow, tier: TierSummary, metric: MetricProgress) => {
    if (activeContestId === null) return;
    setProofTarget({
      contestId: activeContestId,
      tierId: tier.id,
      agentId: row.agent_id,
      agentName: row.name || row.agency_code,
      tierName: tier.name,
      metric: metric.metric,
    });
  };

  const openProfile = (agentId: number, name: string) => {
    if (activeContestId === null) return;
    setProfileTarget({ contestId: activeContestId, agentId, name });
  };

  const body = (
    <div className="wb-ct">
      <div className="wb-ct-header">
        {contests && contests.length > 1 ? (
          <select
            className="wb-ct-title"
            aria-label="Contest"
            value={activeContestId ?? ''}
            onChange={(event) => {
              setContestId(Number(event.target.value));
              setSelectedTiers([]);
              setSortTier(null);
            }}
          >
            {contests.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        ) : (
          <h3 className="wb-ct-title">{contest?.name ?? 'Contests'}</h3>
        )}

        <div className="wb-ct-header-actions">
          {contest?.has_visible_flyer ? (
            <button
              type="button"
              className="wb-ct-pill"
              onClick={() => setFlyerFor(activeContestId)}
            >
              Flyer
            </button>
          ) : null}
          <button
            type="button"
            className="wb-ct-pill"
            onClick={() => setShowFilters(true)}
          >
            Filters
          </button>
          <button type="button" className="wb-ct-pill" onClick={() => setShowHelp(true)}>
            Help
          </button>
        </div>
      </div>

      {contest ? (
        <div className="wb-ct-meta">
          <span
            className={`wb-ct-badge wb-ct-badge--${contest.status === 'active' ? 'active' : 'ended'}`}
          >
            {contest.status}
          </span>
          <span>{contest.period_label}</span>
          {isFetching ? <span aria-live="polite">Updating…</span> : null}
        </div>
      ) : null}

      {data ? (
        <>
          {data.show_tier_overview ? (
            <TierSelector
              tiers={data.tiers}
              selected={selectedTiers}
              showCounts={data.show_tier_overview}
              onChange={setSelectedTiers}
            />
          ) : null}

          <p className="wb-ct-applied">
            {describeFilters(filters)}
            {data.uncoded_member_count > 0
              ? ` · ${data.uncoded_member_count} without an agent code are not in these results`
              : ''}
          </p>

          {/* Decision C5: BR/BP/LIC count one hop of Leader, so any view using them
              says so rather than letting the number be read as a base-shop figure. */}
          {data.team_credit_note ? (
            <p className="wb-ct-note">{data.team_credit_note}</p>
          ) : null}
        </>
      ) : null}

      <div
        className="wb-ct-scroll"
        tabIndex={0}
        role="region"
        aria-label="Contest standings"
      >
        {loadingContests || isLoading ? (
          <p className="wb-ct-state">Loading standings…</p>
        ) : isError ? (
          <p className="wb-ct-state" role="alert">
            {(error as Error)?.message ?? 'Standings could not be loaded.'}
          </p>
        ) : !contests?.length ? (
          <p className="wb-ct-state">There are no contests running right now.</p>
        ) : data ? (
          <ContestStandings
            rows={data.rows.slice(0, pageSize)}
            tiers={data.tiers}
            sortTier={data.sort_tier}
            direction={data.direction}
            showNearQualifiers={data.show_near_qualifiers}
            hasMore={data.rows.length > pageSize || Boolean(data.next_cursor)}
            isFetchingMore={isFetching}
            onSort={handleSort}
            onOpenProof={openProof}
            onOpenProfile={(row) => openProfile(row.agent_id, row.name || row.agency_code)}
            onLoadMore={() => setPageSize((size) => size + 50)}
          />
        ) : null}
      </div>

      <Modal open={showFilters} title="Filters" onClose={() => setShowFilters(false)}>
        <ContestFilters
          applied={filters}
          onApply={(draft) => {
            setFilters(draft);
            setShowFilters(false);
          }}
          onClose={() => setShowFilters(false)}
        />
      </Modal>

      <ProofDialog
        target={proofTarget}
        onClose={() => setProofTarget(null)}
        onOpenAgent={(agentId, name) => {
          setProofTarget(null);
          openProfile(agentId, name);
        }}
      />
      <ProfileDialog target={profileTarget} onClose={() => setProfileTarget(null)} />
      <FlyerDialog
        contestId={flyerFor}
        contestName={contest?.name ?? ''}
        onClose={() => setFlyerFor(null)}
      />
      <HelpDialog open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );

  if (!withChrome) return body;

  return (
    <div
      className="wb-ct-host carousel-card rounded-xl border p-4"
      style={{ containerName: 'wb-ct-card', containerType: 'inline-size' }}
    >
      {body}
    </div>
  );
}

/** The applied-filter summary, which stays visible when the controls collapse. */
function describeFilters(filters: FilterDraft): string {
  const scope =
    {
      personal: 'Just this person',
      base: 'Base shop',
      smd_base: 'Base shop',
      super_base: 'Super base',
      super_team: 'Super team',
      all: 'Everyone I can see',
    }[filters.scope] ?? filters.scope;

  const extras = [
    filters.net ? 'direct reports only' : '',
    filters.leaders && filters.agents ? '' : filters.leaders ? 'leaders only' : 'agents only',
  ].filter(Boolean);

  return [scope, ...extras].join(' · ');
}

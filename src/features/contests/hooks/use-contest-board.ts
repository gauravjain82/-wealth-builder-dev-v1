/**
 * The contest board's state: which contest, the applied filters, the tier selection,
 * the sort, and which dialog is open.
 *
 * Both placements read it — the compact card on `/home-v2` (`ContestsCard`) and the
 * standalone page (`ContestsBoard`) — so they share one set of rules and cannot drift:
 * the same default view, the same switch rule, the same standings key. Only what they
 * render differs (`docs/contests/ARCHITECTURE.md` §2).
 */

import { useEffect, useMemo, useState } from 'react';

import type {
  FilterDraft,
  MetricProgress,
  ProfileTarget,
  ProofTarget,
  StandingRow,
  StandingsQuery,
  TierSummary,
} from '../types';
import {
  buildStandingsQuery,
  useContests,
  usePrefetchOtherStandings,
  useStandings,
} from './use-contests';

/**
 * Everyone the viewer may see, with no person chosen: dtez's initial view, kept within
 * the viewer's permissions (C20; `all` resolves through `authz.get_scope`, C10).
 */
export const DEFAULT_FILTERS: FilterDraft = {
  personId: null,
  personLabel: '',
  scope: 'all',
  net: false,
  leaders: true,
  agents: true,
};

interface UseContestBoardOptions {
  /**
   * Warm the other contests' standings once the first is shown, so a switch is served
   * from cache. `/contests` only: `/home-v2` is every gated user's landing page, and a
   * background standings request per contest on each visit is a cost paid mostly for
   * switches nobody makes there (decision C24, `docs/contests/PHASES.md` §3).
   */
  prefetchOtherContests: boolean;
}

export function useContestBoard({ prefetchOtherContests }: UseContestBoardOptions) {
  const { data: contests, isLoading: loadingContests } = useContests();

  const [contestId, setContestId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterDraft>(DEFAULT_FILTERS);
  const [selectedTiers, setSelectedTiers] = useState<number[]>([]);
  const [sortTier, setSortTier] = useState<number | null>(null);
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(50);

  const [showHelp, setShowHelp] = useState(false);
  const [flyerFor, setFlyerFor] = useState<number | null>(null);
  const [proofTarget, setProofTarget] = useState<ProofTarget | null>(null);
  const [profileTarget, setProfileTarget] = useState<ProfileTarget | null>(null);

  // The selector prioritises active contests, which the backend already sorts for.
  const activeContestId = contestId ?? contests?.[0]?.id ?? null;
  const contest = contests?.find((item) => item.id === activeContestId) ?? null;

  const query: StandingsQuery | null = useMemo(
    () =>
      activeContestId === null
        ? null
        : buildStandingsQuery({
            filters,
            contestId: activeContestId,
            tierIds: selectedTiers,
            sortTier,
            direction,
          }),
    [activeContestId, filters, selectedTiers, sortTier, direction]
  );

  const standings = useStandings(query);

  // Latched, so the prefetch does not stop and restart each time a tier toggle puts the
  // visible standings back into loading.
  const [firstStandingsShown, setFirstStandingsShown] = useState(false);
  useEffect(() => {
    if (standings.data) setFirstStandingsShown(true);
  }, [standings.data]);
  const contestIds = useMemo(() => contests?.map((item) => item.id) ?? [], [contests]);
  usePrefetchOtherStandings({
    enabled: prefetchOtherContests && firstStandingsShown,
    contestIds,
    activeContestId,
    filters,
    direction,
  });

  /**
   * A switch keeps filters and direction and resets tiers and sort tier — the key
   * `usePrefetchOtherStandings` warms, and dtez's "switch instantly; clear tier
   * selection and sort". Change one, change both.
   */
  const switchContest = (id: number) => {
    setContestId(id);
    setSelectedTiers([]);
    setSortTier(null);
  };

  /** Toggling the sorted tier flips direction; a new tier starts descending. */
  const sortBy = (tierId: number) => {
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
      periodLabel: tier.period_label,
      metric: metric.metric,
    });
  };

  const openProfile = (agentId: number, name: string) => {
    if (activeContestId === null) return;
    setProfileTarget({ contestId: activeContestId, agentId, name });
  };

  return {
    contests,
    loadingContests,
    activeContestId,
    contest,
    filters,
    applyFilters: setFilters,
    switchContest,
    selectedTiers,
    setSelectedTiers,
    sortBy,
    standings,
    pageSize,
    loadMore: () => setPageSize((size) => size + 50),
    dialogs: {
      showHelp,
      setShowHelp,
      flyerFor,
      openFlyer: () => setFlyerFor(activeContestId),
      closeFlyer: () => setFlyerFor(null),
      proofTarget,
      openProof,
      closeProof: () => setProofTarget(null),
      profileTarget,
      openProfile,
      closeProfile: () => setProfileTarget(null),
    },
  };
}

export type ContestBoard = ReturnType<typeof useContestBoard>;

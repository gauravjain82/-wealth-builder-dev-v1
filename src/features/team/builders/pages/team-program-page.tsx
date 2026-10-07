import { useCallback, useEffect, useMemo, useState } from 'react';
import { AssociateTrackerContent } from '@/features/team/associate-tracker/pages/associate-tracker-page';
import { Block, ErrorState, LoadingState } from '@/shared/components';
import { useToastStore } from '@/store';
import { ActivityLeaderboard } from '../components/activity-leaderboard';
import { BuildersTabs, type BuilderTab } from '../components/builders-tabs';
import { ResultsLeaderboard } from '../components/results-leaderboard';
import { SubmitDailySix } from '../components/submit-daily-six';
import {
  fetchActivityLeaderboard,
  fetchBuilderEnrollment,
  fetchBuilderPaces,
  fetchResultsLeaderboard,
  fetchTodayDailySix,
  type ActivityLeaderboardEntry,
  type BuilderEnrollment,
  type BuilderPace,
  type DailySixSubmission,
  type ResultsLeaderboardEntry,
} from '../services/builders-service';
import type { TeamProgram } from '../team-programs';

interface TeamProgramPageProps {
  program: TeamProgram;
}

/**
 * Tracker, Results/Activity leaderboards and Daily Six for one team program.
 * Builders and Producers render this with their own {@link TeamProgram}; only
 * the tracker flag, leaderboard endpoints and labels differ.
 */
export function TeamProgramPage({ program }: TeamProgramPageProps) {
  const { label, pluralLabel } = program;
  const trackerFilters = useMemo(() => ({ [program.trackerFlag]: 'true' }), [program.trackerFlag]);
  const addToast = useToastStore((state) => state.addToast);
  const [activeTab, setActiveTab] = useState<BuilderTab>('tracker');
  const [paces, setPaces] = useState<BuilderPace[]>([]);
  const [selectedPaceId, setSelectedPaceId] = useState<number | null>(null);
  const [enrollment, setEnrollment] = useState<BuilderEnrollment | null>(null);
  const [todaySubmissions, setTodaySubmissions] = useState<DailySixSubmission[]>([]);
  const [resultsRows, setResultsRows] = useState<ResultsLeaderboardEntry[]>([]);
  const [activityRows, setActivityRows] = useState<ActivityLeaderboardEntry[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const loadDailySix = useCallback(async () => {
    try {
      setTodaySubmissions(await fetchTodayDailySix());
    } catch {
      setTodaySubmissions([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setInitialLoading(true);
      setInitialError(null);

      try {
        const [loadedPaces, loadedEnrollment] = await Promise.all([
          fetchBuilderPaces(),
          fetchBuilderEnrollment(),
        ]);
        if (cancelled) return;

        setPaces(loadedPaces);
        setEnrollment(loadedEnrollment);
        setSelectedPaceId(loadedEnrollment?.pace.id ?? loadedPaces[0]?.id ?? null);
        await loadDailySix();
      } catch (err) {
        if (!cancelled) setInitialError(err instanceof Error ? err.message : `Failed to load ${pluralLabel}.`);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [loadDailySix, pluralLabel]);

  const loadResultsLeaderboard = useCallback(async () => {
    setResultsLoading(true);
    setResultsError(null);
    try {
      setResultsRows(await fetchResultsLeaderboard(program));
    } catch (err) {
      setResultsError(err instanceof Error ? err.message : 'Failed to load results leaderboard.');
      addToast({ type: 'error', message: `Failed to load ${label} results leaderboard.` });
    } finally {
      setResultsLoading(false);
    }
  }, [addToast, label, program]);

  const loadActivityLeaderboard = useCallback(async () => {
    if (!selectedPaceId) return;

    setActivityLoading(true);
    setActivityError(null);
    try {
      setActivityRows(await fetchActivityLeaderboard(selectedPaceId, program));
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'Failed to load activity leaderboard.');
      addToast({ type: 'error', message: `Failed to load ${label} activity leaderboard.` });
    } finally {
      setActivityLoading(false);
    }
  }, [addToast, label, program, selectedPaceId]);

  useEffect(() => {
    if (activeTab === 'results') {
      void loadResultsLeaderboard();
    }
    if (activeTab === 'activity') {
      void loadActivityLeaderboard();
    }
  }, [activeTab, loadActivityLeaderboard, loadResultsLeaderboard]);

  if (initialLoading) {
    return (
      <div className="p-2">
        <LoadingState
          pageHeading={pluralLabel}
          pageDescription="Tracker, leaderboards, and Daily Six"
          title={`Loading ${pluralLabel}`}
          description="Fetching plans and enrollment..."
        />
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="p-2">
        <ErrorState
          pageHeading={pluralLabel}
          pageDescription="Tracker, leaderboards, and Daily Six"
          title={`Error Loading ${pluralLabel}`}
          description={initialError}
          retryLabel="Retry"
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-2">
      <Block
        title={pluralLabel}
        description=""
        titleVariant="h4"
        className="mb-2 flex-shrink-0"
      />

      <BuildersTabs activeTab={activeTab} onChange={setActiveTab} />

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'tracker' && (
          <AssociateTrackerContent
            pageHeading="Associate Tracker"
            pageDescription={`Monitor ${pluralLabel} and their progress`}
            tableId={program.tableId}
            emptyMessage={`No ${label} tracker records found.`}
            baseBackendFilters={trackerFilters}
            columnVariant={program.columnVariant}
          />
        )}

        {activeTab === 'results' && (
          <ResultsLeaderboard
            rows={resultsRows}
            loading={resultsLoading}
            error={resultsError}
            onRefresh={() => void loadResultsLeaderboard()}
            programLabel={label}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityLeaderboard
            paces={paces}
            paceId={selectedPaceId}
            rows={activityRows}
            loading={activityLoading}
            error={activityError}
            onPaceChange={setSelectedPaceId}
            onRefresh={() => void loadActivityLeaderboard()}
          />
        )}

        {activeTab === 'submit' && (
          <div className="h-full overflow-auto py-2">
            <SubmitDailySix
              paces={paces}
              enrollment={enrollment}
              todaySubmissions={todaySubmissions}
              onSubmitted={() => void loadDailySix()}
              program={program}
            />
          </div>
        )}
      </div>
    </div>
  );
}

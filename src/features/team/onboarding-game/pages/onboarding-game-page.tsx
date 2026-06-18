import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { AssociateHotRecruitsModal, AssociateClientUsersModal } from '@/features/team/components/associate-hot-recruits-modal';
import { LicensingTrackerModal } from '@/features/team/licensing-tracker/components/licensing-tracker-modal';
import { AssociateTrackerModal } from '@/features/team/associate-tracker/components/associate-tracker-modal';
import {
  fetchAssociateUsersForAssociatePage,
  type HotRecruitUser,
} from '@/features/team/associate-tracker/services/associate-tracker-service';
import { useToastStore } from '@/store';
import {
  fetchOnboardingData,
  markIntroWatched,
  fetchOnboardingVideos,
  markVideoWatched,
  type OnboardingTrackerData,
  type ModuleVideosMap,
} from '../services/onboarding-service';
import '../styles/onboarding-game.css';

interface Module {
  id: string;
  title: string;
  section: 'start' | 'philosophy' | 'followSystem' | 'buildOutlet';
}

const MODULES: Module[] = [
  { id: 'm0', title: 'Intro', section: 'start' },
  { id: 'm1', title: 'Multi Handed', section: 'philosophy' },
  { id: 'm2', title: '10% / 3 Rules / 3 Goals', section: 'philosophy' },
  { id: 'm3', title: 'Self Improvement', section: 'philosophy' },
  { id: 'm4', title: 'Observe 4 Recruits', section: 'followSystem' },
  { id: 'm5', title: 'Observe 4 Clients', section: 'followSystem' },
  { id: 'm6', title: 'Get License', section: 'followSystem' },
  { id: 'm7', title: '1 Direct Registration', section: 'followSystem' },
  { id: 'm8', title: 'Recruits', section: 'buildOutlet' },
  { id: 'm9', title: 'Points', section: 'buildOutlet' },
  { id: 'm10', title: 'Licenses', section: 'buildOutlet' },
  { id: 'm11', title: 'Registrations', section: 'buildOutlet' },
];

const GAME_VIDEO_POSITIONS: Record<string, { x: number; y: number }> = {
  m0: { x: 16, y: 71.5 },
  m1: { x: 31.8, y: 71.5 },
  m2: { x: 48.2, y: 71.5 },
  m3: { x: 64.4, y: 71.5 },
  m4: { x: 72.5, y: 71.5 },
  m5: { x: 77.5, y: 71.5 },
  m6: { x: 82.5, y: 71.5 },
  m7: { x: 87.5, y: 71.5 },
  m8: { x: 72.5, y: 71.5 },
  m9: { x: 77.5, y: 71.5 },
  m10: { x: 82.5, y: 71.5 },
  m11: { x: 87.5, y: 71.5 },
};

const EMPTY_DATA: OnboardingTrackerData = {
  userId: 0,
  userName: '',
  userEmail: '',
  introWatched: false,
  multiHanded: false,
  tenThreeGoals: false,
  selfImprovement: false,
  observe4Recruits: false,
  observe4Clients: false,
  getLicense: false,
  registrationConvention: false,
  recruitTtl: 0,
  personalPoints: 0,
  licensesInTtl: 0,
  registrationsBase: 0,
  currentMonthPersonalRecruits: 0,
  currentMonthTeamRecruits: 0,
  last3MonthPersonalRecruits: 0,
  last3MonthTeamRecruits: 0,
  currentMonthPersonalPoints: 0,
  currentMonthTeamPoints: 0,
  pendingPersonalPoints: 0,
  pendingTeamPoints: 0,
  last3MonthPersonalPoints: 0,
  last3MonthTeamPoints: 0,
  currentMonthLicenses: 0,
  totalLicenses: 0,
  currentMonthRegistrations: 0,
  totalRegistrations: 0,
};

function getIsComplete(moduleId: string, data: OnboardingTrackerData): boolean {
  switch (moduleId) {
    case 'm0': return data.introWatched;
    case 'm1': return data.multiHanded;
    case 'm2': return data.tenThreeGoals;
    case 'm3': return data.selfImprovement;
    case 'm4': return data.observe4Recruits;
    case 'm5': return data.observe4Clients;
    case 'm6': return data.getLicense;
    case 'm7': return data.registrationConvention;
    case 'm8': return data.recruitTtl >= 9;
    case 'm9': return data.personalPoints >= 45000;
    case 'm10': return data.licensesInTtl >= 3;
    case 'm11': return data.registrationsBase >= 15;
    default: return false;
  }
}

function computeUnlockedSections(data: OnboardingTrackerData): Set<string> {
  const unlocked = new Set<string>(['start']);

  if (data.introWatched) unlocked.add('philosophy');
  if (data.multiHanded && data.tenThreeGoals && data.selfImprovement) unlocked.add('followSystem');
  if (data.observe4Recruits && data.observe4Clients && data.getLicense && data.registrationConvention) {
    unlocked.add('buildOutlet');
  }

  return unlocked;
}

interface VideoModalProps {
  video: { title: string; url: string };
  onComplete: () => void;
  onClose: () => void;
  buttonText: string;
}

function VideoModal({ video, onComplete, onClose, buttonText }: VideoModalProps) {
  const [canComplete, setCanComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setCanComplete(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="og-video-modal-overlay" onClick={onClose}>
      <div className="og-video-modal" onClick={(event) => event.stopPropagation()}>
        <button className="og-video-close" onClick={onClose} aria-label="Close video">x</button>
        <h2>{video.title}</h2>

        <div className="og-video-frame-wrap">
          <iframe
            src={video.url}
            title={video.title}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="og-video-watch-bar">
          <div className="og-video-watch-fill" />
        </div>

        <button className="og-video-complete-btn" onClick={onComplete} disabled={!canComplete}>
          {buttonText}
        </button>
      </div>
    </div>
  );
}

export default function OnboardingGamePage() {
  const { user } = useAuth();
  const addToast = useToastStore((state) => state.addToast);

  const [trackerData, setTrackerData] = useState<OnboardingTrackerData | null>(null);
  const [moduleVideos, setModuleVideos] = useState<ModuleVideosMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<{ moduleId: string; videoIdx: number } | null>(null);

  const [hotRecruitOpenFor, setHotRecruitOpenFor] = useState<{ userId: number; userName: string } | null>(null);
  const [hotRecruits, setHotRecruits] = useState<HotRecruitUser[]>([]);
  const [hotRecruitsLoading, setHotRecruitsLoading] = useState(false);
  const [hotRecruitsLoadingMore, setHotRecruitsLoadingMore] = useState(false);
  const [hotRecruitsHasMore, setHotRecruitsHasMore] = useState(false);
  const [hotRecruitsNextPage, setHotRecruitsNextPage] = useState(2);

  const [clientPointsOpenFor, setClientPointsOpenFor] = useState<{ userId: number; userName: string } | null>(null);
  const [clientUsers, setClientUsers] = useState<HotRecruitUser[]>([]);
  const [clientUsersLoading, setClientUsersLoading] = useState(false);
  const [clientUsersLoadingMore, setClientUsersLoadingMore] = useState(false);
  const [clientUsersHasMore, setClientUsersHasMore] = useState(false);
  const [clientUsersNextPage, setClientUsersNextPage] = useState(2);

  const [licensedUsersOpenFor, setLicensedUsersOpenFor] = useState<{ userId: number; userName: string } | null>(null);
  const [registrationsOpenFor, setRegistrationsOpenFor] = useState<{ userId: number; userName: string } | null>(null);

  const loggedInUserId = useMemo(() => {
    const asNumber = Number(user?.id);
    return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : null;
  }, [user?.id]);

  const activeUserId = loggedInUserId;

  const loadData = useCallback(async (userId: number | null) => {
    if (!userId) {
      setTrackerData(EMPTY_DATA);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchOnboardingData(userId);
      setTrackerData(data);
    } catch (err) {
      setError((err as Error).message);
      setTrackerData(EMPTY_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVideos = useCallback(async (userId: number | null) => {
    try {
      const videos = await fetchOnboardingVideos(userId);
      setModuleVideos(videos);
    } catch (err) {
      console.error('Failed to fetch onboarding videos', err);
    }
  }, []);

  useEffect(() => {
    void loadData(activeUserId);
    void loadVideos(activeUserId);
  }, [activeUserId, loadData, loadVideos]);

  const data = trackerData ?? EMPTY_DATA;
  const progressData = useMemo(() => {
    const hasWatchedIntroVideo = moduleVideos.m0?.some((video) => video.watched) ?? false;
    return hasWatchedIntroVideo && !data.introWatched ? { ...data, introWatched: true } : data;
  }, [data, moduleVideos]);

  const unlockedSections = useMemo(() => computeUnlockedSections(progressData), [progressData]);
  const moduleStates = useMemo(() => {
    const result: Record<string, { isComplete: boolean; isUnlocked: boolean }> = {};
    MODULES.forEach((module) => {
      result[module.id] = {
        isComplete: getIsComplete(module.id, progressData),
        isUnlocked: unlockedSections.has(module.section),
      };
    });
    return result;
  }, [progressData, unlockedSections]);

  const displayName =
    data.userName ||
    (user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : '') ||
    'Agent';

  const handleVideoClick = (moduleId: string, videoIdx: number) => {
    const state = moduleStates[moduleId];
    if (!state?.isUnlocked) return;
    if (moduleId === 'm4' && !(moduleStates.m1?.isComplete && moduleStates.m2?.isComplete && moduleStates.m3?.isComplete)) {
      return;
    }
    setActiveVideo({ moduleId, videoIdx });
  };

  const handleVideoComplete = async () => {
    if (!activeVideo) return;
    const { moduleId, videoIdx } = activeVideo;
    const video = moduleVideos[moduleId]?.[videoIdx];
    setActiveVideo(null);

    try {
      if (video) {
        await markVideoWatched(video.id, activeUserId);
        await loadVideos(activeUserId);
      }

      if (moduleId === 'm0' && data.userId) {
        await markIntroWatched(data.userId);
        await loadData(activeUserId);
      }
    } catch (err) {
      console.error('Failed to mark video watched', err);
    }
  };

  const handleOpenHotRecruits = useCallback(async (userId: number, userName: string) => {
    setHotRecruitOpenFor({ userId, userName });
    setHotRecruits([]);
    setHotRecruitsHasMore(false);
    setHotRecruitsLoading(true);
    try {
      const loaded = await fetchAssociateUsersForAssociatePage(userId, { hot: true, pageSize: 20 });
      setHotRecruits(loaded.results);
      setHotRecruitsHasMore(Boolean(loaded.next));
      setHotRecruitsNextPage(2);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load recruits.' });
    } finally {
      setHotRecruitsLoading(false);
    }
  }, [addToast]);

  const handleOpenClientUsers = useCallback(async (userId: number, userName: string) => {
    setClientPointsOpenFor({ userId, userName });
    setClientUsers([]);
    setClientUsersHasMore(false);
    setClientUsersLoading(true);
    try {
      const loaded = await fetchAssociateUsersForAssociatePage(userId, { client: true, pageSize: 20 });
      setClientUsers(loaded.results);
      setClientUsersHasMore(Boolean(loaded.next));
      setClientUsersNextPage(2);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load client users.' });
    } finally {
      setClientUsersLoading(false);
    }
  }, [addToast]);

  const handleOpenLicensedUsers = useCallback((userId: number, userName: string) => {
    setLicensedUsersOpenFor({ userId, userName });
  }, []);

  const handleReachHotRecruitsEnd = useCallback(async () => {
    if (!hotRecruitOpenFor || !hotRecruitsHasMore || hotRecruitsLoading || hotRecruitsLoadingMore) return;
    setHotRecruitsLoadingMore(true);
    try {
      const loaded = await fetchAssociateUsersForAssociatePage(hotRecruitOpenFor.userId, {
        hot: true,
        page: hotRecruitsNextPage,
        pageSize: 20,
      });
      setHotRecruits((prev) => [...prev, ...loaded.results]);
      setHotRecruitsHasMore(Boolean(loaded.next));
      setHotRecruitsNextPage((prev) => prev + 1);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load more recruits.' });
    } finally {
      setHotRecruitsLoadingMore(false);
    }
  }, [addToast, hotRecruitOpenFor, hotRecruitsHasMore, hotRecruitsLoading, hotRecruitsLoadingMore, hotRecruitsNextPage]);

  const handleReachClientUsersEnd = useCallback(async () => {
    if (!clientPointsOpenFor || !clientUsersHasMore || clientUsersLoading || clientUsersLoadingMore) return;
    setClientUsersLoadingMore(true);
    try {
      const loaded = await fetchAssociateUsersForAssociatePage(clientPointsOpenFor.userId, {
        client: true,
        page: clientUsersNextPage,
        pageSize: 20,
      });
      setClientUsers((prev) => [...prev, ...loaded.results]);
      setClientUsersHasMore(Boolean(loaded.next));
      setClientUsersNextPage((prev) => prev + 1);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load more client users.' });
    } finally {
      setClientUsersLoadingMore(false);
    }
  }, [addToast, clientPointsOpenFor, clientUsersHasMore, clientUsersLoading, clientUsersLoadingMore, clientUsersNextPage]);

  const metricGroups = [
    {
      id: 'recruits',
      label: 'Recruits',
      values: [
        { label: '3M PR', value: data.last3MonthPersonalRecruits },
        { label: '3M TR', value: data.last3MonthTeamRecruits },
        { label: '1M PR', value: data.currentMonthPersonalRecruits },
        { label: '1M TR', value: data.currentMonthTeamRecruits },
      ],
      onOpen: () => data.userId ? void handleOpenHotRecruits(data.userId, displayName) : undefined,
    },
    {
      id: 'points',
      label: 'Points',
      values: [
        { label: '3M PP', value: data.last3MonthPersonalPoints },
        { label: '3M TP', value: data.last3MonthTeamPoints },
        { label: '1M PP', value: data.currentMonthPersonalPoints },
        { label: '1M TP', value: data.currentMonthTeamPoints },
      ],
      onOpen: () => data.userId ? void handleOpenClientUsers(data.userId, displayName) : undefined,
    },
    {
      id: 'licenses',
      label: 'Licenses',
      values: [
        { label: 'This Month', value: data.currentMonthLicenses },
        { label: 'Total', value: data.totalLicenses },
      ],
      onOpen: () => data.userId ? void handleOpenLicensedUsers(data.userId, displayName) : undefined,
    },
    {
      id: 'registrations',
      label: 'Registrations',
      values: [
        { label: 'This Month', value: data.currentMonthRegistrations },
        { label: 'Total', value: data.totalRegistrations },
      ],
      onOpen: () => data.userId ? setRegistrationsOpenFor({ userId: data.userId, userName: displayName }) : undefined,
    },
  ] as const;

  return (
    <div className="og-root">
      {activeVideo && moduleVideos[activeVideo.moduleId]?.[activeVideo.videoIdx] && (
        <VideoModal
          video={moduleVideos[activeVideo.moduleId][activeVideo.videoIdx]}
          onComplete={handleVideoComplete}
          onClose={() => setActiveVideo(null)}
          buttonText={activeVideo.moduleId === 'm0' ? 'Complete Intro' : 'Done'}
        />
      )}

      <AssociateHotRecruitsModal
        open={hotRecruitOpenFor !== null}
        ownerName={hotRecruitOpenFor?.userName ?? ''}
        loading={hotRecruitsLoading}
        recruits={hotRecruits}
        recruitSummary={{
          currentMonthPersonal: data.currentMonthPersonalRecruits,
          currentMonthTeam: data.currentMonthTeamRecruits,
          rollingThreeMonthPersonal: data.last3MonthPersonalRecruits,
          rollingThreeMonthTeam: data.last3MonthTeamRecruits,
        }}
        loadingMore={hotRecruitsLoadingMore}
        onReachEnd={() => void handleReachHotRecruitsEnd()}
        onClose={() => {
          setHotRecruitOpenFor(null);
          setHotRecruits([]);
        }}
      />

      <AssociateClientUsersModal
        open={clientPointsOpenFor !== null}
        ownerUserId={clientPointsOpenFor?.userId ?? null}
        ownerName={clientPointsOpenFor?.userName ?? ''}
        loading={clientUsersLoading}
        users={clientUsers}
        pointsSummary={{
          currentMonthPersonal: data.currentMonthPersonalPoints,
          currentMonthTeam: data.currentMonthTeamPoints,
          pendingPersonal: data.pendingPersonalPoints,
          pendingTeam: data.pendingTeamPoints,
          rollingThreeMonthPersonal: data.last3MonthPersonalPoints,
          rollingThreeMonthTeam: data.last3MonthTeamPoints,
        }}
        loadingMore={clientUsersLoadingMore}
        onReachEnd={() => void handleReachClientUsersEnd()}
        onClose={() => {
          setClientPointsOpenFor(null);
          setClientUsers([]);
        }}
      />

      <LicensingTrackerModal
        open={licensedUsersOpenFor !== null}
        ownerUserId={licensedUsersOpenFor?.userId ?? null}
        ownerName={licensedUsersOpenFor?.userName ?? ''}
        onClose={() => setLicensedUsersOpenFor(null)}
      />

      <AssociateTrackerModal
        open={registrationsOpenFor !== null}
        ownerUserId={registrationsOpenFor?.userId ?? null}
        ownerName={registrationsOpenFor?.userName ?? ''}
        onClose={() => setRegistrationsOpenFor(null)}
      />

      <div className="og-content">
        <div className="og-stage" aria-label="The Mission onboarding game">
          {loading && <div className="og-loading og-stage-status">Loading progress...</div>}
          {error && <div className="og-loading og-stage-status error">Error: {error}</div>}

          <img className="og-mission-bg" src="/onboarding-mission-bg.jpeg" alt="The Mission" />

          {MODULES.map((module) => {
            const videos = moduleVideos[module.id];
            const position = GAME_VIDEO_POSITIONS[module.id];
            if (!videos || !position || !unlockedSections.has(module.section)) return null;

            const state = moduleStates[module.id];
            const prereqOk = module.id !== 'm4' || (
              moduleStates.m1?.isComplete &&
              moduleStates.m2?.isComplete &&
              moduleStates.m3?.isComplete
            );
            if (!prereqOk) return null;

            const isIntroComplete = module.id === 'm0' ? state?.isComplete : false;

            return (
              <div
                key={module.id}
                className="og-video-col"
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
              >
                {videos.map((video, videoIdx) => {
                  const canPlay = !!state?.isUnlocked;
                  const isDone = video.watched;
                  const isViewingOwnProgress = activeUserId === loggedInUserId;

                  return (
                    <button
                      key={video.id}
                      className={[
                        'og-video-tile',
                        !canPlay ? 'locked' : '',
                        isDone ? 'done' : '',
                        module.id === 'm0' && !isIntroComplete ? 'og-intro-pulse' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleVideoClick(module.id, videoIdx)}
                      disabled={!canPlay || !isViewingOwnProgress}
                      aria-label={`${module.title} video`}
                    >
                      <span className="og-video-play" aria-hidden="true" />
                      <span className="og-video-lbl">Video</span>
                    </button>
                  );
                })}
              </div>
            );
          })}

        </div>

        <div className="og-metric-panel" aria-label="Tracker detail buttons">
          {metricGroups.map((group) => (
            <div className="og-metric-group" key={group.id}>
              <div className="og-metric-title">{group.label}</div>
              <div className="og-value-wrap">
                {group.values.map((count) => (
                  <button
                    key={count.label}
                    className="og-value-btn"
                    onClick={group.onOpen}
                    title={`Click to view ${group.label.toLowerCase()} details`}
                  >
                    <span className="og-value-label">{count.label}</span>
                    <span>{count.value.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

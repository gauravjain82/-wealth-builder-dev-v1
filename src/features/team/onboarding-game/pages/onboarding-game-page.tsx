import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { UserAutocompleteDropdown, type UserAutocompleteOption } from '@/shared/components';
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

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS
   ──────────────────────────────────────────────────────────────────────── */

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const ROAD_SCENE_HEIGHT = 350;
const VIDEO_DOCK_MIN_HEIGHT = 80;
const CHECKBOX_HEIGHT = 120;
const TOTAL_POSITIONS = 16;

interface Module {
  id: string;
  title: string;
  section: 'start' | 'philosophy' | 'followSystem' | 'buildOutlet';
}

const MODULES: Module[] = [
  { id: 'm0',  title: 'Intro',                      section: 'start' },
  { id: 'm1',  title: 'Multi Handed',               section: 'philosophy' },
  { id: 'm2',  title: '10% / 3 Rules / 3 Goals',    section: 'philosophy' },
  { id: 'm3',  title: 'Self Improvement',            section: 'philosophy' },
  { id: 'm4',  title: 'Observe 4 Recruits',          section: 'followSystem' },
  { id: 'm5',  title: 'Observe 4 Clients',           section: 'followSystem' },
  { id: 'm6',  title: 'Get License',                 section: 'followSystem' },
  { id: 'm7',  title: '1 Direct Registration',       section: 'followSystem' },
  { id: 'm8',  title: 'Recruits',                    section: 'buildOutlet' },
  { id: 'm9',  title: 'Points',                      section: 'buildOutlet' },
  { id: 'm10', title: 'Licenses',                    section: 'buildOutlet' },
  { id: 'm11', title: 'Registrations',               section: 'buildOutlet' },
];

const MODULE_POSITIONS: Record<string, number> = {
  m0: 0, m1: 2, m2: 3, m3: 4,
  m4: 6, m5: 7, m6: 8, m7: 9,
  m8: 11, m9: 12, m10: 13, m11: 14,
};

interface Section {
  name: string;
  startIndex: number;
  endIndex: number;
  nameClass?: string;
  badge?: { image: string; type: string; className?: string };
}

const SECTIONS: Section[] = [
  { name: '', startIndex: 0, endIndex: 0, badge: undefined },
  {
    name: 'BELIEVE PHILOSOPHY',
    startIndex: 2, endIndex: 6,
    nameClass: 'section-title-philosophy',
    badge: { image: '/shield.png', type: 'shield' },
  },
  {
    name: 'FOLLOW SYSTEM',
    startIndex: 6, endIndex: 11,
    badge: { image: '/shirt.png', type: 'shirt' },
  },
  {
    name: 'BUILD OUTLET',
    startIndex: 13, endIndex: 16,
    badge: { image: '/watch.png', type: 'watch' },
  },
];

const CAR_ANCHOR_INDEX = [0, 2, 5, 10];
const BLOCKS = [['m0'], ['m1', 'm2', 'm3'], ['m4', 'm5', 'm6', 'm7'], ['m8', 'm9', 'm10', 'm11']];



/* Human-readable labels shown below traffic lights */
const MODULE_DISPLAY_LABELS: Record<string, string | string[]> = {
  m1: 'MULTI-HANDED',
  m2: ['10% 3RULES', '3 GOALS'],
  m3: 'SELF IMPROVEMENT',
  m4: '3 DIRECTS',
  m5: '3 CLIENTS',
  m6: 'GET LICENSED',
  m7: ['1 DIRECT', 'REGISTRATION'],
  m8: 'RECRUITS',
  m9: 'POINTS',
  m10: 'LICENSES',
  m11: 'REGISTRATIONS',
};

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
   ──────────────────────────────────────────────────────────────────────── */

function getIsComplete(moduleId: string, data: OnboardingTrackerData): boolean {
  switch (moduleId) {
    case 'm0':  return data.introWatched;
    case 'm1':  return data.multiHanded;
    case 'm2':  return data.tenThreeGoals;
    case 'm3':  return data.selfImprovement;
    case 'm4':  return data.observe4Recruits;
    case 'm5':  return data.observe4Clients;
    case 'm6':  return data.getLicense;
    case 'm7':  return data.registrationConvention;
    case 'm8':  return data.recruitTtl >= 9;
    case 'm9':  return data.personalPoints >= 45000;
    case 'm10': return data.licensesInTtl >= 3;
    case 'm11': return data.registrationsBase >= 15;
    default:    return false;
  }
}

function computeUnlockedSections(data: OnboardingTrackerData): Set<string> {
  const unlocked = new Set<string>(['start']);
  // philosophy unlocks after intro
  if (data.introWatched) unlocked.add('philosophy');
  // followSystem unlocks after all philosophy done
  if (data.multiHanded && data.tenThreeGoals && data.selfImprovement) unlocked.add('followSystem');
  // buildOutlet unlocks after all followSystem done
  if (data.observe4Recruits && data.observe4Clients && data.getLicense && data.registrationConvention)
    unlocked.add('buildOutlet');
  return unlocked;
}

function computeCarIndex(
  _unlockedSections: Set<string>,
  blockStates: boolean[],
): number {
  // blockStates[i] = true if every module in BLOCKS[i] is complete
  let idx = 0;
  for (let i = 0; i < blockStates.length; i++) {
    if (blockStates[i]) idx = i + 1;
  }
  return clamp(idx, 0, CAR_ANCHOR_INDEX.length - 1);
}

function calculateCellWidth() {
  const available = Math.max(window.innerWidth - 120, 960);
  return clamp(Math.floor(available / TOTAL_POSITIONS), 56, 90);
}

/* ─────────────────────────────────────────────────────────────────────────
   VIDEO MODAL
   ──────────────────────────────────────────────────────────────────────── */

interface VideoModalProps {
  video: { title: string; url: string };
  onComplete: () => void;
  onClose: () => void;
  buttonText: string;
}

function VideoModal({ video, onComplete, onClose, buttonText }: VideoModalProps) {
  const [canComplete, setCanComplete] = useState(false);

  useEffect(() => {
    // Allow completing after 2 s — same as old site
    const t = setTimeout(() => setCanComplete(true), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="og-video-modal-overlay" onClick={onClose}>
      <div className="og-video-modal" onClick={(e) => e.stopPropagation()}>
        <button className="og-video-close" onClick={onClose}>✕</button>
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

        <button
          className="og-video-complete-btn"
          onClick={onComplete}
          disabled={!canComplete}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MAIN PAGE
   ──────────────────────────────────────────────────────────────────────── */

const EMPTY_DATA: OnboardingTrackerData = {
  userId: 0, userName: '', userEmail: '',
  introWatched: false, multiHanded: false, tenThreeGoals: false,
  selfImprovement: false, observe4Recruits: false, observe4Clients: false,
  getLicense: false, registrationConvention: false,
  recruitTtl: 0, personalPoints: 0, licensesInTtl: 0, registrationsBase: 0,
  currentMonthPersonalRecruits: 0, currentMonthTeamRecruits: 0,
  last3MonthPersonalRecruits: 0, last3MonthTeamRecruits: 0,
  currentMonthPersonalPoints: 0, currentMonthTeamPoints: 0,
  pendingPersonalPoints: 0, pendingTeamPoints: 0,
  last3MonthPersonalPoints: 0, last3MonthTeamPoints: 0,
  currentMonthLicenses: 0, totalLicenses: 0,
  currentMonthRegistrations: 0, totalRegistrations: 0,
};

export default function OnboardingGamePage() {
  const { user } = useAuth();
  const addToast = useToastStore((state) => state.addToast);

  const [moduleVideos, setModuleVideos] = useState<ModuleVideosMap>({});

  const videoDockHeight = useMemo(() => {
    // Tile stack needs vertical room in paid modules (e.g. 3 videos in m1).
    // 28px tile height + 3px gap, plus top/bottom breathing space.
    const maxVideosInAnyModule = Math.max(
      1,
      ...Object.values(moduleVideos).map((videos) => videos.length),
    );
    const requiredHeight = 8 + maxVideosInAnyModule * 28 + (maxVideosInAnyModule - 1) * 3 + 10;
    return Math.max(VIDEO_DOCK_MIN_HEIGHT, requiredHeight);
  }, [moduleVideos]);

  /* ── User selection (leader/admin can pick any user) ── */
  const [selectedUser, setSelectedUser] = useState<UserAutocompleteOption | null>(null);

  /* ── Data ── */
  const [trackerData, setTrackerData] = useState<OnboardingTrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Video modal ── */
  const [activeVideo, setActiveVideo] = useState<{ moduleId: string; videoIdx: number } | null>(null);

  /* ── Tracker progress modal (m11 registrations) ── */
  /* ── Associate list modals (m8/m9/m10) ── */
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

  /* ── Cell width (responsive) ── */
  const [cellWidth, setCellWidth] = useState(calculateCellWidth);

  const loggedInUserId = useMemo(() => {
    const asNumber = Number(user?.id);
    return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : null;
  }, [user?.id]);

  const activeUserId = selectedUser?.id ?? loggedInUserId;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handle = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setCellWidth(calculateCellWidth()), 100);
    };
    window.addEventListener('resize', handle);
    return () => { window.removeEventListener('resize', handle); clearTimeout(timer); };
  }, []);

  /* ── Fetch tracker data when user changes ── */
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
    } catch (e) {
      setError((e as Error).message);
      setTrackerData(EMPTY_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch videos when user changes ── */
  const loadVideos = useCallback(async (userId: number | null) => {
    try {
      const videos = await fetchOnboardingVideos(userId);
      setModuleVideos(videos);
    } catch (e) {
      console.error('Failed to fetch onboarding videos', e);
    }
  }, []);

  useEffect(() => {
    loadData(activeUserId);
    loadVideos(activeUserId);
  }, [activeUserId, loadData, loadVideos]);

  /* ── Derived state ── */
  const data = trackerData ?? EMPTY_DATA;
  const unlockedSections = useMemo(() => computeUnlockedSections(data), [data]);

  const moduleStates = useMemo(() => {
    const result: Record<string, { isComplete: boolean; isUnlocked: boolean }> = {};
    MODULES.forEach((m) => {
      result[m.id] = {
        isComplete: getIsComplete(m.id, data),
        isUnlocked: unlockedSections.has(m.section),
      };
    });
    return result;
  }, [data, unlockedSections]);

  const completedCount = useMemo(
    () => MODULES.filter((m) => moduleStates[m.id]?.isComplete).length,
    [moduleStates],
  );

  const blockStates = useMemo(
    () => BLOCKS.map((block) => block.every((id) => moduleStates[id]?.isComplete)),
    [moduleStates],
  );

  const carIndex = useMemo(
    () => computeCarIndex(unlockedSections, blockStates),
    [unlockedSections, blockStates],
  );

  /* ── Layout math ── */
  const leftMargin = useMemo(() => clamp(Math.round(cellWidth * 0.9), 40, 90), [cellWidth]);
  const getPos = useCallback((idx: number) => leftMargin + idx * cellWidth, [leftMargin, cellWidth]);
  const trackW = TOTAL_POSITIONS * cellWidth + leftMargin * 2;
  const trafficRowTop = Math.max(90, Math.round(ROAD_SCENE_HEIGHT * 0.34));
  const carTop = Math.max(trafficRowTop + 120, Math.round(ROAD_SCENE_HEIGHT * 0.74));
  const carLeft = useMemo(() => {
    const anchorIdx = CAR_ANCHOR_INDEX[carIndex];
    const base = leftMargin + anchorIdx * cellWidth;
    const offset = carIndex === 1 ? Math.round(cellWidth * 0.2) + 25 : 0;
    return base - offset;
  }, [carIndex, cellWidth, leftMargin]);

  const progressPct = (completedCount / MODULES.length) * 100;

  /* ── Video handling ── */
  const handleVideoClick = (moduleId: string, videoIdx: number) => {
    const state = moduleStates[moduleId];
    if (!state?.isUnlocked) return;
    if (moduleId === 'm4' && !(moduleStates['m1']?.isComplete && moduleStates['m2']?.isComplete && moduleStates['m3']?.isComplete)) {
      return; // prerequisites not met
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
        // Refresh videos to update watched status
        await loadVideos(activeUserId);
      }
      // For intro (m0), also update the AssociateTracker progress flag
      if (moduleId === 'm0' && data.userId) {
        await markIntroWatched(data.userId);
        await loadData(activeUserId);
      }
    } catch (e) {
      console.error('Failed to mark video watched', e);
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

  /* ── Display name ── */
  const displayName =
    selectedUser?.label ||
    data.userName ||
    (user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : '') ||
    'AGENT NAME';

  /* ─────────────────── RENDER ─────────────────── */
  return (
    <div className="og-root">
      {/* ── Control bar ─────────────────────────────── */}
      <div className="og-control-bar">
        <div className="og-brand">🏆 Onboarding Road</div>

        <div className="og-user-picker">
          <UserAutocompleteDropdown
            placeholder="Search user…"
            selectedId={selectedUser?.id ?? null}
            selectedLabel={selectedUser?.label}
            onSelect={(opt) => setSelectedUser(opt)}
            fetchFromApi
          />
        </div>

        <div className="og-progress-wrap">
          <div className="og-progress-bar" style={{ width: `${progressPct}%` }} />
          <span className="og-progress-label">
            {completedCount}/{MODULES.length} Complete
          </span>
        </div>
      </div>

      {/* ── Video modal ──────────────────────────────── */}
      {activeVideo && moduleVideos[activeVideo.moduleId]?.[activeVideo.videoIdx] && (
        <VideoModal
          video={moduleVideos[activeVideo.moduleId][activeVideo.videoIdx]}
          onComplete={handleVideoComplete}
          onClose={() => setActiveVideo(null)}
          buttonText={activeVideo.moduleId === 'm0' ? 'Complete Intro' : 'Done'}
        />
      )}

      {/* ── Tracker progress modal (m11) ───────────────── */}
      {/* ── 9 Recruits modal (m8) ─────────────────────── */}
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

      {/* ── 45k Personal Points modal (m9) ─────────────── */}
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

      {/* ── 3 Licenses modal (m10) ────────────────────── */}
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

      {/* ── Scrollable area ──────────────────────────── */}
      <div className="og-content">
        {loading && <div className="og-loading">Loading progress…</div>}
        {error && <div className="og-loading" style={{ color: '#ef4444' }}>Error: {error}</div>}

        {/* ── ROAD SCENE ─────────────────────────────── */}
        <div className="og-road-wrap">
          <div
            className="og-road"
            style={{
              height: ROAD_SCENE_HEIGHT,
              backgroundImage: "url('/road.png')",
              width: trackW,
              minWidth: trackW,
            }}
          >
            {/* Section labels + badges */}
            {SECTIONS.map((section) => {
              if (!section.name) return null;
              const center = (section.startIndex + section.endIndex) / 2;
              return (
                <div
                  key={section.name}
                  className="og-section-header"
                  style={{ left: getPos(center) }}
                >
                  <div className="og-section-title">
                    {section.name.split(' ').map((w, i) => <div key={i}>{w}</div>)}
                  </div>
                  {section.badge && (
                    <div className="og-section-badge">
                      <img src={section.badge.image} alt={section.name} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* SMD badge at end */}
            <div className="og-smd-badge" style={{ left: getPos(15.5) }}>
              <div className="og-smd-pill">
                <img src="/smd100k.png" alt="SMD 100k" />
              </div>
            </div>

            {/* Traffic lights (m1–m11) */}
            <div className="og-traffic-row" style={{ top: trafficRowTop }}>
              {MODULES.filter((m) => m.id !== 'm0').map((module) => {
                const pos = MODULE_POSITIONS[module.id];
                const state = moduleStates[module.id];
                const label = MODULE_DISPLAY_LABELS[module.id];

                return (
                  <div
                    key={module.id}
                    className="og-traffic-item"
                    style={{ left: getPos(pos) }}
                    title={
                      !state?.isUnlocked
                        ? 'Complete previous section to unlock'
                        : state.isComplete
                        ? 'Completed ✓'
                        : 'In progress'
                    }
                  >
                    {state?.isUnlocked && (
                      <div className="og-module-label">
                        {Array.isArray(label)
                          ? label.map((line, i) => <span key={i} style={{ display: 'block' }}>{line}</span>)
                          : label || module.title.toUpperCase()}
                      </div>
                    )}
                    <img
                      src={state?.isComplete ? '/traffic-light-green.png' : '/traffic-light-red.png'}
                      alt={module.title}
                      className="og-traffic-img"
                    />
                  </div>
                );
              })}
            </div>

            {/* Car */}
            <div className="og-car" style={{ left: carLeft, top: carTop }}>
              <img src="/car.png" alt="Progress car" />
            </div>
          </div>
        </div>

        {/* ── VIDEO SECTION ──────────────────────────── */}
        <div className="og-video-section">
          <div
            className="og-video-dock"
            style={{ width: trackW, height: videoDockHeight }}
          >
            {/* START label */}
            <div
              className="og-video-start"
              style={{ left: getPos(MODULE_POSITIONS.m0) }}
            >
              <span className="og-video-start-title">START</span>
              <img src="/start.png" alt="Start" className="og-video-start-img" />
            </div>

            {/* Video tiles */}
            {MODULES.map((module) => {
              const videos = moduleVideos[module.id];
              if (!videos) return null;

              const pos = MODULE_POSITIONS[module.id] !== 0 ? MODULE_POSITIONS[module.id] : 1;
              const state = moduleStates[module.id];
              if (!unlockedSections.has(module.section)) return null;

              const prereqOk = module.id !== 'm4' || (
                moduleStates['m1']?.isComplete &&
                moduleStates['m2']?.isComplete &&
                moduleStates['m3']?.isComplete
              );
              if (!prereqOk) return null;

              const isIntroComplete = module.id === 'm0' ? state?.isComplete : false;

              return (
                <div
                  key={module.id}
                  className="og-video-col"
                  style={{ left: getPos(pos) }}
                >
                  {videos.map((video, vIdx) => {
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
                        onClick={() => handleVideoClick(module.id, vIdx)}
                        disabled={!canPlay || !isViewingOwnProgress}
                        aria-label={`${module.title} video`}
                      >
                        <span className="og-video-play">{isDone ? '✓' : '▶'}</span>
                        <span className="og-video-lbl">video</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CHECKBOX / PROGRESS SECTION ────────────── */}
        <div className="og-checkbox-section">
          <div
            className="og-checkbox-content"
            style={{ width: trackW, height: CHECKBOX_HEIGHT }}
          >
            <div className="og-agent-name">{displayName}</div>

            {/* Philosophy checkboxes (m1–m3) */}
            {(['m1', 'm2', 'm3'] as const).map((id) => {
              const state = moduleStates[id];
              if (!state?.isUnlocked) return null;
              const label = MODULE_DISPLAY_LABELS[id];
              return (
                <div
                  key={id}
                  className="og-item"
                  style={{ left: getPos(MODULE_POSITIONS[id]) }}
                >
                  <div className="og-item-label">
                    {Array.isArray(label)
                      ? label.map((line, i) => <span key={i} style={{ display: 'block' }}>{line}</span>)
                      : label}
                  </div>
                  <input
                    type="checkbox"
                    className="og-cb"
                    checked={state.isComplete}
                    readOnly
                    disabled
                  />
                </div>
              );
            })}

            {/* Follow System checkboxes (m4–m7) */}
            {(['m4', 'm5', 'm6', 'm7'] as const).map((id) => {
              const state = moduleStates[id];
              if (!state?.isUnlocked) return null;
              const label = MODULE_DISPLAY_LABELS[id];
              const isMulti = id === 'm4' || id === 'm5';

              return (
                <div
                  key={id}
                  className="og-item"
                  style={{ left: getPos(MODULE_POSITIONS[id]) }}
                >
                  <div className="og-item-label">
                    {Array.isArray(label)
                      ? label.map((line, i) => <span key={i} style={{ display: 'block' }}>{line}</span>)
                      : label}
                  </div>
                  {isMulti ? (
                    <div className="og-checkbox-col">
                      {[0, 1, 2].map((i) => (
                        <input key={i} type="checkbox" className="og-cb" checked={state.isComplete} readOnly disabled />
                      ))}
                    </div>
                  ) : (
                    <input type="checkbox" className="og-cb" checked={state.isComplete} readOnly disabled />
                  )}
                </div>
              );
            })}

            {/* Associate tracker counts — m8/m9/m10/m11 */}
            {unlockedSections.has('buildOutlet') && (
              <>
                {(
                  [
                    {
                      id: 'm8', label: MODULE_DISPLAY_LABELS['m8'], metric: 'recruits',
                      values: [
                        { label: '3M PR', value: data.last3MonthPersonalRecruits },
                        { label: '3M TR', value: data.last3MonthTeamRecruits },
                        { label: '1M PR', value: data.currentMonthPersonalRecruits },
                        { label: '1M TR', value: data.currentMonthTeamRecruits },
                      ],
                      onOpen: () => data.userId ? void handleOpenHotRecruits(data.userId, displayName) : undefined,
                    },
                    {
                      id: 'm9', label: MODULE_DISPLAY_LABELS['m9'], metric: 'points',
                      values: [
                        { label: '3M PP', value: data.last3MonthPersonalPoints },
                        { label: '3M TP', value: data.last3MonthTeamPoints },
                        { label: '1M PP', value: data.currentMonthPersonalPoints },
                        { label: '1M TP', value: data.currentMonthTeamPoints },
                      ],
                      onOpen: () => data.userId ? void handleOpenClientUsers(data.userId, displayName) : undefined,
                    },
                    {
                      id: 'm10', label: MODULE_DISPLAY_LABELS['m10'], metric: 'licenses',
                      values: [
                        { label: 'This Month', value: data.currentMonthLicenses },
                        { label: 'Total', value: data.totalLicenses },
                      ],
                      onOpen: () => data.userId ? void handleOpenLicensedUsers(data.userId, displayName) : undefined,
                    },
                    {
                      id: 'm11', label: MODULE_DISPLAY_LABELS['m11'], metric: 'registrations',
                      values: [
                        { label: 'This Month', value: data.currentMonthRegistrations },
                        { label: 'Total', value: data.totalRegistrations },
                      ],
                      onOpen: () => data.userId ? setRegistrationsOpenFor({ userId: data.userId, userName: displayName }) : undefined,
                    },
                  ] as const
                ).map((item) => {
                  return (
                    <div
                      key={item.id}
                      className="og-item"
                      style={{ left: getPos(MODULE_POSITIONS[item.id]) }}
                    >
                      <div className="og-item-label">
                        {Array.isArray(item.label)
                          ? item.label.map((line, i) => <span key={i} style={{ display: 'block' }}>{line}</span>)
                          : item.label}
                      </div>
                      <div className="og-value-wrap">
                        {item.values.map((count) => (
                          <button
                            key={count.label}
                            className="og-value-btn"
                            onClick={item.onOpen}
                            title={`Click to view ${item.metric} details`}
                          >
                            <span className="og-value-label">{count.label}</span>
                            <span>{count.value.toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

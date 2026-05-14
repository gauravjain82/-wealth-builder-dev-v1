import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/features/auth';
import { Plan } from '@core/types';
import { roleToPlan } from '@/core/constants/roles';
import './training-center.css';

// ─── Plan helpers ─────────────────────────────────────────────────────────────
const PLAN = Plan;

function resolvePlan(user: ReturnType<typeof useAuth>['user']): Plan {
  const primaryRole = user?.roles?.[0];
  if (!primaryRole) return Plan.NewAgent;
  const normalized = primaryRole.toUpperCase().replace(/\s+/g, '_');
  return roleToPlan(normalized) ?? Plan.NewAgent;
}

// ─── Training data ─────────────────────────────────────────────────────────────
interface TrainingItem {
  id: string;
  title: string;
  href: string;
  xp: number;
}

interface TrainingSection {
  id: string;
  icon: string;
  label: string;
  items: TrainingItem[];
}

const TRAINING_DATA: TrainingSection[] = [
  {
    id: 'code-of-honor',
    icon: '🛡️',
    label: 'Code of Honor',
    items: [
      { id: 'code-1', title: 'Mission First, Team Second, Self Last', href: '#', xp: 75 },
      { id: 'code-2', title: 'No Excuses', href: '#', xp: 60 },
      { id: 'code-3', title: 'Take 100% Responsibility', href: '#', xp: 70 },
      { id: 'code-4', title: 'Deal Direct', href: '#', xp: 65 },
      { id: 'code-5', title: 'Constant Personal Communication', href: '#', xp: 80 },
      { id: 'code-6', title: 'Lead by Example', href: '#', xp: 75 },
      { id: 'code-7', title: 'Love One Another', href: '#', xp: 70 },
      { id: 'code-8', title: 'Honesty and Integrity', href: '#', xp: 75 },
      { id: 'code-9', title: 'Encourage, Praise, and Recognize', href: '#', xp: 80 },
      { id: 'code-10', title: 'Simplify to Multiply', href: '#', xp: 70 },
    ],
  },
  {
    id: 'business-model',
    icon: '🧩',
    label: 'Business Model',
    items: [
      { id: 'business-1', title: 'Our Model', href: '#', xp: 85 },
      { id: 'business-2', title: '# of Financial Advisors in the US', href: '#', xp: 75 },
    ],
  },
  {
    id: 'misconceptions',
    icon: '❗',
    label: 'Business Misconceptions',
    items: [
      { id: 'misconception-1', title: 'Early Negatives', href: '#', xp: 65 },
      { id: 'misconception-2', title: 'Is this a scam?', href: '#', xp: 80 },
      { id: 'misconception-3', title: 'Is this Multi-Level Marketing?', href: '#', xp: 75 },
      { id: 'misconception-4', title: 'Not a Real Financial Professional', href: '#', xp: 70 },
      { id: 'misconception-5', title: 'Recruiting Concerns', href: '#', xp: 65 },
      { id: 'misconception-6', title: "Don't Want to Damage My Reputation", href: '#', xp: 70 },
      { id: 'misconception-7', title: 'Not Enough Training', href: '#', xp: 60 },
      { id: 'misconception-8', title: 'Too Difficult My Friends Failed', href: '#', xp: 65 },
      { id: 'misconception-9', title: "Don't Want to Talk to Friends & Family", href: '#', xp: 75 },
      { id: 'misconception-10', title: 'Big Commission', href: '#', xp: 70 },
      { id: 'misconception-11', title: 'Low Contracts', href: '#', xp: 65 },
      { id: 'misconception-12', title: 'Is World Financial Group a Scam?', href: '#', xp: 85 },
      { id: 'misconception-13', title: 'Whats Wrong?', href: '#', xp: 60 },
      { id: 'misconception-14', title: 'WFG Documentary', href: '#', xp: 90 },
    ],
  },
  {
    id: 'words-of-business',
    icon: '🗣️',
    label: 'Words of Our Business',
    items: [
      { id: 'words-1', title: 'Early Negatives', href: '#', xp: 70 },
      { id: 'words-2', title: 'Is this a scam?', href: '#', xp: 75 },
      { id: 'words-3', title: 'Is this Multi-Level Marketing?', href: '#', xp: 75 },
      { id: 'words-4', title: 'Not a Real Financial Professional', href: '#', xp: 70 },
      { id: 'words-5', title: 'Recruiting Concerns', href: '#', xp: 65 },
      { id: 'words-6', title: "Don't Want to Damage My Reputation", href: '#', xp: 70 },
      { id: 'words-7', title: 'Not Enough Training', href: '#', xp: 60 },
      { id: 'words-8', title: 'Too Difficult My Friends Failed', href: '#', xp: 65 },
      { id: 'words-9', title: "Don't Want to Talk to Friends & Family", href: '#', xp: 75 },
      { id: 'words-10', title: 'Big Commission', href: '#', xp: 70 },
      { id: 'words-11', title: 'Low Contracts', href: '#', xp: 65 },
      { id: 'words-12', title: 'Is World Financial Group a Scam?', href: '#', xp: 80 },
      { id: 'words-13', title: 'Whats Wrong?', href: '#', xp: 65 },
      { id: 'words-14', title: 'WFG Documentary', href: '#', xp: 85 },
    ],
  },
  {
    id: 'licensing',
    icon: '🪪',
    label: 'Licensing',
    items: [
      { id: 'licensing-1', title: 'Licensing Crash Course', href: '#', xp: 100 },
    ],
  },
  {
    id: 'three-steps',
    icon: '3️⃣',
    label: '3 Steps Presentation',
    items: [
      {
        id: 'step-1',
        title: 'Step 1- New Art of Living',
        href: 'https://drive.google.com/file/d/1vRA5tuHohlZDI1K76TpFeJc6AAYZpcom/preview',
        xp: 85,
      },
    ],
  },
  {
    id: 'financial-education',
    icon: '📚',
    label: 'Financial Education',
    items: [
      { id: 'finance-1', title: 'Financial Literacy', href: '#', xp: 85 },
      { id: 'finance-2', title: 'Tyler McBroom – Tax Planning', href: '#', xp: 90 },
      { id: 'finance-3', title: 'David Walker on 60 minutes', href: '#', xp: 80 },
      { id: 'finance-4', title: 'David Walker & Kash Rastan', href: '#', xp: 85 },
      { id: 'finance-5', title: 'Doug Andrews training on IUL', href: '#', xp: 95 },
      { id: 'finance-6', title: 'Ed Slot on life insurance', href: '#', xp: 85 },
      { id: 'finance-7', title: 'Tony Robbins on Index Annuity', href: '#', xp: 90 },
      { id: 'finance-8', title: 'Why banks use life insurance to build wealth', href: '#', xp: 95 },
    ],
  },
  {
    id: 'agent-resources',
    icon: '🧰',
    label: 'Agent Resources',
    items: [
      { id: 'resource-1', title: 'Transamerica', href: '#', xp: 75 },
      { id: 'resource-2', title: 'Everest', href: '#', xp: 75 },
      { id: 'resource-3', title: 'Global videos', href: '#', xp: 80 },
    ],
  },
];

const ALL_SECTION_IDS = TRAINING_DATA.map((s) => s.id);

const SECTION_ACCESS: Record<Plan, string[]> = {
  [PLAN.NewAgent]: ['code-of-honor', 'business-model', 'misconceptions'],
  [PLAN.Agent]: [
    'code-of-honor',
    'business-model',
    'misconceptions',
    'financial-education',
    'agent-resources',
  ],
  [PLAN.Leader]: ALL_SECTION_IDS,
  [PLAN.Broker]: ALL_SECTION_IDS,
  [PLAN.SeniorBroker]: ALL_SECTION_IDS,
  [PLAN.Admin]: ALL_SECTION_IDS,
};

// ─── URL helpers ──────────────────────────────────────────────────────────────
function isVideoHref(href = ''): boolean {
  const v = href.toLowerCase();
  return (
    v.includes('youtube.com') ||
    v.includes('youtu.be') ||
    v.includes('vimeo.com') ||
    v.includes('drive.google.com') ||
    v.includes('docs.google.com') ||
    v.endsWith('.mp4') ||
    v.includes('/preview')
  );
}

function shouldUseIframe(href = ''): boolean {
  const v = href.toLowerCase();
  return (
    v.includes('drive.google.com') ||
    v.includes('docs.google.com') ||
    v.includes('youtube.com') ||
    v.includes('youtu.be') ||
    v.includes('vimeo.com')
  );
}

function lockedPlayerSrc(href = ''): string {
  if (!href) return href;
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      url.searchParams.set('fs', '0');
      url.searchParams.set('modestbranding', '1');
      url.searchParams.set('rel', '0');
      return url.toString();
    }
    if (host.includes('vimeo.com')) {
      url.searchParams.set('fullscreen', '0');
      return url.toString();
    }
    return url.toString();
  } catch {
    return href;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TrainingCenterPage() {
  const { user } = useAuth();
  const resolvedPlan = resolvePlan(user);

  const allowedSectionIds = useMemo(() => {
    const access = SECTION_ACCESS[resolvedPlan] ?? SECTION_ACCESS[PLAN.NewAgent];
    return new Set(access);
  }, [resolvedPlan]);

  const visibleSections = useMemo(() => {
    const filtered = TRAINING_DATA.filter((s) => allowedSectionIds.has(s.id));
    return filtered.length ? filtered : [TRAINING_DATA[0]];
  }, [allowedSectionIds]);

  const [activeId, setActiveId] = useState<string>(() => visibleSections[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [openedModules, setOpenedModules] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('training_opened');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [totalXP, setTotalXP] = useState<number>(() => {
    const saved = localStorage.getItem('training_xp');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [showAchievement, setShowAchievement] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [playerSrc, setPlayerSrc] = useState('');
  const [playerTitle, setPlayerTitle] = useState('');

  useEffect(() => {
    if (!visibleSections.find((s) => s.id === activeId)) {
      setActiveId(visibleSections[0]?.id ?? '');
    }
  }, [visibleSections, activeId]);

  useEffect(() => {
    if (!isPlayerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPlayerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isPlayerOpen]);

  const activeSection = useMemo(
    () => visibleSections.find((s) => s.id === activeId) ?? visibleSections[0],
    [visibleSections, activeId],
  );

  const stats = useMemo(() => {
    let totalModules = 0;
    let openedCount = 0;
    visibleSections.forEach((section) => {
      section.items.forEach((item) => {
        totalModules++;
        if (openedModules[item.id]) openedCount++;
      });
    });
    const level = Math.floor(totalXP / 500) + 1;
    const xpForNextLevel = level * 500;
    const xpProgress = ((totalXP % 500) / 500) * 100;
    return {
      totalModules,
      openedCount,
      totalXP,
      level,
      xpForNextLevel,
      xpProgress,
      explorationPercent: totalModules ? Math.round((openedCount / totalModules) * 100) : 0,
    };
  }, [openedModules, totalXP, visibleSections]);

  const sectionStats = useMemo(() => {
    return visibleSections.map((section) => {
      const opened = section.items.filter((item) => openedModules[item.id]).length;
      const total = section.items.length;
      return { ...section, opened, total, percent: total ? Math.round((opened / total) * 100) : 0 };
    });
  }, [openedModules, visibleSections]);

  const filteredItems = useMemo(() => {
    if (!activeSection) return [];
    if (!query.trim()) return activeSection.items;
    const q = query.toLowerCase();
    return activeSection.items.filter((i) => i.title.toLowerCase().includes(q));
  }, [query, activeSection]);

  const handleModuleClick = (item: TrainingItem) => {
    if (!openedModules[item.id]) {
      const newXP = totalXP + item.xp;
      const newOpened = { ...openedModules, [item.id]: true };
      setOpenedModules(newOpened);
      setTotalXP(newXP);
      setEarnedXP(item.xp);
      localStorage.setItem('training_opened', JSON.stringify(newOpened));
      localStorage.setItem('training_xp', newXP.toString());
      setShowAchievement(true);
      setTimeout(() => setShowAchievement(false), 3000);
    }
    if (item.href && item.href !== '#') {
      if (isVideoHref(item.href)) {
        setPlayerSrc(lockedPlayerSrc(item.href));
        setPlayerTitle(item.title);
        setIsPlayerOpen(true);
      } else {
        window.open(item.href, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const closePlayer = () => {
    setIsPlayerOpen(false);
    setPlayerSrc('');
    setPlayerTitle('');
  };

  return (
    <div className="training-hub">
      {/* Hero Header */}
      <div className="training-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="title-icon">🎓</span>
            Training Center
          </h1>
          <p className="hero-subtitle">Level up your skills and earn achievements</p>
        </div>

        {/* Stats Dashboard */}
        <div className="stats-dashboard">
          <div className="stat-card level-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-info">
              <div className="stat-label">Level</div>
              <div className="stat-value">{stats.level}</div>
            </div>
            <div className="level-progress">
              <div className="level-bar">
                <div className="level-fill" style={{ width: `${stats.xpProgress}%` }} />
              </div>
              <div className="level-text">{stats.totalXP} / {stats.xpForNextLevel} XP</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon completed">🎯</div>
            <div className="stat-info">
              <div className="stat-label">Explored</div>
              <div className="stat-value">{stats.openedCount}/{stats.totalModules}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon progress">📈</div>
            <div className="stat-info">
              <div className="stat-label">Discovery</div>
              <div className="stat-value">{stats.explorationPercent}%</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon xp">💎</div>
            <div className="stat-info">
              <div className="stat-label">Total XP</div>
              <div className="stat-value">{stats.totalXP}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="training-content">
        {/* Sidebar */}
        <aside className="training-sidebar">
          <div className="sidebar-header">
            <h3>Course Tracks</h3>
            <input
              type="text"
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Search..."
            />
          </div>

          <nav className="section-nav">
            {sectionStats.map((section) => (
              <button
                key={section.id}
                className={`section-btn ${section.id === activeId ? 'active' : ''}`}
                onClick={() => setActiveId(section.id)}
              >
                <div className="section-icon-wrap">
                  <span className="section-icon">{section.icon}</span>
                  {section.percent === 100 && (
                    <span className="completion-badge">✓</span>
                  )}
                </div>
                <div className="section-info">
                  <div className="section-label">{section.label}</div>
                  <div className="section-progress-mini">
                    <div className="progress-mini-bar">
                      <div className="progress-mini-fill" style={{ width: `${section.percent}%` }} />
                    </div>
                    <span className="progress-mini-text">{section.opened}/{section.total}</span>
                  </div>
                </div>
                <span className="section-arrow">›</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Module Grid */}
        <main className="training-main">
          <div className="main-header">
            <div className="section-title-wrap">
              <span className="section-title-icon">{activeSection?.icon}</span>
              <h2 className="section-title">{activeSection?.label}</h2>
            </div>
            <div className="section-meta">
              {sectionStats.find((s) => s.id === activeId)?.opened ?? 0} of{' '}
              {activeSection?.items.length ?? 0} explored
            </div>
          </div>

          <div className="modules-grid">
            {filteredItems.map((item) => {
              const isOpened = openedModules[item.id];
              return (
                <div
                  key={item.id}
                  className={`module-card ${isOpened ? 'opened' : ''}`}
                  onClick={() => handleModuleClick(item)}
                >
                  <div className="module-status">
                    {isOpened ? (
                      <span className="status-icon opened">✓</span>
                    ) : (
                      <span className="status-icon available">▶</span>
                    )}
                  </div>
                  <div className="module-content">
                    <h3 className="module-title">{item.title}</h3>
                    <div className="module-xp">
                      <span className="xp-icon">💎</span>
                      <span className="xp-value">{isOpened ? 'Opened' : `${item.xp} XP`}</span>
                    </div>
                  </div>
                  <div className="module-hover-effect" />
                  {isOpened && <div className="completion-glow" />}
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-text">No modules found</div>
                <div className="empty-hint">Try a different search term</div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Achievement Popup */}
      {showAchievement && (
        <div className="achievement-popup">
          <div className="achievement-content">
            <div className="achievement-icon">🎉</div>
            <div className="achievement-text">
              <div className="achievement-title">XP Earned!</div>
              <div className="achievement-subtitle">+{earnedXP} XP</div>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Overlay */}
      {isPlayerOpen && (
        <div
          className="training-player-overlay"
          onClick={closePlayer}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className="training-player-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={playerTitle || 'Training video player'}
          >
            <button type="button" className="training-player-close-btn" onClick={closePlayer}>
              ✖ Close
            </button>
            <div className="training-player-title">{playerTitle}</div>

            {shouldUseIframe(playerSrc) ? (
              <div className="training-iframe-wrap">
                <iframe
                  title={playerTitle || 'Training video'}
                  src={playerSrc}
                  className="training-embedded-video"
                  allow="autoplay; encrypted-media"
                  frameBorder="0"
                  referrerPolicy="no-referrer"
                />
                <div className="training-iframe-control-shield" aria-hidden="true" />
              </div>
            ) : (
              <video
                title={playerTitle || 'Training video'}
                src={playerSrc}
                className="training-embedded-video"
                controls
                controlsList="nodownload nofullscreen noremoteplayback"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import './track-my-license-page.css';

const STORAGE_KEY = 'lic_progress_v1';
const BOT_IMG =
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/ChatGPT%20Image%20Sep%2027%2C%202025%2C%2002_53_23%20PM.png?alt=media&token=c9d594d5-0e85-454e-8361-89889e471530';

const VIDEO_LIST = [
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Track%20my%20license%2Fstep%202%20Sign-up-for-test-and-set-up-test-date-Pearson-VUE-20221003-optimized.mp4?alt=media&token=f37d4dc1-5b49-42ba-9775-4299ad70da2c',
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Track%20my%20license%2FStep-1-Sign-Up-On-Pre-Licensing.mp4?alt=media&token=d9298f91-5a8e-4b2f-8b95-f207a912d96c',
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Track%20my%20license%2FStep-2-Submit-Agent-Agreement-On-Wfg-Launch-Or-Direct.mp4?alt=media&token=e34c98c8-74ac-438a-8121-e55480c1d1c8',
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Track%20my%20license%2FStep-3-Pass-The-Test.mp4?alt=media&token=c43507f2-2a0d-4032-97db-ceb1ef82af5b',
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Track%20my%20license%2FStep-4-Getting-Your-Fingerprints-Done.mp4?alt=media&token=78db33e6-50d6-40be-b6a0-600bcd0177b0',
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Track%20my%20license%2Fstep-5-fill-out-nipr-application-with-state.mp4?alt=media&token=9560e62a-52f6-4139-a24e-7207379dfa04',
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Track%20my%20license%2Fstep-5-fill-out-sircon-application-with-state.mp4?alt=media&token=e2974d62-9974-4c6b-a7cc-b68ae5865b9a',
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Track%20my%20license%2FStep-6-Receive-Your-License-Certificate-From-Sircon-Nipr-In-Your-Email-1.mp4?alt=media&token=8b69ad3f-cbeb-41c7-87ff-4cd5e0b68b27',
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Track%20my%20license%2FStep-7-Create-Your-Username-Password-And-Log-In-For-Wfg-Launch-Or-Direct.mp4?alt=media&token=a5ef54b3-f89f-4270-a2df-d4b2bd7ef904',
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Track%20my%20license%2Fstep-9-sign-up-for-continuing-education-on-kaplan.mp4?alt=media&token=b2755bf4-41e1-49ab-a9c8-1ef9818740a7',
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Track%20my%20license%2Fstep-10-finish-your-anti-money-laundering-course.mp4?alt=media&token=8c7d5256-91fe-4ee5-9e98-25ed219cf119',
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Track%20my%20license%2FStep-14-Receive-Approval-Of-Agent-Agreement-From-Wfg-In-Your-Email.mp4?alt=media&token=3c204947-c999-418b-8e9e-a2c18e3b38ff',
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Track%20my%20license%2FStep-15-Log-Into-Mywfg-Sign-Up-For-E-O---Platform.mp4?alt=media&token=8310a227-ae86-488c-99ef-1935143f0752',
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/Track%20my%20license%2FStep-16-Log-Into-Mywfg-Sign-Up-For-Direct-Deposit.mp4?alt=media&token=7fb3fbbb-9a73-4f83-a5d2-ea11d335414c',
];

interface Chapter {
  id: string;
  title: string;
  videoUrls: string[];
}

interface Progress {
  completed: Record<string, boolean>;
}

function buildChapters(): Chapter[] {
  const chapters: Chapter[] = [];
  let i = 0;
  const totalVideos = VIDEO_LIST.length;
  const NUM_CHAPTERS = 14;

  for (let ch = 1; ch <= NUM_CHAPTERS; ch++) {
    const videoUrls: string[] = [];
    videoUrls.push(VIDEO_LIST[i]);
    i++;
    if ((ch === 5 || ch === 9) && i < totalVideos) {
      videoUrls.push(VIDEO_LIST[i]);
      i++;
    }
    chapters.push({
      id: `ch${ch}`,
      title: `Chapter ${ch}`,
      videoUrls: videoUrls.filter(Boolean),
    });
    if (i >= totalVideos) break;
  }

  while (i < totalVideos) {
    chapters[chapters.length - 1].videoUrls.push(VIDEO_LIST[i]);
    i++;
  }

  return chapters;
}

const MODULES = buildChapters();

export default function TrackMyLicensePage() {
  const [progress, setProgress] = useState<Progress>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const stored = raw ? JSON.parse(raw) : null;

      if (!stored) {
        const completed: Record<string, boolean> = {};
        completed[MODULES[0].id] = true;
        return { completed };
      }

      return {
        completed: {
          ...stored.completed,
          [MODULES[0].id]: true,
        },
      };
    } catch {
      return { completed: { [MODULES[0].id]: true, [MODULES[1].id]: true } };
    }
  });

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [fillingIndex, setFillingIndex] = useState<number | null>(null);
  const [showCoachBot, setShowCoachBot] = useState(true);
  const [chapterTip, setChapterTip] = useState(false);
  const [toast, setToast] = useState('');
  const [showModal, setShowModal] = useState(false);

  const completedCount = useMemo(
    () => MODULES.filter((m) => progress.completed[m.id]).length,
    [progress.completed]
  );
  const allDone = completedCount === MODULES.length;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    if (!openIndex) {
      const t = setTimeout(() => setChapterTip(true), 2000);
      return () => clearTimeout(t);
    }
  }, [openIndex]);

  const canOpen = (index: number) => {
    if (index === 0) return true;
    const prevId = MODULES[index - 1].id;
    return !!progress.completed[prevId];
  };

  const handleClickSeg = (idx: number) => {
    if (animating || allDone) return;
    if (!canOpen(idx)) return;
    setShowCoachBot(false);
    setChapterTip(false);
    setOpenIndex(idx);
    setCurrentVideoIdx(0);
    setShowModal(true);
  };

  const startGoldFill = (idx: number) => {
    setAnimating(true);
    setFillingIndex(idx);
    setTimeout(() => {
      const m = MODULES[idx];
      setProgress((p) => ({
        ...p,
        completed: { ...p.completed, [m.id]: true },
      }));
      setShowModal(false);
      setOpenIndex(null);
      setAnimating(false);
      setFillingIndex(null);
      setToast('Progress updated');
      setTimeout(() => setToast(''), 1800);
    }, 3000);
  };

  const currentModule = openIndex != null ? MODULES[openIndex] : null;
  const currentVideoUrl = currentModule?.videoUrls?.[currentVideoIdx] || null;

  const onVideoEnded = () => {
    if (!currentModule) return;

    const hasMoreVideos = currentVideoIdx < currentModule.videoUrls.length - 1;
    if (hasMoreVideos) {
      setCurrentVideoIdx((i) => i + 1);
      return;
    }

    const nextChapter = openIndex! + 1;
    startGoldFill(openIndex!);

    if (nextChapter < MODULES.length) {
      setTimeout(() => {
        setOpenIndex(nextChapter);
        setCurrentVideoIdx(0);
        setShowModal(true);
        setShowCoachBot(true);
        setChapterTip(true);
      }, 3300);
    } else {
      setShowCoachBot(true);
      setChapterTip(true);
      setShowModal(false);
    }

    setTimeout(() => setChapterTip(true), 5000);
  };

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProgress({ completed: {} });
    setOpenIndex(null);
    setCurrentVideoIdx(0);
    setAnimating(false);
    setFillingIndex(null);
    setChapterTip(false);
    setToast('Reset done');
    setTimeout(() => setToast(''), 1200);
  };

  const closeModal = () => {
    setShowModal(false);
    setShowCoachBot(true);
    setOpenIndex(null);
  };

  return (
    <div className="track-license-page">
      {/* Reset Button - Floating */}
      <button className="reset-btn-floating" onClick={resetAll}>
        🔄 Reset
      </button>

      {/* Header Section */}
      <div className="track-header">
        <h1 className="track-title">
          <span className="track-icon">⚡</span>
          TRACK MY LICENSE
        </h1>
        <p className="track-subtitle">
          Complete each step to charge your licensing journey
        </p>
      </div>

      {/* Progress Stats Glass Card */}
      <div className="progress-stats-glass">
        <div className="stat-item">
          <div className="stat-icon-circle">✓</div>
          <div className="stat-content">
            <div className="stat-value">{completedCount}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>

        <div className="stat-divider"></div>

        <div className="stat-item">
          <div className="stat-icon-circle">📊</div>
          <div className="stat-content">
            <div className="stat-value">
              {Math.round((completedCount / MODULES.length) * 100)}%
            </div>
            <div className="stat-label">Progress</div>
          </div>
        </div>

        <div className="stat-divider"></div>

        <div className="stat-item">
          <div className="stat-icon-circle">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{MODULES.length - completedCount}</div>
            <div className="stat-label">Remaining</div>
          </div>
        </div>
      </div>

      {/* Battery Container */}
      <div className="battery-container-modern">
        <div className={`battery-modern ${allDone ? 'battery-complete' : ''}`}>
          {/* Battery Body */}
          <div className="battery-body">
            {/* Battery Segments */}
            <div className="battery-segments">
              {MODULES.map((m, i) => {
                const done = !!progress.completed[m.id];
                const unlocked = canOpen(i);
                const isFilling = fillingIndex === i;
                const cls = [
                  'battery-segment',
                  done
                    ? 'segment-charged'
                    : unlocked
                    ? 'segment-active'
                    : 'segment-locked',
                  isFilling ? 'segment-charging' : '',
                ].join(' ');
                return (
                  <button
                    key={m.id}
                    className={cls}
                    onClick={() => handleClickSeg(i)}
                    disabled={!unlocked || animating || allDone}
                    title={`Chapter ${i + 1}${
                      done ? ' ✓' : unlocked ? ' - Click to watch' : ' 🔒'
                    }`}
                  >
                    <span className="segment-number">{i + 1}</span>
                    {done && <span className="segment-check">✓</span>}
                    {isFilling && <div className="charging-spark"></div>}
                  </button>
                );
              })}
            </div>

            {/* Battery Charge Fill Effect */}
            <div
              className="battery-charge-fill"
              style={{
                width: `${(completedCount / MODULES.length) * 100}%`,
              }}
            />

            {/* Battery Shine Effect */}
            <div className="battery-shine"></div>
          </div>

          {/* Battery Terminal (Tip) */}
          <div className="battery-terminal">
            <div className="terminal-inner"></div>
          </div>
        </div>

        {/* Percentage Display */}
        <div className="battery-percentage">
          <span className="percentage-value">
            {Math.round((completedCount / MODULES.length) * 100)}
          </span>
          <span className="percentage-symbol">%</span>
        </div>
      </div>

      {/* Tip Bot - Slide Up Animation */}
      {chapterTip && !allDone && showCoachBot && (
        <div className="tip-bot-container slide-up">
          <div className="tip-bot-glass">
            <img
              src={BOT_IMG}
              alt="Coach Bot"
              className="tip-bot-avatar"
              draggable="false"
            />
            <div className="tip-bot-content">
              <div className="tip-bot-header">
                <span className="tip-bot-badge">💡 Quick Tip</span>
              </div>
              <div className="tip-bot-message">
                Click on any <strong>unlocked chapter</strong> in the battery to
                watch the video. Complete all chapters to fully charge your
                license! ⚡
              </div>
            </div>
            <div className="tip-bot-pulse"></div>
          </div>
        </div>
      )}

      {/* VIDEO MODAL - Enhanced */}
      {showModal && currentVideoUrl && (
        <div className="video-modal-overlay-modern" onClick={closeModal}>
          <div
            className="video-modal-content-modern"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="video-modal-header">
              <h3 className="video-modal-title">
                📹 Chapter {openIndex! + 1}
                {currentModule!.videoUrls.length > 1 && (
                  <span className="video-count">
                    {' '}
                    ({currentVideoIdx + 1}/{currentModule!.videoUrls.length})
                  </span>
                )}
              </h3>
              <button className="video-modal-close-btn" onClick={closeModal}>
                ✕
              </button>
            </div>
            <video
              className="lic-video-modal-modern"
              src={currentVideoUrl}
              controls
              autoPlay
              playsInline
              onEnded={onVideoEnded}
            />
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast-modern">
          <span className="toast-icon">✨</span>
          {toast}
        </div>
      )}
    </div>
  );
}

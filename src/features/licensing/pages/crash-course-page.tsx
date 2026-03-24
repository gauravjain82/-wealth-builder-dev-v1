import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './crash-course-page.css';

const STORAGE_MODULE_PROGRESS = 'crash_module_progress_v1';
const STORAGE_HISTORY = 'crash_history_v2';

interface Video {
  id: string;
  title: string;
  durationMin: number;
  src: string;
}

interface Module {
  id: string;
  title: string;
  cover: string;
  videos: Video[];
}

interface CourseInfo {
  id: string;
  title: string;
  mainVideoUrl: string;
  poster: string;
}

interface LastWatched {
  lastCourseId: string;
  lastCourseTitle: string;
  lastModuleId: string;
  lastModuleTitle: string;
  at: number;
}

/** 🔧 Put your Firebase vertical AI intro video URL here (optional) */
const COURSE: CourseInfo = {
  id: 'lic-crash-001',
  title: 'Licensing Crash Course',
  mainVideoUrl: '', // e.g. "https://firebasestorage.googleapis.com/v0/b/<bucket>/o/ai-walkthrough.mp4?alt=media"
  poster:
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=1600&auto=format&fit=crop',
};

/** 🔧 MODULES & VIDEOS — EXACT ORDER */
const MODULES: Module[] = [
  // ===== Module 1 — 1..6 =====
  {
    id: 'm1',
    title: "Do's/Don'ts & Strategies",
    cover:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80',
    videos: [
      {
        id: 'v01',
        title: 'Intro & Welcome',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F1_intro_and_welcome_unit_1.mp4?alt=media&token=f50866bf-9d04-4c7a-a6a8-f64bc61b2feb',
      },
      {
        id: 'v02',
        title: 'How to Pass — 3-Step Program',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F2_how_to_pass_the_test_-_3_step_program_unit_2.mp4?alt=media&token=5af4a350-706f-4c34-994a-f07cc06a2069',
      },
      {
        id: 'v03',
        title: '5 Steps to Complete the 7-Day Standard',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F3_5_steps_to_complete_the_7_day_standard_unit_3mp4.mp4?alt=media&token=6ec55424-80de-47dc-84c2-322c5915b511',
      },
      {
        id: 'v04',
        title: 'Testing FAQs, Guidelines & Info',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F4_testing_faqs_guidelines__information_unit_4.mp4?alt=media&token=068dd80a-a0ce-4bea-b2e2-b64c61a1d9a4',
      },
      {
        id: 'v05',
        title: "Testing Do's & Don'ts",
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F5_testing_do_s__don_ts_unit_5.mp4?alt=media&token=42adf10a-5c75-4625-b0de-8b67402d9463',
      },
      {
        id: 'v06',
        title: '5 Crucial Strategies for Test-Taking',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F6_5_crucial_strategies_for_test_taking_unit_6.mp4?alt=media&token=6048a391-e7ac-4b1e-9d5d-404ceccd5b8e',
      },
    ],
  },

  // ===== Module 2 — 7..13 =====
  {
    id: 'm2',
    title: 'Life Insurance Concepts',
    cover:
      'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop&q=80',
    videos: [
      {
        id: 'v07',
        title: 'Life Insurance Concepts & Terms — Intro',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F7_life_insurance_concepts__terms_introduction_unit_7.mp4?alt=media&token=4f3851d5-20c8-451c-abbb-96d669559346',
      },
      {
        id: 'v08',
        title: 'Insurance Contracts — Test Perspective',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F8_insurance_contracts__test_perspective_unit_8.mp4?alt=media&token=8c5f16be-a4da-4f00-866a-1f2cb0654b9e',
      },
      {
        id: 'v09',
        title: 'Types of Insurance & Cost of Premiums',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F9_types_of_insurancecost_of_premiums_unit_9.mp4?alt=media&token=bfb7fd50-e5db-482b-8b1b-25d427678dbb',
      },
      {
        id: 'v10',
        title: 'Liability, Underwriting & "Danger"',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F10_liability_underwriting__danger_unit_10.mp4?alt=media&token=6c6158ab-5fec-4d4f-a759-c684041eea8e',
      },
      {
        id: 'v11',
        title: 'Business Structures / Isolated Facts',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F11_business_structuresisolated_facts_unit_11.mp4?alt=media&token=61dafff6-01a4-4d04-8be5-330fa7af7942',
      },
      {
        id: 'v12',
        title: 'Business Entities / Common Riders & Clauses',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F12_business_entitiescommon_ridersclauses_unit_12.mp4?alt=media&token=78e06f4d-c449-4b2e-bc7b-0a9d716a737b',
      },
      {
        id: 'v13',
        title: 'Insurance Clauses (12a)',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F13_insurance_clauses_unit_12a.mp4?alt=media&token=e8b69739-a181-4788-b497-ed76767de827',
      },
    ],
  },

  // ===== Module 3 — 14..16 =====
  {
    id: 'm3',
    title: 'Annuities & General Life',
    cover:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop&q=80',
    videos: [
      {
        id: 'v14',
        title: 'Annuities — History, Concepts & Types',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F14_world_of_annuities_-_history_concept_types_unit_13.mp4?alt=media&token=9304afe0-e1bf-4816-88a0-d44b83307c16',
      },
      {
        id: 'v15',
        title: 'Annuities — Annuitization, Payouts & Taxes',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F15_world_of_annuities_-_annuitization_payouts_taxes_unit_14.mp4?alt=media&token=d4363bb2-3781-48ea-ae8b-6b71fd7d06c7',
      },
      {
        id: 'v16',
        title: 'Annuities — Important Rules',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F16_world_of_annuities_-_important_rules_unit_15.mp4?alt=media&token=100fc3d7-20de-46a2-864e-3673a8392f21',
      },
    ],
  },

  // ===== Module 4 — 17..20 =====
  {
    id: 'm4',
    title: 'Medical and Disability Concepts',
    cover:
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    videos: [
      {
        id: 'v17',
        title: 'Health/Medical Concepts — Overview (add link for #17)',
        durationMin: 0,
        src: '',
      },
      {
        id: 'v18',
        title: 'Medicare',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F18_medicare_unit_17.mp4?alt=media&token=089300f9-514a-4a91-b822-71ff03eef707',
      },
      {
        id: 'v19',
        title: 'Types/Concepts & Patient Responsibilities',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F19_typesconceptspatient_responsibilities_unit_18.mp4?alt=media&token=716f5245-732b-41b2-9aa3-8069b34d3e9d',
      },
      {
        id: 'v20',
        title: 'Medical & Disability — Review/Wrap-up',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F2o.mp4?alt=media&token=ae4cde77-62d7-4acc-936e-1857667b2e7a',
      },
    ],
  },

  // ===== Module 5 — 21..23 =====
  {
    id: 'm5',
    title: 'Practice Tests / Simulated Exams',
    cover:
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80',
    videos: [
      {
        id: 'v21',
        title: 'XcelTesting Practice Test — Tutorial (Part 1)',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F21_xceltesting_website_practice_test_tutorial_part_1_unit_20.mp4?alt=media&token=4b1e1808-15b9-4a3c-8c3a-c6449d8228e1',
      },
      {
        id: 'v22',
        title: 'XcelTesting Practice Test — Tutorial (Part 2)',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F22_xceltesting_website_practice_test_tutorial_part_2_unit_21.mp4?alt=media&token=ba9459e9-3ee1-4fa1-98b2-db6105d9cf03',
      },
      {
        id: 'v23',
        title: 'Final Exam Tutorial & Final Notes',
        durationMin: 0,
        src: 'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/CrashCourse%2F23_final_exam_tutorial_final_notes-_unit_22.mp4?alt=media&token=9888a3f7-a1c2-436f-9add-a4eee580d5e6',
      },
    ],
  },
];

export default function CrashCoursePage() {
  const navigate = useNavigate();

  const [moduleProgress] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE_MODULE_PROGRESS) || '{}'
      );
    } catch {
      return {};
    }
  });
  const [lastWatched, setLastWatched] = useState<LastWatched | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_HISTORY) || 'null');
    } catch {
      return null;
    }
  });

  // derived stats
  const watchedModules = useMemo(
    () => MODULES.filter((m) => (moduleProgress[m.id] || 0) >= 99).length,
    [moduleProgress]
  );
  const overallPct = Math.round((watchedModules / MODULES.length) * 100);
  const leftModules = MODULES.length - watchedModules;

  const totalMinutes = (m: Module) =>
    m.videos.reduce((s, v) => s + (v.durationMin || 0), 0);

  const openModule = (mod: Module) => {
    const payload: LastWatched = {
      lastCourseId: COURSE.id,
      lastCourseTitle: COURSE.title,
      lastModuleId: mod.id,
      lastModuleTitle: mod.title,
      at: Date.now(),
    };
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(payload));
    setLastWatched(payload);
    navigate(`/licensing/chapter/${mod.id}`, { state: { module: mod } });
  };

  return (
    <div className="cc-wrap">
      {/* HEADER / PROGRESS - ONE LINER GLASS */}
      <section className="cc-progress-glass">
        <div className="cc-progress-container">
          <div className="cc-prog-title-glass">🎓 CRASH COURSE PROGRESS</div>

          <div className="cc-progress-oneliner">
            <div className="cc-progress-bar-glass">
              <div
                className="cc-progress-fill-glass"
                style={{ width: `${overallPct}%` }}
              />
              <div className="cc-progress-percentage">{overallPct}%</div>
            </div>

            <div className="cc-stats-inline">
              <div className="cc-stat-chip-glass">
                <span className="stat-icon">✓</span>
                <span className="stat-value">{watchedModules}</span>
                <span className="stat-label-small">Watched</span>
              </div>

              <div className="cc-stat-chip-glass">
                <span className="stat-icon">⏱</span>
                <span className="stat-value">{leftModules}</span>
                <span className="stat-label-small">Left</span>
              </div>

              <div className="cc-stat-chip-glass cc-stat-wide">
                <span className="stat-icon">📖</span>
                <span className="stat-value-text">
                  {lastWatched?.lastModuleTitle || '—'}
                </span>
                <span className="stat-label-small">Last Opened</span>
              </div>

              <div className="cc-stat-chip-glass">
                <span className="stat-icon">📚</span>
                <span className="stat-value">{MODULES.length}</span>
                <span className="stat-label-small">Total</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STRICT ONE-LINE STRIP: Intro → Module 1..5 */}
      <section className="ccx-row">
        <div className="ccx-strip" aria-label="Crash Course Modules">
          {/* Intro card (AI walkthrough) */}
          <article
            className="ccx-item cc-card main"
            data-order="0"
            title="How this crash course works"
          >
            <div className="cc-main-media video">
              {COURSE.mainVideoUrl ? (
                <video
                  className="cc-main-vid"
                  src={COURSE.mainVideoUrl}
                  poster={COURSE.poster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                />
              ) : (
                <img
                  className="cc-main-vid"
                  src={COURSE.poster}
                  alt="Crash course poster"
                />
              )}
            </div>
          </article>

          {/* Modules in order */}
          {MODULES.map((mod, idx) => {
            const pct = moduleProgress[mod.id] || 0;
            const mins = totalMinutes(mod);
            return (
              <article
                key={mod.id}
                className="ccx-item cc-card chapter"
                data-order={idx + 1}
                title={mod.title}
              >
                <div
                  className="cc-card-media netflix"
                  style={{ backgroundImage: `url(${mod.cover})` }}
                >
                  <div className="cc-chapter-badge">{`MODULE ${idx + 1}`}</div>
                  <div className="cc-media-title">{mod.title}</div>
                </div>

                <div className="cc-meta-row">
                  <div className="cc-meta-chip">
                    <span className="chip-ico">▶︎</span>
                    {mod.videos.length}
                  </div>
                  <div className="cc-meta-chip">
                    <span className="chip-ico">⏱</span>
                    {mins}m
                  </div>
                </div>

                <div className="cc-mini-progress">
                  <div className="cc-mini-fill" style={{ width: `${pct}%` }} />
                </div>

                <div className="cc-select-bar">
                  <button
                    className="cc-btn cc-btn-gold cc-btn-wide"
                    onClick={() => openModule(mod)}
                  >
                    Open Module
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

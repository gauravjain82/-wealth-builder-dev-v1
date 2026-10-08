export type ModuleStatus = "pending" | "watch" | "quiz" | "ai_test" | "done";
export type PromotionStatus = "ready" | "close" | "not_ready";
export type RankCode = "TA" | "A" | "MD" | string;

export interface PromotionModule {
  id: number;
  title: string;
  subtitle: string;
  video_url: string;
  duration_label: string;
  has_quiz: boolean;
  status: ModuleStatus;
  watched_at: string | null;
  /** Furthest point of the video played so far, in seconds. */
  watch_seconds: number;
  video_duration: number;
  quiz_score: number | null;
  quiz_total: number | null;
  quiz_passed_at: string | null;
  /** The module has an AI test the learner must pass after the quiz. */
  has_ai_test: boolean;
  ai_test_passed: boolean;
  ai_test_best_score: number | null;
}
/** The server's view of a learner's playback after a progress report. */
export interface WatchProgress {
  watch_seconds: number;
  video_duration: number;
  watched_at: string | null;
}
export interface PromotionSkill {
  id: number;
  label: string;
  tag: "skill" | "action";
  modules_done: number;
  total_modules: number;
  is_complete: boolean;
  is_manually_checked: boolean;
  modules: PromotionModule[];
}
export interface RouteItem {
  id: number;
  label: string;
  item_type: "check" | "numeric";
  target_value: number | null;
  unit: string;
  leg_group: string;
  data_source?: string;
  is_checked: boolean;
  numeric_value: number | null;
  is_done: boolean;
}
export interface PromotionRoute {
  id: number;
  name: string;
  time_label: string;
  is_urgent: boolean;
  is_eligible: boolean;
  note: string;
  is_selected: boolean;
  done_items: number;
  total_items: number;
  route_pct: number;
  items: RouteItem[];
}
export interface PromotionDashboard {
  track: { id: number; name: string; level_code: RankCode; level_name: string };
  days_in_rank: number;
  overall_pct: number;
  promotion_status: PromotionStatus;
  done_skills: number;
  total_skills: number;
  selected_route_id: number | null;
  skills: PromotionSkill[];
  routes: PromotionRoute[];
}
export type PromotionDashboardResponse = PromotionDashboard | PromotionDashboard[];
/** A quiz question as the learner gets it — the answer stays on the server. */
export interface QuizQuestion {
  id: number;
  question_text: string;
  options: string[];
  order: number;
}
export interface QuizQuestionResult {
  question_id: number;
  selected_index: number | null;
  is_correct: boolean;
}
export interface QuizSubmitResult {
  score: number;
  total: number;
  passed: boolean;
  results: QuizQuestionResult[];
  quiz_passed_at: string | null;
  skill_auto_completed: boolean;
}
export interface TeamSkillProgress {
  label: string;
  videos: number;
  done: number;
  is_complete: boolean;
}
export interface TeamMember {
  id: number;
  name: string;
  rank_code: RankCode;
  rank_name: string;
  days_in_rank: number;
  total_videos: number;
  done_videos: number;
  skill_pct: number;
  route_pct: number;
  overall: number;
  skill_progress: TeamSkillProgress[];
  routes: Omit<PromotionRoute, "id" | "is_selected">[];
  ai_tests: {
    /** Modules on their track with a required AI test. */
    required: number;
    passed: number;
    /** Quiz passed, AI test still to pass. */
    pending: number;
    attempts: number;
    best_score: number | null;
  };
}
export interface TeamResponse {
  stats: {
    total: number;
    ready: number;
    in_progress: number;
    just_started: number;
  };
  members: TeamMember[];
}
export type TeamSort = "progress_asc" | "progress_desc" | "name" | "rank";

// ── AI Coach (Sophia's voice test after the quiz) ──────────────────────────

export type AITestMode = "voice" | "text";
export type AITestStatus =
  | "unavailable"
  | "locked"
  | "not_started"
  | "failed"
  | "passed";

/** One graded answer; also the tool result Sophia reads back. */
export interface AITestAnswer {
  id: number;
  question: string;
  answer: string;
  score: number;
  passed: boolean;
  strengths: string[];
  mistakes: string[];
  tips: string[];
  feedback: string;
  created_at: string;
}

export interface AITestAttempt {
  id: number;
  attempt_number: number;
  mode: AITestMode;
  status: "in_progress" | "finished";
  pass_threshold: number;
  score: number | null;
  passed: boolean;
  passed_at: string | null;
  feedback: string;
  started_at: string;
  finished_at: string | null;
  answers: AITestAnswer[];
}

export interface AITestState {
  available: boolean;
  status: AITestStatus;
  pass_threshold?: number;
  min_questions?: number;
  attempts_today?: number;
  daily_limit?: number;
  /** Sophia teaching sessions (not graded) in the last 24 hours, and the cap. */
  practice_today?: number;
  practice_limit?: number;
  passed_at?: string | null;
  best_score?: number | null;
  last_attempt?: AITestAttempt | null;
}

export interface AITestStartResult {
  attempt_id: number;
  mode: AITestMode;
  pass_threshold: number;
  min_questions: number;
  /** Voice only: short-lived OpenAI Realtime key. */
  client_secret?: string;
  /** Typed only: the questions to answer. */
  questions?: string[];
}

export interface AITestFinishResult extends AITestAttempt {
  skill_auto_completed: boolean;
}

export interface ConversationTurn {
  role: "agent" | "learner";
  text: string;
}

/** An attempt in a list (no answers). */
export interface AITestAttemptSummary {
  id: number;
  user: number;
  user_name: string;
  module: number;
  module_title: string;
  attempt_number: number;
  mode: AITestMode;
  status: "in_progress" | "finished";
  pass_threshold: number;
  score: number | null;
  passed: boolean;
  passed_at: string | null;
  answer_count: number;
  started_at: string;
  finished_at: string | null;
}

/** One attempt in full, for a leader or admin, with the call transcript. */
export interface AITestAttemptReview extends AITestAttempt {
  user: number;
  user_name: string;
  module: number;
  module_title: string;
  skill_label: string;
  conversation: ConversationTurn[];
}

export interface MemberAITestModule {
  module_id: number;
  title: string;
  skill: string;
  required: boolean;
  status: ModuleStatus;
  best_score: number | null;
  passed_at: string | null;
  attempts: AITestAttemptSummary[];
}

export interface MemberAITests {
  user: number;
  name: string;
  modules: MemberAITestModule[];
}

/** A teaching session with Sophia: same voice call as the test, nothing graded. */
export interface AIPracticeStartResult {
  session_id: number;
  client_secret: string;
  expires_at: number;
  model: string;
  voice: string;
}

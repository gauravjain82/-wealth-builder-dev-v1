export type ModuleStatus = "pending" | "watch" | "quiz" | "done";
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
  quiz_score: number | null;
  quiz_total: number | null;
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
export interface QuizQuestion {
  id: number;
  question_text: string;
  options: string[];
  correct_index: number;
  order: number;
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

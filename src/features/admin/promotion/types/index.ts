/**
 * Wire types for /api/promotion/admin/ — the content behind the Promotion dashboard.
 *
 * The tree is Track → Skill → Video (a `PromotionModule` on the backend) → Quiz question.
 * Each level carries an `order` that the dashboard sorts by. Routes are also on the track
 * payload but are not edited here; see docs/admin/PHASES.md.
 */

export type SkillTag = 'skill' | 'action';

export interface AdminQuizQuestion {
  id: number;
  module: number;
  question_text: string;
  options: string[];
  correct_index: number;
  order: number;
}

export interface AdminVideo {
  id: number;
  skill: number;
  title: string;
  subtitle: string;
  /** Empty means the dashboard shows the video as "Pending Video". */
  video_url: string;
  duration_label: string;
  order: number;
  has_quiz: boolean;
  /** Agents who have watched it. Deleting the video erases their progress. */
  watched_count: number;
  quiz_questions: AdminQuizQuestion[];
}

export interface AdminSkill {
  id: number;
  track: number;
  label: string;
  tag: SkillTag;
  order: number;
  modules: AdminVideo[];
}

export interface AdminTrack {
  id: number;
  level: number;
  level_code: string;
  level_name: string;
  name: string;
  order: number;
  skills: AdminSkill[];
}

export interface SkillPayload {
  track: number;
  label: string;
  tag: SkillTag;
}

export interface VideoPayload {
  skill: number;
  title: string;
  subtitle: string;
  video_url: string;
  duration_label: string;
}

export interface QuizQuestionPayload {
  module: number;
  question_text: string;
  options: string[];
  correct_index: number;
}

export type ReorderKind = 'skills' | 'modules' | 'questions';

export const SKILL_TAG_LABELS: Record<SkillTag, string> = {
  skill: 'Skill',
  action: 'Action',
};

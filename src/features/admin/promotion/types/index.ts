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
  /** null = no AI lesson; otherwise whether the AI test is switched on. */
  ai_lesson_enabled: boolean | null;
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

/** A module's AI lesson — what Sophia teaches and tests from (LessonNotes on the backend). */
export interface AILessonContent {
  summary: string;
  learning_objectives: string[];
  key_concepts: string[];
  sections: { heading: string; content: string }[];
  scripts_and_phrases: string[];
  common_mistakes: string[];
  quiz: { question: string; ideal_answer: string; must_mention: string[] }[];
}

export interface AdminAILesson {
  id: number;
  module: number;
  enabled: boolean;
  pass_threshold: number;
  lesson: AILessonContent;
  transcript: string;
  source_topic_id: string;
  /** When the AI test became required; learners who finished before then stay complete. */
  required_since: string | null;
  updated_at: string;
}

export type AILessonPayload = Pick<
  AdminAILesson,
  'module' | 'enabled' | 'pass_threshold' | 'lesson' | 'transcript'
>;

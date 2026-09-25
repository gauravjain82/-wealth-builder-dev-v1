/**
 * Types for the Guidance Management System surfaces.
 *
 * The one worth reading carefully is `AdapterSignal`. It is the privacy boundary from
 * decision G3, expressed in the type system: five fields, and an index signature would
 * defeat the whole thing, so there isn't one. The emit function takes a target key and
 * a signal as positional arguments and has no third parameter, which is what makes a
 * payload *unrepresentable* rather than merely forbidden.
 */

/** Everything an adapter is allowed to say about a control. */
export type GmsSignal =
  | 'opened'
  | 'closed'
  | 'selected'
  | 'valid'
  | 'invalid'
  | 'saved'
  | 'failed';

/**
 * The complete adapter envelope. Five fields.
 *
 * Deliberately a closed type with no index signature and no metadata field. Adding one
 * here widens the privacy boundary, and the backend rejects unknown keys anyway, so a
 * change would fail loudly at runtime as well as in review.
 */
export interface AdapterSignal {
  event_uuid: string;
  tool_key: string;
  target_key: string;
  signal: GmsSignal;
  occurred_at?: string;
}

/** Capability flags from `/api/gms/my-access/`. */
export interface GmsAccess {
  gms_enabled: boolean;
  can_view: boolean;
  can_author: boolean;
  can_review: boolean;
  can_approve: boolean;
  can_publish: boolean;
  can_view_analytics: boolean;
  can_administer: boolean;
}

/** One block of structured content. Never HTML. */
export type ContentBlock =
  | { type: 'heading'; text: string; level: 2 | 3 }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'note'; tone: 'info' | 'warning' | 'caution'; text: string }
  | { type: 'link'; text: string; href: string }
  | {
      type: 'metric_note';
      source: 'contest_metric' | 'metric_definition';
      key: string;
      /**
       * Resolved by the server at read time from the host service that owns the words
       * (decision G6). The client never has a stored copy to fall back on, which is
       * exactly the property that stops the Help drifting from the screen.
       */
      resolved: {
        key: string;
        label: string;
        note: string;
        maximum?: number;
        single_hop_team?: boolean;
        calculation?: string;
      } | null;
      unavailable: boolean;
    };

/** A Help panel entry. */
export interface TopicSummary {
  topic_key: string;
  tool_key: string;
  topic_type: string;
  title: string;
  summary: string;
  /** Present on walkthrough entries only. */
  available?: boolean;
  reason?: string;
  xp_available?: number;
  already_awarded?: boolean;
}

/** What `/api/gms/context/` returns: three ordered lists, and no recommendation. */
export interface HelpContext {
  tool_key: string;
  walkthroughs: TopicSummary[];
  reference: TopicSummary[];
  troubleshooting: TopicSummary[];
}

/** One topic's published content. */
export interface TopicContent extends TopicSummary {
  revision_number: number;
  content: ContentBlock[];
  published_at: string | null;
}

/** One prerequisite as the pre-start panel shows it. */
export interface Prerequisite {
  prerequisite_key: string;
  title: string;
  instruction: string;
  requirement_level: 'hard' | 'recommended';
  outcome: 'pass' | 'fail' | 'unavailable';
  detail: string;
  resolution_target_key: string;
  blocks_start: boolean;
}

/** A resumable attempt. Identifiers and state only — never a form value. */
export interface WalkthroughProgress {
  current_step_key: string;
  started_at: string;
  expires_at: string;
  is_preview: boolean;
}

/**
 * One step as the server reports it.
 *
 * `already_complete` is a **server** answer, evaluated against live host state. The
 * overlay renders it and never decides for itself, which is what keeps "Already
 * complete" honest.
 */
export interface WalkthroughStepState {
  step_key: string;
  target_key: string;
  instruction: string;
  completion_signal_key: string;
  route_or_modal_key: string;
  optional_step: boolean;
  allow_back: boolean;
  allow_end: boolean;
  already_complete: boolean;
  already_complete_detail: string;
  /** `['next', 'end']` on a satisfied step — a choice, never an auto-advance. */
  offers: Array<'next' | 'end'>;
}

/** The pre-start panel's payload. */
export interface WalkthroughDetail {
  topic_key: string;
  tool_key: string;
  title: string;
  summary: string;
  version_number: number;
  status: 'draft' | 'published' | 'disabled';
  available: boolean;
  unavailable_reason: string;
  step_count: number;
  live_data_notice: string;
  prerequisites: Prerequisite[];
  steps: WalkthroughStepState[];
  can_start: boolean;
  progress: WalkthroughProgress | null;
  xp_available: number;
  already_awarded: boolean;
}

/** What completing returns. */
export interface CompletionResult {
  completed: boolean;
  xp_earned: number;
  preview: boolean;
  already: boolean;
}

/** Stable error codes the backend sends as `{code, detail}`. */
export type GmsErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'invalid_input'
  | 'edit_conflict'
  | 'prerequisite_failed'
  | 'walkthrough_incompatible'
  | 'walkthrough_disabled'
  | 'signal_not_allowed'
  | 'progress_expired'
  | 'already_completed'
  | 'bootstrap_disable_forbidden';

/** A revision as its author or reviewer sees it. */
export interface RevisionEditorPayload {
  id: number;
  revision_number: number;
  title: string;
  summary: string;
  content: ContentBlock[];
  change_note: string;
  status: 'draft' | 'in_review' | 'approved' | 'published' | 'superseded' | 'rolled_back';
  source_type: 'authored' | 'imported';
  is_editable: boolean;
  /** Optimistic-concurrency token. A missing one is a conflict, never consent. */
  revision: number;
  created_at: string;
  approved_at: string | null;
  published_at: string | null;
}

/** One row of the content library / review queue. */
export interface LibraryRow extends TopicSummary {
  topic_revision: number;
  is_published: boolean;
  published_revision_number: number | null;
  latest: RevisionEditorPayload | null;
}

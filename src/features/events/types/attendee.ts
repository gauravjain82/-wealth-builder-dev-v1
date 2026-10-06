// The attendee's own schedule, attendance and reviews.
// Mirrors `events/services/attendee.py` and `events/views/reviews.py`.

import type { SessionKind } from './session';

export interface MyReview {
  rating: number;
  comment: string;
  updated_at: string;
}

export interface MyScheduleSession {
  id: number;
  title: string;
  description: string;
  room: string;
  kind: SessionKind;
  starts_at: string;
  ends_at: string | null;
  tracks_attendance: boolean;
  restriction_label: string;
  attended: boolean;
  checked_in_at: string | null;
  /** Only sessions you checked in to can be reviewed. */
  can_review: boolean;
  my_review: MyReview | null;
}

export interface MySchedule {
  event_id: number;
  event_name: string;
  timezone: string;
  /** The ticket you hold for this event; `null` when you hold none. */
  ticket: {
    id: number;
    ticket_number: string;
    qr_token: string;
    holder_name: string;
  } | null;
  event_checked_in: boolean;
  event_checked_in_at: string | null;
  event_review: MyReview | null;
  sessions: MyScheduleSession[];
}

export interface ReviewInput {
  rating: number;
  comment: string;
}

export interface RatingStats {
  average: number | null;
  count: number;
  /** Count per star, keys "1"–"5". */
  distribution: Record<string, number>;
}

export interface SessionRatingStats extends RatingStats {
  session_id: number;
  title: string;
  starts_at: string;
  attended: number;
}

export interface ReviewSummary {
  event: RatingStats;
  sessions: SessionRatingStats[];
}

export interface ReviewRow {
  id: number;
  /** "Event", or the session title. */
  target: string;
  session_id: number | null;
  rating: number;
  comment: string;
  reviewer_name: string;
  reviewer_email: string;
  agent_code: string;
  updated_at: string;
}

export interface ReviewFilters {
  /** `event` for event reviews only; omit for everything. */
  target?: 'event';
  session?: number;
  rating?: number;
  with_comment?: boolean;
  page?: number;
}

// Convention Tracking — who is registered for each convention-tracked Big Event
// and what that did to their Mission / Associate trackers.
// GET /api/events/convention-registrations/ (+ summary/).

export type ConventionLogAction =
  | 'REGISTERED'
  | 'RELEASED'
  | 'TICKET_CHANGED'
  | 'TRACKER_MARKED'
  | 'TRACKER_UNMARKED'
  | 'TRACKER_KEPT'
  | 'TRACKER_PENDING';

/** One entry of a registration's time log. */
export interface ConventionLogEntry {
  id: number;
  action: ConventionLogAction;
  action_label: string;
  occurred_at: string;
  /** What caused it: purchase, ticket_saved, refund, import, backfill, agency_code_assigned. */
  source: string;
  ticket_number: string;
  /** Tracker fields changed as `{ "tracker.field": [before, after] }`, or a `reason`. */
  detail: Record<string, [unknown, unknown] | string>;
}

export type ConventionStatus = 'registered' | 'released';
/** `pending` = a prospect waiting for an agency code. */
export type ConventionTrackerStatus = 'marked' | 'pending' | 'not_marked';

export interface ConventionRegistration {
  id: number;
  event: number;
  event_name: string;
  user: number;
  user_name: string;
  /** Empty for a prospect. */
  agency_code: string;
  email: string;
  ticket_number: string;
  registered_at: string;
  released_at: string | null;
  tracker_marked_at: string | null;
  status: ConventionStatus;
  tracker_status: ConventionTrackerStatus;
  logs: ConventionLogEntry[];
}

/** A tracked event with its registration counts (the event picker). */
export interface ConventionEventSummary {
  id: number;
  name: string;
  convention_tracking: boolean;
  registered: number;
  released: number;
  pending: number;
}

export interface ConventionRegistrationPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: ConventionRegistration[];
}

export type ConventionStatusFilter = '' | ConventionStatus | 'pending';

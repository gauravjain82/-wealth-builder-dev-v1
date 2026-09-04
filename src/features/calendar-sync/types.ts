/**
 * Type definitions for the Two-Way, Multi-Calendar Google Sync feature.
 *
 * These mirror the backend contract documented in
 * `mlm_platform/CALENDAR_SYNC_PROGRESS.md` (§ "API contract") served under
 * `/api/calendarsync/*`.
 */

/** The four platform sources that can each map to a Google calendar. */
export type CalendarSource = 'PERSONAL' | 'MATCHUP' | 'BPM' | 'EVENTS';

/** How a source's target calendar was provisioned. */
export type CalendarProvisioning = 'EXISTING' | 'APP_CREATED';

/** A single Google calendar entry returned by `GET /calendars/`. */
export interface GoogleCalendarDTO {
  /** Google calendar id (e.g. "primary" or an email-like id). */
  id: string;
  /** Human-readable calendar name. */
  summary: string;
  /** Optional calendar description. */
  description?: string | null;
  /** True for the account's primary calendar. */
  primary?: boolean;
  /** The caller's access role on this calendar (e.g. "owner", "writer"). */
  access_role?: string | null;
}

/** Per-source mapping + toggle state returned by `GET /settings/`. */
export interface SourceMappingDTO {
  source: CalendarSource;
  /** Display label for the source (e.g. "Match Up training"). */
  label: string;
  /** Currently targeted Google calendar id, or null when unset. */
  google_calendar_id: string | null;
  /** Display name of the targeted calendar. */
  calendar_summary: string | null;
  provisioning: CalendarProvisioning | null;
  sync_enabled: boolean;
  push_enabled: boolean;
  pull_enabled: boolean;
  /** Whether this source may fall back to the primary calendar. */
  allow_primary_fallback: boolean;
  /** Whether this source auto-creates its own branded calendar (BPM/Events). */
  creates_own_calendar: boolean;
  last_pushed_at: string | null;
  last_pulled_at: string | null;
}

/** Connection + capability status returned by `GET /status/`. */
export interface CalendarSyncStatus {
  connected: boolean;
  google_email?: string | null;
  /** True when the stored credential predates the full `calendar` scope. */
  needs_reconsent: boolean;
  /** True when the granted scope can list/create calendars. */
  can_manage_calendars: boolean;
  /** OAuth scopes granted by the user. */
  scopes: string[];
  sources: SourceMappingDTO[];
}

/** Partial per-source toggle update for `PUT /settings/`. */
export interface SourceToggleUpdate {
  source: CalendarSource;
  sync_enabled?: boolean;
  push_enabled?: boolean;
  pull_enabled?: boolean;
}

/** Body for `POST /settings/<source>/` to set a source's target calendar. */
export type SetSourceTargetBody =
  | { mode: 'existing'; calendar_id: string; calendar_summary?: string }
  | { mode: 'create' };

/** Pull-engine summary embedded in on-demand sync responses. */
export interface PullSummary {
  status: string;
  changes?: number;
  reflected?: number;
  deleted?: number;
  repushed?: number;
  skipped?: number;
  external?: number;
  busy_imported?: number;
  busy_removed?: number;
}

/** Result of `POST /sync/<source>/`. */
export interface SyncResult {
  source: CalendarSource;
  pushed: number;
  pull: PullSummary;
}

/** Result of `POST /sync/` (all sources). */
export interface SyncAllResult {
  results: SyncResult[];
}

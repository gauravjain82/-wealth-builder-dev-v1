/** Where the announced event is in its run. */
export type AnnouncementPhase = 'upcoming' | 'live';

/** The event the site-wide announcement bar is about. */
export interface AnnouncementEvent {
  id: number;
  name: string;
  shortcut: string;
  begin_at: string;
  end_at: string | null;
  timezone: string;
  phase: AnnouncementPhase;
  /** 1-based day of the run; 0 before it starts. */
  day: number;
  days: number;
}

/**
 * Payload of `GET /api/events/events/announcement-bar/`. `event` is null when no
 * published event is upcoming or running — the bar is then hidden.
 */
export interface AnnouncementBar {
  event: AnnouncementEvent | null;
  /** Ticker phrases, already formatted in the event's timezone. */
  messages: string[];
  /** Present only when the viewer owns or holds a ticket for the event. */
  ticket: { count: number } | null;
}

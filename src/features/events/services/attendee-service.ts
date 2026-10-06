import type { PaginatedResponse } from '../types/event';
import type {
  MyReview,
  MySchedule,
  ReviewFilters,
  ReviewInput,
  ReviewRow,
  ReviewSummary,
} from '../types/attendee';
import { query, request } from './session-service';

const EVENTS_BASE = '/api/events/events';

export const attendeeService = {
  /** Your schedule, attendance and reviews for one event. */
  mySchedule(eventId: number): Promise<MySchedule> {
    return request(`${EVENTS_BASE}/${eventId}/my-schedule/`);
  },

  /** Create or update your review of the event (requires event check-in). */
  reviewEvent(eventId: number, input: ReviewInput): Promise<MyReview> {
    return request(`${EVENTS_BASE}/${eventId}/my-review/`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  /** Create or update your review of a session (requires attending it). */
  reviewSession(eventId: number, sessionId: number, input: ReviewInput): Promise<MyReview> {
    return request(`${EVENTS_BASE}/${eventId}/sessions/${sessionId}/my-review/`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  // --- organiser ----------------------------------------------------------
  reviewSummary(eventId: number): Promise<ReviewSummary> {
    return request(`${EVENTS_BASE}/${eventId}/reviews/summary/`);
  },

  reviews(eventId: number, filters: ReviewFilters = {}): Promise<PaginatedResponse<ReviewRow>> {
    return request(`${EVENTS_BASE}/${eventId}/reviews/${query(filters)}`);
  },
};

import { useCallback, useEffect, useState } from 'react';
import { attendeeService } from '../services/attendee-service';
import type { MySchedule, ReviewInput } from '../types/attendee';

/** The signed-in attendee's schedule for one event, plus review mutations. */
export function useMySchedule(eventId: number) {
  const [schedule, setSchedule] = useState<MySchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!Number.isFinite(eventId)) return;
    setLoading(true);
    setError(null);
    try {
      setSchedule(await attendeeService.mySchedule(eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your schedule.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const reviewEvent = useCallback(
    async (input: ReviewInput) => {
      const review = await attendeeService.reviewEvent(eventId, input);
      setSchedule((current) => (current ? { ...current, event_review: review } : current));
    },
    [eventId],
  );

  const reviewSession = useCallback(
    async (sessionId: number, input: ReviewInput) => {
      const review = await attendeeService.reviewSession(eventId, sessionId, input);
      setSchedule((current) =>
        current
          ? {
              ...current,
              sessions: current.sessions.map((s) => (s.id === sessionId ? { ...s, my_review: review } : s)),
            }
          : current,
      );
    },
    [eventId],
  );

  return { schedule, loading, error, refetch, reviewEvent, reviewSession };
}

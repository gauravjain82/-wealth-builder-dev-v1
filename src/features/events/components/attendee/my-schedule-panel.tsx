import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Lock, MapPin, QrCode, Star } from 'lucide-react';
import { Button, Card, CardContent, Text } from '@shared/components';
import { StarRatingDisplay } from '../reviews/star-rating';
import { ReviewModal } from '../reviews/review-modal';
import { formatDayLabel, formatTime, formatTimeRange, safeZone, toWallClock } from '../../utils/zoned-time';
import type { MyReview, MySchedule, MyScheduleSession, ReviewInput } from '../../types/attendee';

interface MySchedulePanelProps {
  schedule: MySchedule;
  onReviewEvent: (input: ReviewInput) => Promise<void>;
  onReviewSession: (sessionId: number, input: ReviewInput) => Promise<void>;
}

type Status = { label: string; className: string } | null;

function statusOf(session: MyScheduleSession, now: number): Status {
  if (!session.tracks_attendance) return null;
  if (session.attended) {
    return {
      label: 'Attended',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
    };
  }
  const start = new Date(session.starts_at).getTime();
  const end = session.ends_at ? new Date(session.ends_at).getTime() : start;
  if (now < start) {
    return { label: 'Upcoming', className: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/70' };
  }
  if (now <= end) {
    return { label: 'Happening now', className: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200' };
  }
  return { label: 'Not checked in', className: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-white/50' };
}

type ReviewTarget = { kind: 'event' } | { kind: 'session'; session: MyScheduleSession };

/**
 * The attendee's own event: their ticket, event check-in, every session they
 * can attend with whether they did, and reviews of what they attended. Times
 * are shown in the event's timezone (where the attendee will be).
 */
export function MySchedulePanel({ schedule, onReviewEvent, onReviewSession }: MySchedulePanelProps) {
  const timeZone = safeZone(schedule.timezone);
  const [reviewing, setReviewing] = useState<ReviewTarget | null>(null);
  const now = Date.now();

  const days = useMemo(() => {
    const grouped = new Map<string, MyScheduleSession[]>();
    for (const session of schedule.sessions) {
      const day = toWallClock(session.starts_at, timeZone).date;
      grouped.set(day, [...(grouped.get(day) ?? []), session]);
    }
    return Array.from(grouped.entries());
  }, [schedule.sessions, timeZone]);

  const tracked = schedule.sessions.filter((s) => s.tracks_attendance);
  const attended = tracked.filter((s) => s.attended).length;
  const pct = tracked.length ? Math.round((attended / tracked.length) * 100) : 0;
  const ticket = schedule.ticket;
  if (!ticket) return null;

  const existingReview: MyReview | null =
    reviewing?.kind === 'event'
      ? schedule.event_review
      : reviewing?.kind === 'session'
        ? reviewing.session.my_review
        : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <Text variant="muted" className="text-xs uppercase tracking-wide">
                Your ticket
              </Text>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                {ticket.holder_name || 'You'}
              </p>
              <p className="text-sm text-slate-500 dark:text-white/60">{ticket.ticket_number}</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm">
                {schedule.event_checked_in ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-600" aria-hidden />
                    <span className="text-slate-700 dark:text-white/80">
                      Checked in{schedule.event_checked_in_at ? ` at ${formatTime(schedule.event_checked_in_at, timeZone)}` : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <Clock size={16} className="text-slate-400" aria-hidden />
                    <span className="text-slate-500 dark:text-white/60">Not checked in yet</span>
                  </>
                )}
              </p>
            </div>
            <a href={`/event/ticket/${ticket.qr_token}`} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline">
                <QrCode size={16} className="mr-1.5" aria-hidden />
                Show my ticket QR
              </Button>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col justify-between gap-3 p-4">
            <div>
              <Text variant="muted" className="text-xs uppercase tracking-wide">
                The event
              </Text>
              {schedule.event_review ? (
                <div className="mt-2 space-y-1">
                  <StarRatingDisplay value={schedule.event_review.rating} size={18} />
                  {schedule.event_review.comment ? (
                    <p className="line-clamp-2 text-sm text-slate-600 dark:text-white/70">
                      “{schedule.event_review.comment}”
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600 dark:text-white/70">
                  {schedule.event_checked_in
                    ? 'How was it? Your feedback goes straight to the organisers.'
                    : 'You can rate the event once you’ve checked in.'}
                </p>
              )}
            </div>
            {schedule.event_checked_in ? (
              <Button
                type="button"
                variant={schedule.event_review ? 'ghost' : 'default'}
                size="sm"
                onClick={() => setReviewing({ kind: 'event' })}
              >
                <Star size={14} className="mr-1.5" aria-hidden />
                {schedule.event_review ? 'Edit review' : 'Rate the event'}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {tracked.length ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-900 dark:text-white">Sessions attended</span>
            <span className="tabular-nums text-slate-600 dark:text-white/70">
              {attended} of {tracked.length}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={tracked.length}
            aria-valuenow={attended}
            aria-label="Sessions attended"
          >
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : null}

      {days.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
          The schedule hasn’t been published yet. Check back closer to the event.
        </p>
      ) : (
        days.map(([day, sessions]) => (
          <section key={day} aria-labelledby={`day-${day}`} className="space-y-2">
            <h3 id={`day-${day}`} className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
              {formatDayLabel(day)}
            </h3>
            <ol className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
              {sessions.map((session) => {
                const status = statusOf(session, now);
                const muted = !session.tracks_attendance;
                return (
                  <li key={session.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                    <div className={`w-40 shrink-0 text-sm font-semibold tabular-nums ${muted ? 'text-slate-400 dark:text-white/40' : 'text-slate-700 dark:text-white/80'}`}>
                      {formatTimeRange(session.starts_at, session.ends_at, timeZone)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={muted ? 'text-slate-500 dark:text-white/60' : 'font-semibold text-slate-900 dark:text-white'}>
                          {session.title}
                        </span>
                        {session.restriction_label ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                            <Lock size={11} aria-hidden />
                            {session.restriction_label}
                          </span>
                        ) : null}
                        {status ? (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
                            {status.label}
                            {session.attended && session.checked_in_at ? ` · ${formatTime(session.checked_in_at, timeZone)}` : ''}
                          </span>
                        ) : null}
                      </div>
                      {session.room ? (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-white/50">
                          <MapPin size={12} aria-hidden />
                          {session.room}
                        </p>
                      ) : null}
                    </div>
                    {session.can_review ? (
                      <div className="flex shrink-0 items-center gap-2">
                        {session.my_review ? (
                          <>
                            <StarRatingDisplay value={session.my_review.rating} />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setReviewing({ kind: 'session', session })}
                              aria-label={`Edit your review of ${session.title}`}
                            >
                              Edit
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setReviewing({ kind: 'session', session })}
                            aria-label={`Rate ${session.title}`}
                          >
                            <Star size={14} className="mr-1.5" aria-hidden />
                            Rate
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}

      <ReviewModal
        open={reviewing !== null}
        targetName={
          reviewing?.kind === 'session' ? reviewing.session.title : schedule.event_name
        }
        existing={existingReview}
        onClose={() => setReviewing(null)}
        onSubmit={(input) =>
          reviewing?.kind === 'session'
            ? onReviewSession(reviewing.session.id, input)
            : onReviewEvent(input)
        }
      />
    </div>
  );
}

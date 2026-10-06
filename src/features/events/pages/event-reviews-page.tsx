import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  ErrorState,
  Heading,
  LoadingState,
  Select,
  Text,
} from '@shared/components';
import { attendeeService } from '../services/attendee-service';
import { eventService } from '../services/event-service';
import { EventSubnav } from '../components/event-subnav';
import { StarRatingDisplay } from '../components/reviews/star-rating';
import type { BigEvent, PaginatedResponse } from '../types/event';
import type { RatingStats, ReviewFilters, ReviewRow, ReviewSummary } from '../types/attendee';

const PAGE_SIZE = 25;

function Distribution({ stats }: { stats: RatingStats }) {
  const max = Math.max(1, ...Object.values(stats.distribution));
  return (
    <ul className="space-y-1" aria-label="Rating distribution">
      {[5, 4, 3, 2, 1].map((star) => {
        const n = stats.distribution[String(star)] ?? 0;
        return (
          <li key={star} className="flex items-center gap-2 text-xs">
            <span className="w-8 tabular-nums text-slate-600 dark:text-white/70">{star}★</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <span className="w-8 text-right tabular-nums text-slate-500 dark:text-white/50">{n}</span>
          </li>
        );
      })}
    </ul>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * What attendees thought: the event's rating and each session's, with the
 * comments behind them. Only people who attended can review, so every review
 * here is from someone who was in the room.
 */
export default function EventReviewsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const [event, setEvent] = useState<BigEvent | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReviewFilters>({ page: 1 });
  const [rows, setRows] = useState<PaginatedResponse<ReviewRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    void eventService.get(id).then(setEvent).catch(() => setEvent(null));
    attendeeService
      .reviewSummary(id)
      .then(setSummary)
      .catch((err) => setSummaryError(err instanceof Error ? err.message : 'Could not load ratings.'));
  }, [id]);

  const loadRows = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await attendeeService.reviews(id, filters));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load reviews.');
    } finally {
      setLoading(false);
    }
  }, [id, filters]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const update = (next: Partial<ReviewFilters>) =>
    setFilters((current) => ({ ...current, ...next, page: next.page ?? 1 }));

  const targetValue = filters.target === 'event' ? 'event' : filters.session ? String(filters.session) : '';
  const count = rows?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const page = filters.page ?? 1;

  if (!Number.isFinite(id)) return <Text variant="muted">Invalid event.</Text>;

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h1">
          {event?.name || 'Reviews'}
        </Heading>
        <Text variant="muted">Ratings and feedback from attendees — only people who attended can review</Text>
      </div>
      <EventSubnav eventId={id} />

      {summaryError ? (
        <ErrorState description={summaryError} />
      ) : !summary ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardContent className="space-y-3 p-4">
              <Text variant="muted" className="text-xs uppercase tracking-wide">
                The event
              </Text>
              {summary.event.count ? (
                <>
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold tabular-nums text-slate-900 dark:text-white">
                      {summary.event.average?.toFixed(1)}
                    </span>
                    <div className="pb-1">
                      <StarRatingDisplay value={summary.event.average ?? 0} size={16} />
                      <p className="text-xs text-slate-500 dark:text-white/50">
                        {summary.event.count} review{summary.event.count === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <Distribution stats={summary.event} />
                </>
              ) : (
                <p className="text-sm text-slate-500 dark:text-white/60">No event reviews yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <caption className="sr-only">Session ratings</caption>
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-white/50">
                  <tr>
                    <th scope="col" className="px-4 py-3">Session</th>
                    <th scope="col" className="px-4 py-3">Rating</th>
                    <th scope="col" className="px-4 py-3 text-right">Reviews</th>
                    <th scope="col" className="px-4 py-3 text-right">Response</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.sessions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500 dark:text-white/60">
                        No sessions take attendance yet.
                      </td>
                    </tr>
                  ) : (
                    summary.sessions.map((s) => {
                      const selected = filters.session === s.session_id;
                      const response = s.attended ? Math.round((s.count / s.attended) * 100) : 0;
                      return (
                        <tr
                          key={s.session_id}
                          className={`border-t border-slate-100 dark:border-white/10 ${selected ? 'bg-primary/5' : ''}`}
                        >
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              className="text-left font-medium text-slate-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-white"
                              onClick={() => update({ session: s.session_id, target: undefined })}
                              aria-label={`Show reviews of ${s.title}`}
                            >
                              {s.title}
                            </button>
                          </td>
                          <td className="px-4 py-2">
                            {s.average !== null ? (
                              <span className="inline-flex items-center gap-1.5">
                                <StarRatingDisplay value={s.average} />
                                <span className="tabular-nums text-slate-600 dark:text-white/70">{s.average.toFixed(1)}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-white/40">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">{s.count}</td>
                          <td
                            className="px-4 py-2 text-right tabular-nums text-slate-600 dark:text-white/70"
                            title={`${s.count} of ${s.attended} attendees reviewed`}
                          >
                            {s.attended ? `${response}%` : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      <section className="space-y-3" aria-labelledby="reviews-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="reviews-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
            Reviews <span className="text-sm font-normal text-slate-500">({count})</span>
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              aria-label="Filter by what was reviewed"
              value={targetValue}
              onChange={(e) => {
                const v = e.target.value;
                update(
                  v === 'event'
                    ? { target: 'event', session: undefined }
                    : { target: undefined, session: v ? Number(v) : undefined },
                );
              }}
              className="max-w-[220px]"
            >
              <option value="">Everything</option>
              <option value="event">The event</option>
              {summary?.sessions.map((s) => (
                <option key={s.session_id} value={String(s.session_id)}>
                  {s.title}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filter by rating"
              value={filters.rating ? String(filters.rating) : ''}
              onChange={(e) => update({ rating: e.target.value ? Number(e.target.value) : undefined })}
              className="max-w-[140px]"
            >
              <option value="">Any rating</option>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={String(r)}>
                  {r} star{r === 1 ? '' : 's'}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-white/80">
              <Checkbox
                checked={Boolean(filters.with_comment)}
                onChange={(e) => update({ with_comment: e.target.checked || undefined })}
              />
              With comments
            </label>
          </div>
        </div>

        {loading && !rows ? (
          <LoadingState />
        ) : error ? (
          <ErrorState description={error} onRetry={() => void loadRows()} />
        ) : count === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
            No reviews match. Attendees can review from My tickets after they check in.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows?.results.map((r) => (
              <li
                key={`${r.target}-${r.id}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StarRatingDisplay value={r.rating} />
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-white/80">
                      {r.target}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-white/50">{formatDate(r.updated_at)}</span>
                </div>
                {r.comment ? (
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-700 dark:text-white/80">{r.comment}</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500 dark:text-white/50">
                  {r.reviewer_name}
                  {r.agent_code ? ` · ${r.agent_code}` : ''}
                  {r.reviewer_email ? ` · ${r.reviewer_email}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}

        {pageCount > 1 ? (
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
              Previous
            </Button>
            <span className="text-xs text-slate-500">
              Page {page} of {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => update({ page: page + 1 })}
            >
              Next
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

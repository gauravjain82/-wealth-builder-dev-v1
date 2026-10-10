import { Fragment, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ErrorState,
  Heading,
  Input,
  LoadingState,
  Select,
  Text,
} from '@shared/components';
import { configService } from '../services/config-service';
import type {
  ConventionEventSummary,
  ConventionLogEntry,
  ConventionRegistration,
  ConventionRegistrationPage,
  ConventionStatusFilter,
} from '../types/convention';

const PAGE_SIZE = 25;

const STATUS_OPTIONS: { value: ConventionStatusFilter; label: string }[] = [
  { value: '', label: 'Everyone' },
  { value: 'registered', label: 'Registered' },
  { value: 'released', label: 'Released' },
  { value: 'pending', label: 'Waiting for agency code' },
];

/** How each cause of a log entry reads to staff. */
const SOURCE_LABELS: Record<string, string> = {
  purchase: 'Ticket purchase',
  ticket_saved: 'Ticket assigned or changed',
  refund: 'Order refunded',
  import: 'External ticket import',
  backfill: 'Loaded from existing tickets',
  agency_code_assigned: 'Agency code assigned',
};

/** Tracker fields as they are labelled on the tracker screens. */
const FIELD_LABELS: Record<string, string> = {
  'mission.big_event_1st': 'Mission Tracker · Big Event',
  'associate.big_event_1st': 'Associate Tracker · Self Improvement',
  'associate.big_event_2nd': 'Associate Tracker · Big Event',
};

const formatDateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

/** "Ticked" / "Un-ticked" lines for the tracker boxes a log entry changed. */
function describeDetail(entry: ConventionLogEntry): string[] {
  const lines: string[] = [];
  for (const [key, change] of Object.entries(entry.detail)) {
    if (typeof change === 'string') {
      lines.push(change);
    } else if (key in FIELD_LABELS) {
      lines.push(`${FIELD_LABELS[key]}: ${change[1] ? 'ticked' : 'un-ticked'}`);
    }
  }
  return lines;
}

function StatusBadges({ row }: { row: ConventionRegistration }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant={row.status === 'registered' ? 'success' : 'secondary'}>
        {row.status === 'registered' ? 'Registered' : 'Released'}
      </Badge>
      {row.tracker_status === 'pending' && <Badge variant="warning">Waiting for agency code</Badge>}
      {row.tracker_status === 'marked' && <Badge variant="outline">Trackers marked</Badge>}
    </div>
  );
}

function TimeLog({ logs }: { logs: ConventionLogEntry[] }) {
  return (
    <ol className="space-y-2 border-l border-slate-200 pl-4 dark:border-white/15">
      {logs.map((entry) => (
        <li key={entry.id} className="text-sm">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">{entry.action_label}</span>
            <span className="text-xs text-slate-500 dark:text-white/50">
              {formatDateTime(entry.occurred_at)}
              {entry.source ? ` · ${SOURCE_LABELS[entry.source] ?? entry.source}` : ''}
              {entry.ticket_number ? ` · Ticket ${entry.ticket_number}` : ''}
            </span>
          </div>
          {describeDetail(entry).map((line) => (
            <div key={line} className="text-xs text-slate-600 dark:text-white/70">
              {line}
            </div>
          ))}
        </li>
      ))}
    </ol>
  );
}

/**
 * Big Event → Convention Tracking: who is registered for each tracked event,
 * and the time log of what each registration did to the person's Mission and
 * Associate trackers. Read-only — registrations follow the tickets.
 */
export default function ConventionTrackingPage() {
  const [events, setEvents] = useState<ConventionEventSummary[]>([]);
  const [eventId, setEventId] = useState<number | null>(null);
  const [status, setStatus] = useState<ConventionStatusFilter>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ConventionRegistrationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    configService
      .conventionSummary()
      .then(setEvents)
      .catch((err) => setError(errorMessage(err, 'Failed to load events')));
  }, []);

  // Search as the user types, without a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    configService
      .listConventionRegistrations({ event: eventId, status, search, page })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Failed to load registrations'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, status, search, page]);

  const selected = events.find((event) => event.id === eventId) ?? null;
  const totals = (selected ? [selected] : events).reduce(
    (sum, event) => ({
      registered: sum.registered + event.registered,
      released: sum.released + event.released,
      pending: sum.pending + event.pending,
    }),
    { registered: 0, released: 0, pending: 0 },
  );
  const pageCount = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h1">
          Convention Tracking
        </Heading>
        <Text variant="muted">
          Agents with a ticket to a tracked event get Big Event ticked on their Mission Tracker and
          Associate Tracker automatically, and un-ticked if the ticket leaves them. Turn tracking on
          per event in its Team Ticketing tab.
        </Text>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Registered', value: totals.registered },
          { label: 'Waiting for agency code', value: totals.pending },
          { label: 'Released', value: totals.released },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <Text variant="muted" className="text-xs uppercase tracking-wide">
                {stat.label}
              </Text>
              <div className="text-2xl font-semibold">{stat.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="max-w-xs"
          value={eventId ?? ''}
          onChange={(e) => {
            setEventId(e.target.value ? Number(e.target.value) : null);
            setPage(1);
          }}
        >
          <option value="">All tracked events</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
              {event.convention_tracking ? '' : ' (tracking off)'}
            </option>
          ))}
        </Select>
        <Select
          className="max-w-[14rem]"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ConventionStatusFilter);
            setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Search name, email or agency code"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="min-w-[240px] max-w-sm flex-1"
        />
      </div>

      {error ? (
        <ErrorState description={error} />
      ) : loading && !data ? (
        <LoadingState />
      ) : !data || data.results.length === 0 ? (
        <Text variant="muted">
          {events.length === 0
            ? 'No event has convention tracking on yet.'
            : 'No registrations match these filters.'}
        </Text>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-1 pr-3">Person</th>
                  <th className="py-1 pr-3">Agency code</th>
                  <th className="py-1 pr-3">Event</th>
                  <th className="py-1 pr-3">Ticket</th>
                  <th className="py-1 pr-3">Registered</th>
                  <th className="py-1 pr-3">Released</th>
                  <th className="py-1 pr-3">Status</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {data.results.map((row) => (
                  <Fragment key={row.id}>
                    <tr className="border-t border-slate-100 align-top dark:border-white/10">
                      <td className="py-2 pr-3">
                        <div>{row.user_name}</div>
                        <div className="text-xs text-slate-500 dark:text-white/50">{row.email}</div>
                      </td>
                      <td className="py-2 pr-3">{row.agency_code || 'Prospect'}</td>
                      <td className="py-2 pr-3">{row.event_name}</td>
                      <td className="py-2 pr-3">{row.ticket_number || '—'}</td>
                      <td className="whitespace-nowrap py-2 pr-3">
                        {formatDateTime(row.registered_at)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3">
                        {formatDateTime(row.released_at)}
                      </td>
                      <td className="py-2 pr-3">
                        <StatusBadges row={row} />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          className="whitespace-nowrap text-xs text-blue-600 hover:underline"
                          aria-expanded={openId === row.id}
                          onClick={() => setOpenId(openId === row.id ? null : row.id)}
                        >
                          {openId === row.id ? 'Hide log' : `Time log (${row.logs.length})`}
                        </button>
                      </td>
                    </tr>
                    {openId === row.id && (
                      <tr>
                        <td colSpan={8} className="bg-slate-50 px-4 py-3 dark:bg-white/5">
                          <TimeLog logs={row.logs} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {data && data.count > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <Text variant="muted" className="text-sm">
            Page {page} of {pageCount} · {data.count.toLocaleString()} people
          </Text>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= pageCount || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

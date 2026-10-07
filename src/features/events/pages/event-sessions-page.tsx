import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Lock, MapPin, QrCode, RefreshCw } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  ConfirmationDialog,
  ErrorState,
  Heading,
  Input,
  LoadingState,
  Select,
  Text,
} from '@shared/components';
import { useToastStore } from '@/store';
import { eventService } from '../services/event-service';
import { sessionService } from '../services/session-service';
import { useSessionDoor } from '../hooks/use-session-door';
import { EventSubnav } from '../components/event-subnav';
import { SessionPicker } from '../components/sessions/session-picker';
import { SessionScanBox } from '../components/sessions/session-scan-box';
import { SessionAttendeeTable } from '../components/sessions/session-attendee-table';
import { SessionCodeDisplay } from '../components/sessions/session-code-display';
import { defaultSession, formatDayLabel, formatTimeRange, safeZone } from '../utils/zoned-time';
import type { BigEvent } from '../types/event';
import type { EventSession, SessionAttendanceRow, SessionAttendee } from '../types/session';

const ARRIVED_OPTIONS = [
  { value: '', label: 'Everyone' },
  { value: 'true', label: 'In the session' },
  { value: 'false', label: 'Not yet in' },
];

// Phase chips and the per-session counts refresh on this cadence.
const REFRESH_MS = 30000;

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Text variant="muted" className="text-xs uppercase tracking-wide">
          {label}
        </Text>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
        {hint ? (
          <Text variant="muted" className="mt-1 text-xs">
            {hint}
          </Text>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Session check-in: the door for one session at a time, separate from event
 * check-in. Pick the session (the one running now is pre-selected), scan
 * tickets in, or put the room's QR code on a screen so attendees check
 * themselves in.
 */
export default function EventSessionsPage({ eventId: eventIdProp }: { eventId?: number } = {}) {
  const { eventId } = useParams<{ eventId: string }>();
  const id = eventIdProp ?? Number(eventId);
  const embedded = eventIdProp !== undefined;
  const addToast = useToastStore((s) => s.addToast);

  const [event, setEvent] = useState<BigEvent | null>(null);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [attendance, setAttendance] = useState<Record<number, SessionAttendanceRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [day, setDay] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [busyTicketId, setBusyTicketId] = useState<number | null>(null);

  const timeZone = safeZone(event?.timezone);

  const loadAttendance = useCallback(async () => {
    try {
      const rows = await sessionService.attendance(id);
      setAttendance(Object.fromEntries(rows.map((r) => [r.session_id, r])));
    } catch {
      // Counts on the picker are supplementary.
    }
  }, [id]);

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    setLoading(true);
    setError(null);
    try {
      const [evt, list] = await Promise.all([eventService.get(id), sessionService.list(id)]);
      setEvent(evt);
      setSessions(list.filter((s) => s.tracks_attendance && s.is_active));
      await loadAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sessions.');
    } finally {
      setLoading(false);
    }
  }, [id, loadAttendance]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState === 'visible') void loadAttendance();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadAttendance]);

  const days = useMemo(() => Array.from(new Set(sessions.map((s) => s.local_date))).sort(), [sessions]);

  // Open on what is happening now — the door staff's most likely intent.
  useEffect(() => {
    if (!sessions.length || selectedId != null) return;
    const initial = defaultSession(sessions, Date.now());
    if (initial) {
      setDay(initial.local_date);
      setSelectedId(initial.id);
    }
  }, [sessions, selectedId]);

  const selected = sessions.find((s) => s.id === selectedId) ?? null;
  const door = useSessionDoor(id, selectedId);
  const { setFilters } = door;

  useEffect(() => {
    setSearch('');
  }, [selectedId]);

  useEffect(() => {
    const timer = setTimeout(() => setFilters({ search: search || undefined }), 300);
    return () => clearTimeout(timer);
  }, [search, setFilters]);

  const changeDay = (next: string) => {
    setDay(next);
    const first = defaultSession(
      sessions.filter((s) => s.local_date === next),
      now,
    );
    if (first) setSelectedId(first.id);
  };

  const rowAction = async (attendee: SessionAttendee, action: () => Promise<unknown>, message: string) => {
    setBusyTicketId(attendee.id);
    try {
      await action();
      addToast({ type: 'success', message });
      void loadAttendance();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Action failed' });
    } finally {
      setBusyTicketId(null);
    }
  };

  const regenerate = async () => {
    if (!selected) return;
    setRegenerating(true);
    try {
      await sessionService.regenerateQr(id, selected.id);
      addToast({ type: 'success', message: 'New code issued. The old one no longer works.' });
      setConfirmRegenerate(false);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Could not issue a new code.' });
    } finally {
      setRegenerating(false);
    }
  };

  const exportMatrix = async () => {
    try {
      await sessionService.exportAttendance(id, event?.shortcut || 'event');
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Export failed' });
    }
  };

  if (!Number.isFinite(id)) return <Text variant="muted">Invalid event.</Text>;

  const header = !embedded ? (
    <>
      <div>
        <Heading as="h1" variant="h1">
          {event?.name || 'Session check-in'}
        </Heading>
        <Text variant="muted">Track attendance for each session, separately from event check-in</Text>
      </div>
      <EventSubnav eventId={id} />
    </>
  ) : null;

  if (loading && !sessions.length) {
    return (
      <div className="space-y-6">
        {header}
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState description={error} onRetry={() => void load()} />
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-white/15">
          <p className="font-medium text-slate-900 dark:text-white">No sessions take attendance yet</p>
          <Text variant="muted" className="mx-auto mt-1 max-w-md text-sm">
            Add the event’s sessions in the builder’s Sessions tab and keep “Take attendance” on.
            They’ll show up here, each with its own check-in.
          </Text>
          <Link to={`/events/${id}/builder?tab=sessions`} className="mt-4 inline-block">
            <Button type="button" variant="outline">
              Open sessions
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const stats = door.stats;
  const rate = stats.expected ? Math.round((stats.arrived / stats.expected) * 100) : 0;

  return (
    <div className="space-y-6">
      {header}

      <SessionPicker
        sessions={sessions}
        attendance={attendance}
        day={day}
        days={days}
        timeZone={timeZone}
        selectedId={selectedId}
        now={now}
        onDayChange={changeDay}
        onSelect={setSelectedId}
      />

      {selected ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-200 pt-5 dark:border-white/10">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
                {selected.title}
                {selected.access === 'RESTRICTED' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                    <Lock size={12} aria-hidden />
                    {selected.restriction_label || 'Restricted'}
                    {selected.min_level_code ? ` · ${selected.min_level_code}+` : ''}
                  </span>
                ) : null}
              </h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-500 dark:text-white/60">
                <span>
                  {formatDayLabel(selected.local_date)} ·{' '}
                  {formatTimeRange(selected.starts_at, selected.ends_at, timeZone)}
                </span>
                {selected.room ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} aria-hidden />
                    {selected.room}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.self_checkin_enabled ? (
                <>
                  <Button type="button" onClick={() => setShowCode(true)}>
                    <QrCode size={16} className="mr-1.5" aria-hidden />
                    Show room QR
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirmRegenerate(true)}
                    title="Retire the current code (e.g. a photo of it is being shared) and issue a new one"
                  >
                    <RefreshCw size={16} className="mr-1.5" aria-hidden />
                    New code
                  </Button>
                </>
              ) : (
                <Text variant="muted" className="self-center text-xs">
                  Self check-in is off — staff scan only.
                </Text>
              )}
              <Button type="button" variant="outline" onClick={() => void exportMatrix()}>
                <Download size={16} className="mr-1.5" aria-hidden />
                Export all sessions
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Expected"
              value={stats.expected}
              hint={selected.access === 'RESTRICTED' ? 'Eligible ticket holders' : 'Every live ticket'}
            />
            <StatCard label="In the session" value={stats.arrived} hint={`${rate}% of expected`} />
            <StatCard label="Not yet in" value={stats.remaining} />
            <StatCard
              label="Self-scanned"
              value={stats.self_scanned}
              hint={stats.overrides ? `${stats.overrides} admitted by override` : 'No overrides'}
            />
          </div>

          <SessionScanBox
            eventId={id}
            sessionId={selected.id}
            sessionTitle={selected.title}
            onScan={door.checkIn}
            onLinked={() => void door.refetch()}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, ticket…"
              aria-label="Search attendees"
              className="max-w-xs"
            />
            <Select
              aria-label="Filter by arrival"
              value={door.filters.arrived === undefined ? '' : String(door.filters.arrived)}
              onChange={(e) =>
                door.setFilters({ arrived: e.target.value === '' ? undefined : e.target.value === 'true' })
              }
              className="max-w-[180px]"
            >
              {ARRIVED_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          {door.loading && !door.attendees.length ? (
            <LoadingState />
          ) : door.error ? (
            <ErrorState description={door.error} onRetry={() => void door.refetch()} />
          ) : (
            <SessionAttendeeTable
              attendees={door.attendees}
              count={door.count}
              page={door.filters.page ?? 1}
              busyTicketId={busyTicketId}
              restricted={selected.access === 'RESTRICTED'}
              onPageChange={(page) => door.setFilters({ page })}
              onCheckIn={(a) =>
                void rowAction(
                  a,
                  () => door.checkIn({ ticket_id: a.id }),
                  `${a.holder_name || a.ticket_number} checked in to ${selected.title}.`,
                )
              }
              onUndo={(a) =>
                void rowAction(
                  a,
                  () => door.undo(a.id),
                  `Removed ${a.holder_name || a.ticket_number} from ${selected.title}.`,
                )
              }
            />
          )}

          {showCode ? (
            <SessionCodeDisplay
              eventId={id}
              eventName={event?.name ?? ''}
              session={selected}
              timeZone={timeZone}
              onClose={() => setShowCode(false)}
            />
          ) : null}
          <ConfirmationDialog
            open={confirmRegenerate}
            title="Issue a new room code?"
            message={`The code currently shown for “${selected.title}” will stop working immediately. Any screen showing it needs to be reopened.`}
            confirmText="Issue new code"
            loading={regenerating}
            onConfirm={() => void regenerate()}
            onClose={() => setConfirmRegenerate(false)}
          />
        </>
      ) : null}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, EyeOff, Lock, MapPin, Pencil, Plus, QrCode, Trash2, Users } from 'lucide-react';
import {
  Badge,
  Button,
  ConfirmationDialog,
  ErrorState,
  LoadingState,
  Text,
} from '@shared/components';
import { useToastStore } from '@/store';
import { sessionService } from '../../../services/session-service';
import {
  eventDays,
  formatDayLabel,
  formatTimeRange,
  safeZone,
  zoneAbbreviation,
} from '../../../utils/zoned-time';
import { SessionFormModal } from '../../sessions/session-form-modal';
import { SessionAllowListModal } from '../../sessions/session-allow-list-modal';
import type { EventSession, EventSessionPayload, LevelOption } from '../../../types/session';
import type { TabProps } from './types';

const KIND_LABEL: Record<EventSession['kind'], string> = {
  SESSION: 'Session',
  BREAK: 'Break',
  INFO: 'Info',
};

/**
 * The event's sessions: every line of the schedule, grouped into day tabs in the
 * event's timezone. Sessions that take attendance get their own check-in (see
 * Check-in → Sessions); breaks and info lines are display-only.
 *
 * Separate from the landing page's Agenda section. That section can *choose*
 * to list sessions (Page Layout → Agenda → "Show sessions"), and then only the
 * ones marked "Show on public agenda" appear.
 */
export function SessionsTab({ event }: TabProps) {
  const addToast = useToastStore((s) => s.addToast);
  const timeZone = safeZone(event.timezone);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string>('');
  const [editing, setEditing] = useState<EventSession | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [allowListFor, setAllowListFor] = useState<EventSession | null>(null);
  const [deleting, setDeleting] = useState<EventSession | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSessions(await sessionService.list(event.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sessions.');
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    void load();
    sessionService
      .levels()
      .then(setLevels)
      .catch(() => setLevels([]));
  }, [load]);

  // Day tabs: the event's dates plus any day a session sits on outside them.
  const days = useMemo(() => {
    const all = new Set([
      ...eventDays(event.begin_at, event.end_at, timeZone),
      ...sessions.map((s) => s.local_date),
    ]);
    return Array.from(all).sort();
  }, [event.begin_at, event.end_at, timeZone, sessions]);

  useEffect(() => {
    if (!days.length) return;
    if (!days.includes(activeDay)) setActiveDay(days[0]);
  }, [days, activeDay]);

  const daySessions = sessions
    .filter((s) => s.local_date === activeDay)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.sort_order - b.sort_order);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (session: EventSession) => {
    setEditing(session);
    setFormOpen(true);
  };

  const save = async (payload: EventSessionPayload) => {
    if (editing) {
      await sessionService.update(event.id, editing.id, payload);
      addToast({ type: 'success', message: `“${payload.title}” updated.` });
    } else {
      const created = await sessionService.create(event.id, payload);
      addToast({ type: 'success', message: `“${created.title}” added.` });
      // Follow the new item to its day, so it is visible right away.
      setActiveDay(created.local_date);
      if (created.access === 'RESTRICTED') setAllowListFor(created);
    }
    await load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await sessionService.remove(event.id, deleting.id);
      addToast({ type: 'success', message: `“${deleting.title}” removed.` });
      setDeleting(null);
      await load();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Could not remove.' });
    } finally {
      setDeleteBusy(false);
    }
  };

  if (loading && !sessions.length) return <LoadingState />;
  if (error) return <ErrorState description={error} onRetry={() => void load()} />;

  if (!days.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        Set the event’s start and end dates on the Event tab first — sessions are organised by day.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Text variant="muted" className="text-sm">
            Sessions that take attendance get their own QR check-in, separate from event check-in.
            To list them on the public page, set Page Layout → Agenda to “Show sessions”.
          </Text>
          <p className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-white/70">
            <CalendarClock size={14} aria-hidden />
            Times shown in {timeZone} ({zoneAbbreviation(timeZone)})
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus size={16} className="mr-1" aria-hidden />
          Add item
        </Button>
      </div>

      <div role="tablist" aria-label="Session days" className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-white/10">
        {days.map((day) => {
          const count = sessions.filter((s) => s.local_date === day).length;
          const selected = day === activeDay;
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveDay(day)}
              className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                selected
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white'
              }`}
            >
              {formatDayLabel(day, 'short')}
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-xs text-slate-600 dark:bg-white/10 dark:text-white/70">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" aria-label={formatDayLabel(activeDay)}>
        {daySessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center dark:border-white/15">
            <p className="text-sm text-slate-500 dark:text-white/60">Nothing scheduled on {formatDayLabel(activeDay)}.</p>
            <Button type="button" variant="outline" className="mt-3" onClick={openCreate}>
              <Plus size={16} className="mr-1" aria-hidden />
              Add the first item
            </Button>
          </div>
        ) : (
          <ol className="space-y-2">
            {daySessions.map((session) => {
              const muted = session.kind !== 'SESSION' && !session.tracks_attendance;
              return (
                <li
                  key={session.id}
                  className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center ${
                    muted
                      ? 'border-slate-200 bg-slate-50/60 dark:border-white/10 dark:bg-white/[0.02]'
                      : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'
                  }`}
                >
                  <div className="w-44 shrink-0 text-sm font-semibold tabular-nums text-slate-700 dark:text-white/80">
                    {formatTimeRange(session.starts_at, session.ends_at, timeZone)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-semibold ${muted ? 'text-slate-600 dark:text-white/70' : 'text-slate-900 dark:text-white'}`}>
                        {session.title}
                      </span>
                      {session.kind !== 'SESSION' ? <Badge variant="outline">{KIND_LABEL[session.kind]}</Badge> : null}
                      {session.access === 'RESTRICTED' ? (
                        <Badge variant="warning">
                          <Lock size={12} className="mr-1" aria-hidden />
                          {session.restriction_label || 'Restricted'}
                          {session.min_level_code ? ` · ${session.min_level_code}+` : ''}
                        </Badge>
                      ) : null}
                      {!session.show_on_agenda ? (
                        <Badge variant="outline" title="Not listed on the public agenda">
                          <EyeOff size={12} className="mr-1" aria-hidden />
                          Not on public agenda
                        </Badge>
                      ) : null}
                      {session.tracks_attendance ? (
                        <Badge variant="info">
                          <QrCode size={12} className="mr-1" aria-hidden />
                          {session.self_checkin_enabled ? 'Attendance' : 'Attendance · staff only'}
                        </Badge>
                      ) : null}
                    </div>
                    {session.room ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-white/50">
                        <MapPin size={12} aria-hidden />
                        {session.room}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {session.access === 'RESTRICTED' ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => setAllowListFor(session)}>
                        <Users size={14} className="mr-1" aria-hidden />
                        Allow-list
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(session)}
                      aria-label={`Edit ${session.title}`}
                    >
                      <Pencil size={16} aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleting(session)}
                      aria-label={`Remove ${session.title}`}
                    >
                      <Trash2 size={16} aria-hidden />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <SessionFormModal
        open={formOpen}
        session={editing}
        defaultDay={activeDay}
        days={days}
        timeZone={timeZone}
        levels={levels}
        onClose={() => setFormOpen(false)}
        onSubmit={save}
      />
      <SessionAllowListModal
        open={allowListFor !== null}
        eventId={event.id}
        session={allowListFor}
        onClose={() => setAllowListFor(null)}
      />
      <ConfirmationDialog
        open={deleting !== null}
        title="Remove this session?"
        message={`“${deleting?.title ?? ''}” will stop accepting check-ins and disappear from attendees’ schedules and the public agenda. Attendance and reviews already recorded are kept.`}
        confirmText="Remove"
        confirmVariant="destructive"
        loading={deleteBusy}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

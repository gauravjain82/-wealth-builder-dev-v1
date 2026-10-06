import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button, Checkbox, Input, Label, Modal, Select, Text, Textarea } from '@shared/components';
import {
  formatDayLabel,
  fromWallClock,
  toWallClock,
  zoneAbbreviation,
} from '../../utils/zoned-time';
import type {
  EventSession,
  EventSessionPayload,
  LevelOption,
  SessionAccess,
  SessionKind,
} from '../../types/session';

interface SessionFormModalProps {
  open: boolean;
  /** The session being edited; `null` creates one. */
  session: EventSession | null;
  /** Day pre-selected when adding from a day tab. */
  defaultDay: string;
  days: string[];
  timeZone: string;
  levels: LevelOption[];
  onClose: () => void;
  onSubmit: (payload: EventSessionPayload) => Promise<void>;
}

interface Draft {
  kind: SessionKind;
  title: string;
  room: string;
  description: string;
  day: string;
  start: string;
  end: string;
  tracks_attendance: boolean;
  access: SessionAccess;
  restriction_label: string;
  min_level: string;
  self_checkin_enabled: boolean;
  checkin_opens_minutes_before: string;
  checkin_closes_minutes_after: string;
  show_on_agenda: boolean;
}

const KINDS: Array<{ value: SessionKind; label: string; hint: string }> = [
  { value: 'SESSION', label: 'Session', hint: 'Takes attendance' },
  { value: 'BREAK', label: 'Break', hint: 'Lunch, dinner…' },
  { value: 'INFO', label: 'Info', hint: 'Doors open, registration…' },
];

function draftFrom(session: EventSession | null, day: string, timeZone: string): Draft {
  if (!session) {
    return {
      kind: 'SESSION',
      title: '',
      room: '',
      description: '',
      day,
      start: '09:00',
      end: '10:00',
      tracks_attendance: true,
      access: 'OPEN',
      restriction_label: '',
      min_level: '',
      self_checkin_enabled: true,
      checkin_opens_minutes_before: '30',
      checkin_closes_minutes_after: '0',
      show_on_agenda: true,
    };
  }
  const start = toWallClock(session.starts_at, timeZone);
  return {
    kind: session.kind,
    title: session.title,
    room: session.room,
    description: session.description,
    day: start.date,
    start: start.time,
    end: session.ends_at ? toWallClock(session.ends_at, timeZone).time : '',
    tracks_attendance: session.tracks_attendance,
    access: session.access,
    restriction_label: session.restriction_label,
    min_level: session.min_level ? String(session.min_level) : '',
    self_checkin_enabled: session.self_checkin_enabled,
    checkin_opens_minutes_before: String(session.checkin_opens_minutes_before),
    checkin_closes_minutes_after: String(session.checkin_closes_minutes_after),
    show_on_agenda: session.show_on_agenda,
  };
}

/** Client-side checks, so the common mistakes are caught before a round trip. */
function validate(draft: Draft): Partial<Record<keyof Draft, string>> {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!draft.title.trim()) errors.title = 'Give it a title.';
  if (!draft.start) errors.start = 'Pick a start time.';
  if (draft.tracks_attendance && !draft.end) {
    errors.end = 'An end time is needed to take attendance.';
  }
  // Same-day agenda: an end before the start is almost always a typo
  // (a session past midnight is not something this editor offers).
  if (draft.start && draft.end && draft.end <= draft.start) {
    errors.end = 'Must be after the start.';
  }
  return errors;
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500 dark:text-white/50">{hint}</p>
      ) : null}
    </div>
  );
}

/** Create or edit one agenda line. Times are entered in the event's timezone. */
export function SessionFormModal({
  open,
  session,
  defaultDay,
  days,
  timeZone,
  levels,
  onClose,
  onSubmit,
}: SessionFormModalProps) {
  const id = useId();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(session, defaultDay, timeZone));
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(draftFrom(session, defaultDay, timeZone));
    setShowErrors(false);
    setServerError(null);
  }, [open, session, defaultDay, timeZone]);

  const errors = useMemo(() => validate(draft), [draft]);
  const shownErrors = showErrors ? errors : {};
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  // Picking a type sets the attendance default; the organiser can still flip it.
  const pickKind = (kind: SessionKind) =>
    setDraft((current) => ({ ...current, kind, tracks_attendance: kind === 'SESSION' }));

  // Keep a stored day selectable even if it falls outside the event's dates.
  const dayOptions = days.includes(draft.day) || !draft.day ? days : [draft.day, ...days];
  const zone = zoneAbbreviation(timeZone);
  const sortedLevels = [...levels].sort((a, b) => b.rank - a.rank);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    setSaving(true);
    setServerError(null);
    try {
      await onSubmit({
        kind: draft.kind,
        title: draft.title.trim(),
        room: draft.room.trim(),
        description: draft.description.trim(),
        starts_at: fromWallClock(draft.day, draft.start, timeZone),
        ends_at: draft.end ? fromWallClock(draft.day, draft.end, timeZone) : null,
        tracks_attendance: draft.tracks_attendance,
        access: draft.tracks_attendance ? draft.access : 'OPEN',
        restriction_label: draft.access === 'RESTRICTED' ? draft.restriction_label.trim() : '',
        min_level: draft.access === 'RESTRICTED' && draft.min_level ? Number(draft.min_level) : null,
        self_checkin_enabled: draft.self_checkin_enabled,
        checkin_opens_minutes_before: Math.max(0, Number(draft.checkin_opens_minutes_before) || 0),
        checkin_closes_minutes_after: Math.max(0, Number(draft.checkin_closes_minutes_after) || 0),
        show_on_agenda: draft.show_on_agenda,
      });
      onClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not save this session.');
    } finally {
      setSaving(false);
    }
  };

  const describedBy = (key: keyof Draft) => (shownErrors[key] ? `${id}-${key}-error` : undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={session ? 'Edit session' : 'Add session'}
      subtitle={`Times are in the event’s timezone · ${timeZone} (${zone})`}
      className="max-w-2xl"
    >
      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-900 dark:text-white">Type</legend>
          <div role="radiogroup" className="grid grid-cols-3 gap-2">
            {KINDS.map((kind) => {
              const selected = draft.kind === kind.value;
              return (
                <button
                  key={kind.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => pickKind(kind.value)}
                  className={`rounded-lg border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-slate-200 hover:border-slate-300 dark:border-white/15 dark:hover:border-white/30'
                  }`}
                >
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                    {kind.label}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-white/50">{kind.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title" htmlFor={`${id}-title`} error={shownErrors.title}>
              <Input
                id={`${id}-title`}
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Session 1"
                autoFocus
                aria-invalid={Boolean(shownErrors.title)}
                aria-describedby={describedBy('title')}
              />
            </Field>
          </div>
          <Field label="Day" htmlFor={`${id}-day`}>
            <Select id={`${id}-day`} value={draft.day} onChange={(e) => set('day', e.target.value)}>
              {dayOptions.map((day) => (
                <option key={day} value={day}>
                  {formatDayLabel(day)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Room" htmlFor={`${id}-room`} hint="Shown on the agenda and the room’s QR screen.">
            <Input
              id={`${id}-room`}
              value={draft.room}
              onChange={(e) => set('room', e.target.value)}
              placeholder="Grand Ballroom"
            />
          </Field>
          <Field label={`Starts (${zone})`} htmlFor={`${id}-start`} error={shownErrors.start}>
            <Input
              id={`${id}-start`}
              type="time"
              value={draft.start}
              onChange={(e) => set('start', e.target.value)}
              aria-invalid={Boolean(shownErrors.start)}
              aria-describedby={describedBy('start')}
            />
          </Field>
          <Field
            label={`Ends (${zone})`}
            htmlFor={`${id}-end`}
            error={shownErrors.end}
            hint={draft.tracks_attendance ? undefined : 'Optional for things like “Doors open”.'}
          >
            <Input
              id={`${id}-end`}
              type="time"
              value={draft.end}
              onChange={(e) => set('end', e.target.value)}
              aria-invalid={Boolean(shownErrors.end)}
              aria-describedby={describedBy('end')}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor={`${id}-description`}>
              <Textarea
                id={`${id}-description`}
                rows={2}
                value={draft.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Optional — dress code, speakers, what to bring…"
              />
            </Field>
          </div>
        </div>

        <label className="flex items-start gap-3">
          <Checkbox
            checked={draft.show_on_agenda}
            onChange={(e) => set('show_on_agenda', e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900 dark:text-white">
              Show on public agenda
            </span>
            <span className="block text-xs text-slate-500 dark:text-white/50">
              Listed on the event page when its Agenda section is set to “Show sessions”. Turn off
              for internal or invitation-only items.
            </span>
          </span>
        </label>

        <section className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-white/10">
          <label className="flex items-start gap-3">
            <Checkbox
              checked={draft.tracks_attendance}
              onChange={(e) => set('tracks_attendance', e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium text-slate-900 dark:text-white">
                Take attendance
              </span>
              <span className="block text-xs text-slate-500 dark:text-white/50">
                Attendees are scanned in separately from event check-in.
              </span>
            </span>
          </label>

          {draft.tracks_attendance ? (
            <>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-slate-900 dark:text-white">Who can attend</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      { value: 'OPEN', label: 'All ticket holders', hint: 'Anyone with a live ticket.' },
                      {
                        value: 'RESTRICTED',
                        label: 'Restricted',
                        hint: 'Only people on the allow-list or at a minimum level.',
                      },
                    ] as const
                  ).map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${
                        draft.access === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 dark:border-white/15'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${id}-access`}
                        value={option.value}
                        checked={draft.access === option.value}
                        onChange={() => set('access', option.value)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium text-slate-900 dark:text-white">
                          {option.label}
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-white/50">{option.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {draft.access === 'RESTRICTED' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Label shown to attendees"
                    htmlFor={`${id}-label`}
                    hint="e.g. “Qualifiers only”"
                  >
                    <Input
                      id={`${id}-label`}
                      value={draft.restriction_label}
                      onChange={(e) => set('restriction_label', e.target.value)}
                      placeholder="Qualifiers only"
                    />
                  </Field>
                  <Field
                    label="Also admit everyone at or above"
                    htmlFor={`${id}-level`}
                    hint="Checked against whoever holds the ticket at the door."
                  >
                    <Select
                      id={`${id}-level`}
                      value={draft.min_level}
                      onChange={(e) => set('min_level', e.target.value)}
                    >
                      <option value="">No level rule — allow-list only</option>
                      {sortedLevels.map((level) => (
                        <option key={level.id} value={String(level.id)}>
                          {level.name || level.code} and above
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Text variant="muted" className="text-xs sm:col-span-2">
                    Add specific people from the sessions list after saving (“Allow-list”).
                  </Text>
                </div>
              ) : null}

              <label className="flex items-start gap-3">
                <Checkbox
                  checked={draft.self_checkin_enabled}
                  onChange={(e) => set('self_checkin_enabled', e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900 dark:text-white">
                    Attendees can scan the room’s QR code
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-white/50">
                    Off means only door staff can check people in.
                  </span>
                </span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Check-in opens (minutes before start)"
                  htmlFor={`${id}-opens`}
                >
                  <Input
                    id={`${id}-opens`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={draft.checkin_opens_minutes_before}
                    onChange={(e) => set('checkin_opens_minutes_before', e.target.value)}
                  />
                </Field>
                <Field
                  label="Stays open (minutes after end)"
                  htmlFor={`${id}-closes`}
                  hint="Door staff can still admit late arrivals."
                >
                  <Input
                    id={`${id}-closes`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={draft.checkin_closes_minutes_after}
                    onChange={(e) => set('checkin_closes_minutes_after', e.target.value)}
                  />
                </Field>
              </div>
            </>
          ) : null}
        </section>

        {serverError ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {serverError}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : session ? 'Save changes' : 'Add session'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { Globe } from 'lucide-react';

import { Button, Modal, TimezoneSelect } from '@/shared/components';
import { useToastStore } from '@/store';

import { useCreateTraining, useUpdateTraining } from '../hooks/use-training-schedule';
import type { Recurrence, ScheduleOccurrence, TrainingInput } from '../types';
import { toDateInput, viewerTimezone, zoneAbbreviation } from '../utils/time';
import { Field, Notice, fieldClass } from './fields';

const TRAINING_COLORS = [
  { name: 'Blue', value: '#4A90E2' },
  { name: 'Orange', value: '#F5A623' },
  { name: 'Green', value: '#7ED321' },
  { name: 'Red', value: '#D0021B' },
  { name: 'Purple', value: '#9013FE' },
  { name: 'Pink', value: '#E91E63' },
  { name: 'Teal', value: '#00BCD4' },
  { name: 'Amber', value: '#FFC107' },
];

const DURATIONS = [30, 45, 60, 90, 120, 180, 240];
const REPEATS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];
const MAX_OCCURRENCES = 52;

function blank(): TrainingInput {
  return {
    title: '',
    description: '',
    meeting_url: '',
    color: TRAINING_COLORS[0].value,
    // Start in the host's own zone; they change it only for a training held elsewhere.
    timezone: viewerTimezone(),
    start_date: toDateInput(new Date()),
    start_time: '19:00',
    duration_minutes: 60,
    recurrence: 'weekly',
    occurrence_count: 12,
  };
}

function fromOccurrence(occurrence: ScheduleOccurrence): TrainingInput {
  return {
    title: occurrence.title,
    description: occurrence.description,
    meeting_url: occurrence.meeting_url,
    color: occurrence.color,
    timezone: occurrence.timezone,
    start_date: occurrence.local_date,
    start_time: occurrence.start_time,
    duration_minutes: occurrence.duration_minutes,
    recurrence: occurrence.recurrence,
    occurrence_count: occurrence.series_count,
  };
}

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

interface TrainingFormModalProps {
  open: boolean;
  /** The date whose training is being edited; absent to create one. */
  editing: ScheduleOccurrence | null;
  onClose: () => void;
}

export function TrainingFormModal({ open, editing, onClose }: TrainingFormModalProps) {
  const [form, setForm] = useState<TrainingInput>(blank);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateTraining();
  const update = useUpdateTraining();
  const addToast = useToastStore((state) => state.addToast);
  const saving = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(editing ? fromOccurrence(editing) : blank());
    setError(null);
  }, [open, editing]);

  const set = <K extends keyof TrainingInput>(key: K, value: TrainingInput[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const myZone = viewerTimezone();
  const inMyZone = form.timezone === myZone;
  const durations = DURATIONS.includes(form.duration_minutes)
    ? DURATIONS
    : [...DURATIONS, form.duration_minutes].sort((a, b) => a - b);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      if (editing) {
        const { title, description, meeting_url, color, timezone, start_time, duration_minutes } = form;
        await update.mutateAsync({
          trainingId: editing.training_id,
          patch: { title, description, meeting_url, color, timezone, start_time, duration_minutes },
        });
        addToast({ type: 'success', message: 'Training updated.' });
      } else {
        await create.mutateAsync(form);
        const count = form.recurrence === 'none' ? 1 : form.occurrence_count;
        addToast({
          type: 'success',
          message: count === 1 ? 'Training added to your BaseShop’s schedule.' : `${count} trainings added to your BaseShop’s schedule.`,
        });
      }
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save the training.');
    }
  };

  return (
    <Modal
      open={open}
      title={editing ? 'Edit training' : 'New training'}
      subtitle={
        editing
          ? 'Changes apply to every date and to every host who inherited it.'
          : 'Everyone in your BaseShop will see this on their schedule.'
      }
      onClose={onClose}
      contentClassName="max-w-[640px]"
    >
      <form onSubmit={submit} className="space-y-4 overflow-y-auto pr-1">
        <Field label="Title" htmlFor="wb-ts-title">
          <input
            id="wb-ts-title"
            className={fieldClass}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            maxLength={200}
            required
            autoFocus
            placeholder="Weekly BaseShop training"
          />
        </Field>

        <Field label="Description" htmlFor="wb-ts-description">
          <textarea
            id="wb-ts-description"
            className={`${fieldClass} h-auto py-2`}
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label={editing ? 'This date' : 'First date'}
            htmlFor="wb-ts-date"
            hint={editing ? 'The dates of a series are fixed once created.' : undefined}
          >
            <input
              id="wb-ts-date"
              type="date"
              className={fieldClass}
              value={form.start_date}
              onChange={(e) => set('start_date', e.target.value)}
              disabled={Boolean(editing)}
              required
            />
          </Field>
          <Field label="Start time" htmlFor="wb-ts-time">
            <input
              id="wb-ts-time"
              type="time"
              className={fieldClass}
              value={form.start_time}
              onChange={(e) => set('start_time', e.target.value)}
              required
            />
          </Field>
          <Field label="Length" htmlFor="wb-ts-duration">
            <select
              id="wb-ts-duration"
              className={fieldClass}
              value={form.duration_minutes}
              onChange={(e) => set('duration_minutes', Number(e.target.value))}
            >
              {durations.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {durationLabel(minutes)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div
          className={`space-y-2 rounded-lg border-2 p-3 ${
            inMyZone
              ? 'border-sky-300 bg-sky-50 dark:border-sky-400/40 dark:bg-sky-400/10'
              : 'border-amber-400 bg-amber-50 dark:border-amber-400/50 dark:bg-amber-400/10'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="wb-ts-timezone"
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white"
            >
              <Globe size={15} aria-hidden />
              Time zone of this training
            </label>
            {inMyZone ? (
              <span className="rounded-full bg-sky-200 px-2 py-0.5 text-xs font-medium text-sky-900 dark:bg-sky-400/25 dark:text-sky-100">
                Your time zone
              </span>
            ) : (
              <button
                type="button"
                className="text-xs font-medium text-primary underline"
                onClick={() => set('timezone', myZone)}
              >
                Use my time zone ({zoneAbbreviation(myZone)})
              </button>
            )}
          </div>
          <TimezoneSelect id="wb-ts-timezone" value={form.timezone} onChange={(zone) => set('timezone', zone)} />
          <p className="text-xs text-slate-700 dark:text-white/70">
            {inMyZone
              ? 'The start time above is in this zone. Members elsewhere see it converted to their own time.'
              : `This is not your time zone (${myZone}). The start time above is read in ${form.timezone}.`}
          </p>
        </div>

        <Field label="Meeting link" htmlFor="wb-ts-link" hint="Optional — a Zoom or other meeting link.">
          <input
            id="wb-ts-link"
            type="url"
            className={fieldClass}
            value={form.meeting_url}
            onChange={(e) => set('meeting_url', e.target.value)}
            placeholder="https://zoom.us/j/…"
          />
        </Field>

        {editing ? null : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Repeats" htmlFor="wb-ts-repeat">
              <select
                id="wb-ts-repeat"
                className={fieldClass}
                value={form.recurrence}
                onChange={(e) => set('recurrence', e.target.value as Recurrence)}
              >
                {REPEATS.map((repeat) => (
                  <option key={repeat.value} value={repeat.value}>
                    {repeat.label}
                  </option>
                ))}
              </select>
            </Field>
            {form.recurrence === 'none' ? null : (
              <Field label="Number of dates" htmlFor="wb-ts-count" hint={`Up to ${MAX_OCCURRENCES}.`}>
                <input
                  id="wb-ts-count"
                  type="number"
                  className={fieldClass}
                  min={1}
                  max={MAX_OCCURRENCES}
                  value={form.occurrence_count}
                  onChange={(e) => set('occurrence_count', Number(e.target.value))}
                  required
                />
              </Field>
            )}
          </div>
        )}

        <Field label="Colour">
          <div className="flex flex-wrap gap-2">
            {TRAINING_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                title={color.name}
                aria-label={color.name}
                aria-pressed={form.color === color.value}
                onClick={() => set('color', color.value)}
                className={`h-7 w-7 rounded-full border-2 ${
                  form.color === color.value ? 'border-slate-900 dark:border-white' : 'border-transparent'
                }`}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
        </Field>

        {error ? <Notice tone="danger">{error}</Notice> : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create training'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { useEffect, useState, type FormEvent } from 'react';

import { Button, Modal } from '@/shared/components';
import { useToastStore } from '@/store';

import { useSaveScheduleSettings, useScheduleSettings } from '../hooks/use-training-schedule';
import type { ScheduleSettingsPatch } from '../types';
import { Field, Notice, fieldClass, mutedText } from './fields';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

/** The administrator's rules: who may host, what a delete reaches, when attendance is open. */
export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const settings = useScheduleSettings(open);
  const save = useSaveScheduleSettings();
  const addToast = useToastStore((state) => state.addToast);
  const [form, setForm] = useState<ScheduleSettingsPatch>({});
  const data = settings.data;

  useEffect(() => {
    if (open) setForm({});
  }, [open]);

  if (!open) return null;
  const value = <K extends keyof ScheduleSettingsPatch>(key: K) => (form[key] ?? data?.[key]) as NonNullable<ScheduleSettingsPatch[K]>;
  const set = <K extends keyof ScheduleSettingsPatch>(key: K, next: ScheduleSettingsPatch[K]) =>
    setForm((previous) => ({ ...previous, [key]: next }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await save.mutateAsync(form);
      addToast({ type: 'success', message: 'Training schedule settings saved.' });
      onClose();
    } catch (failure) {
      addToast({ type: 'error', message: failure instanceof Error ? failure.message : 'Could not save.' });
    }
  };

  return (
    <Modal open title="Training schedule settings" onClose={onClose} contentClassName="max-w-[600px]">
      {settings.isLoading ? <p className={mutedText}>Loading…</p> : null}
      {settings.isError ? <Notice tone="danger">{settings.error.message}</Notice> : null}
      {data ? (
        <form onSubmit={submit} className="space-y-4 overflow-y-auto pr-1">
          <Field
            label="Who can create and inherit trainings"
            htmlFor="wb-ts-level"
            hint="Everyone at this level and above."
          >
            <select
              id="wb-ts-level"
              className={fieldClass}
              value={value('creator_min_level') ?? ''}
              onChange={(e) => set('creator_min_level', e.target.value)}
            >
              {data.choices.levels.map((level) => (
                <option key={level.code} value={level.code}>
                  {level.name === level.code ? level.code : `${level.code} — ${level.name}`}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="When a host deletes a training"
            htmlFor="wb-ts-completed"
            hint="Completed means the training has already ended."
          >
            <select
              id="wb-ts-completed"
              className={fieldClass}
              value={value('completed_delete_policy')}
              onChange={(e) => set('completed_delete_policy', e.target.value)}
            >
              {data.choices.completed_delete_policy.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="When other hosts have inherited it" htmlFor="wb-ts-inherited">
            <select
              id="wb-ts-inherited"
              className={fieldClass}
              value={value('inherited_delete_policy')}
              onChange={(e) => set('inherited_delete_policy', e.target.value)}
            >
              {data.choices.inherited_delete_policy.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </Field>
          <p className={mutedText}>Administrators can always delete any training, whatever these two rules say.</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Attendance opens" htmlFor="wb-ts-opens" hint="Minutes before the start.">
              <input
                id="wb-ts-opens"
                type="number"
                min={0}
                max={1440}
                className={fieldClass}
                value={value('attendance_opens_minutes_before')}
                onChange={(e) => set('attendance_opens_minutes_before', Number(e.target.value))}
              />
            </Field>
            <Field label="Attendance closes" htmlFor="wb-ts-closes" hint="Minutes after the end.">
              <input
                id="wb-ts-closes"
                type="number"
                min={0}
                max={1440}
                className={fieldClass}
                value={value('attendance_closes_minutes_after')}
                onChange={(e) => set('attendance_closes_minutes_after', Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || Object.keys(form).length === 0}>
              {save.isPending ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}

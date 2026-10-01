/**
 * Assistant hours: rows of weekday + start/end (`HH:MM`, 24-hour). Validation lives in
 * `validateHours` (utils) and matches the contract; the server re-checks.
 */

import type { AssistantHours, Weekday } from '../types';
import { WEEKDAYS } from '../utils/plugin-fees-format';

export function HoursEditor({
  value,
  onChange,
  disabled,
  rowErrors,
  formError,
}: {
  value: AssistantHours[];
  onChange: (next: AssistantHours[]) => void;
  disabled?: boolean;
  rowErrors?: Record<number, string>;
  formError?: string;
}) {
  const update = (index: number, patch: Partial<AssistantHours>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const add = () => {
    const used = new Set(value.map((row) => row.day));
    const nextDay = WEEKDAYS.find((d) => !used.has(d.value))?.value ?? 'mon';
    const last = value[value.length - 1];
    onChange([...value, { day: nextDay, start: last?.start ?? '09:00', end: last?.end ?? '17:00' }]);
  };

  return (
    <div className="wb-pf-stack" style={{ gap: 8 }}>
      {value.map((row, index) => (
        <div key={index}>
          <div className="wb-pf-hours-row">
            <select
              className="input-field"
              aria-label={`Day ${index + 1}`}
              value={row.day}
              disabled={disabled}
              onChange={(event) => update(index, { day: event.target.value as Weekday })}
            >
              {WEEKDAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <input
              type="time"
              className="input-field"
              aria-label={`Start time ${index + 1}`}
              value={row.start}
              disabled={disabled}
              onChange={(event) => update(index, { start: event.target.value })}
            />
            <input
              type="time"
              className="input-field"
              aria-label={`End time ${index + 1}`}
              value={row.end}
              disabled={disabled}
              onChange={(event) => update(index, { end: event.target.value })}
            />
            <button
              type="button"
              className="btn-secondary"
              disabled={disabled || value.length <= 1}
              onClick={() => remove(index)}
              aria-label={`Remove row ${index + 1}`}
            >
              Remove
            </button>
          </div>
          {rowErrors?.[index] ? <p className="wb-pf-field-error">{rowErrors[index]}</p> : null}
        </div>
      ))}
      <div>
        <button type="button" className="btn-secondary" disabled={disabled} onClick={add}>
          + Add day
        </button>
      </div>
      {formError ? <p className="wb-pf-field-error">{formError}</p> : null}
    </div>
  );
}

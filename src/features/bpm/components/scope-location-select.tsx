import { Select } from '@shared/components';
import type { BPMOccurrence } from '../types';

interface ScopeLocationSelectProps {
  choices: BPMOccurrence[];
  value: BPMOccurrence | null;
  onChange: (occurrenceId: number) => void;
  /** Accessible name — say what the location is for ("Check in at"). */
  label: string;
  disabled?: boolean;
  className?: string;
}

/**
 * The location picker for an action in All-locations mode.
 *
 * Renders nothing when there is only one choice: outside All-locations mode the
 * selected date already is the location, and a one-option select is noise.
 * Pair it with `useScopeLocation()`.
 */
export function ScopeLocationSelect({
  choices,
  value,
  onChange,
  label,
  disabled = false,
  className = '',
}: ScopeLocationSelectProps) {
  if (choices.length < 2) return null;
  return (
    <Select
      aria-label={label}
      title={label}
      value={value?.id ?? ''}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
      className={`max-w-[220px] ${className}`.trim()}
    >
      {choices.map((row) => (
        <option key={row.id} value={row.id}>
          {row.location_detail?.label ?? `Location ${row.location ?? row.id}`}
        </option>
      ))}
    </Select>
  );
}

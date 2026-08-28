import { Select } from '@shared/components';
import { INTERACTION_OPTIONS } from '../services/bpm-service';
import type { InteractionStatus } from '../types';

interface InteractionStatusSelectProps {
  value: InteractionStatus | '';
  onChange: (value: InteractionStatus) => void;
  disabled?: boolean;
}

export function InteractionStatusSelect({ value, onChange, disabled }: InteractionStatusSelectProps) {
  return (
    <Select
      variant="surface"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as InteractionStatus)}
      aria-label="Interaction status"
    >
      <option value="">— Set outcome —</option>
      {INTERACTION_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

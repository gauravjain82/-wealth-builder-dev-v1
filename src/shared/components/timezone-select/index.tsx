import { useMemo } from 'react';
import { SearchableSelect } from '../ui/searchable-select';
import { timezoneOptions } from './timezones';

export interface TimezoneSelectProps {
  /** IANA zone name, e.g. `America/New_York`. */
  value: string;
  onChange: (timezone: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * The app's timezone picker: type a city, region, offset ("GMT-4") or zone name
 * ("Eastern", "EST") to narrow several hundred IANA zones to a handful.
 */
export function TimezoneSelect({ value, onChange, disabled, className, id }: TimezoneSelectProps) {
  const options = useMemo(() => timezoneOptions(value), [value]);
  return (
    <SearchableSelect
      id={id}
      aria-label="Timezone"
      className={className}
      disabled={disabled}
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Select a timezone…"
      searchPlaceholder="Search city, region or GMT offset…"
      emptyMessage="No timezone matches"
    />
  );
}

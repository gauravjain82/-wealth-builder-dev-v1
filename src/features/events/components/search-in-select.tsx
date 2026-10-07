import { Select } from '@shared/components';
import { SEARCH_IN_OPTIONS, type SearchIn } from '../utils/purchase-search';

interface SearchInSelectProps {
  value: SearchIn | undefined;
  onChange: (value: SearchIn | undefined) => void;
}

/**
 * "Search in: everywhere / buyer / attendee" next to the Purchases and Check-in
 * search boxes. Narrows names, emails and phones only — purchase, ticket and
 * BSCPro numbers match whichever is picked. `undefined` means everywhere.
 */
export function SearchInSelect({ value, onChange }: SearchInSelectProps) {
  return (
    <Select
      value={value ?? 'all'}
      onChange={(e) => {
        const next = e.target.value as SearchIn;
        onChange(next === 'all' ? undefined : next);
      }}
      aria-label="Search in"
      className="max-w-[200px]"
    >
      {SEARCH_IN_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </Select>
  );
}

import { ArrowDown, ArrowUp } from 'lucide-react';

interface SortButtonProps<K extends string> {
  label: string;
  columnKey: K;
  sortKey: K | null;
  ascending: boolean;
  onSort: (key: K) => void;
  /** Tooltip, when the visible label is an abbreviation. */
  title?: string;
}

/**
 * A clickable column label that shows which way it is currently sorting.
 *
 * The same idiom as `guest-checkin-table.tsx`'s `SortHeader`, split out so a
 * header cell can carry more than one sort — Guest Invites' Contact column
 * sorts by phone *or* email, one button each.
 */
export function SortButton<K extends string>({
  label,
  columnKey,
  sortKey,
  ascending,
  onSort,
  title,
}: SortButtonProps<K>) {
  const active = sortKey === columnKey;
  return (
    <button
      type="button"
      title={title}
      onClick={() => onSort(columnKey)}
      aria-label={`Sort by ${title || label}${active ? (ascending ? ', ascending' : ', descending') : ''}`}
      className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-900 dark:hover:text-white"
    >
      {label}
      {active ? ascending ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : null}
    </button>
  );
}

/** A `<th>` holding one `SortButton`. */
export function SortHeader<K extends string>({
  className,
  ...props
}: SortButtonProps<K> & { className?: string }) {
  const active = props.sortKey === props.columnKey;
  return (
    <th
      className={`px-3 py-2 ${className || ''}`}
      aria-sort={active ? (props.ascending ? 'ascending' : 'descending') : undefined}
    >
      <SortButton {...props} />
    </th>
  );
}

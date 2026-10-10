import * as React from 'react';
import { cn } from '@core/utils';

/** The seller fields the picker needs; both public and in-app sellers fit. */
export interface SellerOption {
  id: number;
  display_name: string;
  agent_code: string;
}

/** Rows drawn at once — a seller list can run past a thousand names. */
const MAX_VISIBLE = 50;

const sellerLabel = (seller: SellerOption) =>
  seller.agent_code ? `${seller.display_name} (${seller.agent_code})` : seller.display_name;

/**
 * Sellers matching every typed word in their name or agency code, A–Z by name.
 * Sellers whose name or code *starts* with the text come first, so typing a code
 * or the first letters of a name puts the right person at the top.
 */
function searchSellers<T extends SellerOption>(sellers: readonly T[], query: string): T[] {
  const sorted = [...sellers].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' }),
  );
  const text = query.trim().toLowerCase();
  if (!text) return sorted;
  const terms = text.split(/\s+/);
  const leading: T[] = [];
  const rest: T[] = [];
  for (const seller of sorted) {
    const name = seller.display_name.toLowerCase();
    const code = seller.agent_code.toLowerCase();
    if (!terms.every((term) => name.includes(term) || code.includes(term))) continue;
    (name.startsWith(text) || code.startsWith(text) ? leading : rest).push(seller);
  }
  return [...leading, ...rest];
}

/**
 * Type-to-search SMD picker: the list narrows on every keystroke, matching the
 * name or the agency code. Replaces a native `<select>`, which is unusable once
 * an event lists the SMDs of several external teams.
 *
 * Editing the text clears the current pick, so a half-typed search is never
 * submitted as the previous answer. Supports ↑/↓, Enter and Escape.
 */
export function SellerCombobox({
  sellers,
  value,
  onChange,
  inputClassName,
  placeholder = 'Type a name or agency code',
  disabled,
  required,
}: {
  sellers: readonly SellerOption[];
  value: number | null;
  onChange: (next: number | null) => void;
  inputClassName: string;
  placeholder?: string;
  disabled?: boolean;
  /** Block native form submission until an SMD is picked. */
  required?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  // The field shows the current pick until the user starts typing a search.
  const [editing, setEditing] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const listboxId = React.useId();

  const selected = React.useMemo(
    () => sellers.find((seller) => seller.id === value) ?? null,
    [sellers, value],
  );
  const matches = React.useMemo(() => searchSellers(sellers, query), [sellers, query]);
  const visible = matches.slice(0, MAX_VISIBLE);

  React.useEffect(() => {
    inputRef.current?.setCustomValidity(
      required && value === null ? 'Select an SMD from the list.' : '',
    );
  }, [required, value]);

  const close = React.useCallback(() => {
    setOpen(false);
    setEditing(false);
    setQuery('');
  }, []);

  React.useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) close();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, close]);

  React.useEffect(() => {
    if (open) listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  function pick(seller: SellerOption) {
    onChange(seller.id);
    close();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (visible.length === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => (current + step + visible.length) % visible.length);
    } else if (event.key === 'Enter' && open) {
      // Never let Enter submit the form while the list is open.
      event.preventDefault();
      if (visible[activeIndex]) pick(visible[activeIndex]);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      close();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        className={inputClassName}
        placeholder={placeholder}
        disabled={disabled}
        value={editing ? query : selected ? sellerLabel(selected) : ''}
        onChange={(event) => {
          if (value !== null) onChange(null);
          setQuery(event.target.value);
          setEditing(true);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={(event) => {
          setOpen(true);
          setActiveIndex(0);
          event.target.select();
        }}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 text-left shadow-lg dark:border-white/15 dark:bg-[#252c3b] [[data-event-surface=tokens]_&]:rounded-sm [[data-event-surface=tokens]_&]:border-[color:var(--event-hairline-strong)] [[data-event-surface=tokens]_&]:bg-[var(--event-surface)]"
        >
          {visible.map((seller, index) => (
            <li
              key={seller.id}
              role="option"
              aria-selected={seller.id === value}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => {
                // Pick before the outside-click handler or a blur can close the list.
                event.preventDefault();
                pick(seller);
              }}
              className={cn(
                'flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-sm text-slate-700 dark:text-white/80 [[data-event-surface=tokens]_&]:text-[color:var(--event-text)]',
                index === activeIndex &&
                  'bg-slate-100 dark:bg-white/10 [[data-event-surface=tokens]_&]:bg-white/10',
                seller.id === value && 'font-semibold',
              )}
            >
              <span>{seller.display_name}</span>
              {seller.agent_code && (
                <span className="shrink-0 text-xs tabular-nums opacity-70">{seller.agent_code}</span>
              )}
            </li>
          ))}
          {matches.length === 0 && (
            <li className="px-3 py-2 text-xs opacity-70 dark:text-white [[data-event-surface=tokens]_&]:text-[color:var(--event-text)]">
              No SMD matches “{query.trim()}”. Check the spelling or try the agency code.
            </li>
          )}
          {matches.length > MAX_VISIBLE && (
            <li className="px-3 py-2 text-xs opacity-70 dark:text-white [[data-event-surface=tokens]_&]:text-[color:var(--event-text)]">
              Showing {MAX_VISIBLE} of {matches.length} — keep typing to narrow the list.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

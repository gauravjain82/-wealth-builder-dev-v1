import * as React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@core/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /**
   * Extra text the search matches against but the row does not show. Pass a
   * function when it is costly to build — it is only called once the panel opens.
   */
  keywords?: string | (() => string);
}

export interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  /** Shown when the typed text matches no option. */
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

/**
 * Lower-cased words, with `_`, `/`, brackets and in-word hyphens read as spaces, so
 * "new york" finds `America/New_York`. A hyphen before a digit is kept: "gmt-4".
 */
function toWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[_/()[\],]+/g, ' ')
    .replace(/-(?!\d)/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * A closed-list select with a search box, for lists too long to scroll.
 *
 * A native `<select>` draws every option in one OS-level popup with no filter, so
 * a list of several hundred entries has to be scrolled end to end. This keeps the
 * same contract — the value is always one of `options` — but opens a themed panel
 * whose search field narrows the list as the user types.
 *
 * Supports keyboard use (↑/↓ to move, Enter to pick, Escape to close) and closes
 * on outside click.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Type to search…',
  emptyMessage = 'No matches',
  disabled,
  className,
  id,
  'aria-label': ariaLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const listboxId = React.useId();

  const selected = options.find((option) => option.value === value);

  // Built on first open, not on mount, so a long list costs nothing until it is used.
  const haystacks = React.useMemo(() => {
    if (!open) return null;
    return options.map((option) => {
      const keywords = typeof option.keywords === 'function' ? option.keywords() : option.keywords;
      return toWords(`${option.label} ${option.value} ${keywords ?? ''}`);
    });
  }, [options, open]);

  // Every typed word must start a word of the option, in any order: "york amer"
  // still matches. Matching word starts — not any substring — keeps short codes
  // exact, so "est" finds EST zones and not every "West …" one.
  const filtered = React.useMemo(() => {
    const words = toWords(query);
    if (words.length === 0 || !haystacks) return options;
    return options.filter((_, index) =>
      words.every((word) => haystacks[index].some((candidate) => candidate.startsWith(word))),
    );
  }, [options, haystacks, query]);

  function openPanel() {
    if (disabled) return;
    setQuery('');
    setActiveIndex(options.findIndex((option) => option.value === value));
    setOpen(true);
  }

  function closePanel(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function commit(option: SearchableSelectOption) {
    onChange(option.value);
    closePanel(true);
  }

  React.useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  // Keep the highlighted row in view — on open this lands on the current value.
  React.useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => {
        if (filtered.length === 0) return -1;
        const next = current + step;
        if (next < 0) return filtered.length - 1;
        if (next >= filtered.length) return 0;
        return next;
      });
      return;
    }
    if (event.key === 'Enter') {
      // Always swallowed: Enter in the search box must never submit the form.
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) commit(option);
      return;
    }
    if (event.key === 'Escape') {
      // Stop here so a surrounding modal does not close along with the panel.
      event.preventDefault();
      event.stopPropagation();
      closePanel(true);
      return;
    }
    if (event.key === 'Tab') closePanel(false);
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      openPanel();
    }
  }

  return (
    // preventDefault keeps a wrapping <label> from re-clicking the trigger when a
    // row is picked, which would reopen the panel that just closed.
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onClick={(event) => event.preventDefault()}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? closePanel(false) : openPanel())}
        onKeyDown={handleTriggerKeyDown}
        className="input h-8 w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-2 text-left text-slate-900 dark:border-white/20 dark:bg-white/5 dark:text-white"
      >
        <span className={cn('truncate', !selected && 'text-slate-500 dark:text-white/50')}>
          {selected?.label ?? (value || placeholder)}
        </span>
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-slate-500 transition-transform dark:text-white/50', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[16rem] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-white/15 dark:bg-[#252c3b]">
          <div className="flex items-center gap-2 border-b border-slate-200 px-3 dark:border-white/10">
            <Search size={14} className="shrink-0 text-slate-400 dark:text-white/40" />
            <input
              ref={searchRef}
              type="text"
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              className="h-9 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/40"
            />
          </div>
          <ul ref={listRef} id={listboxId} role="listbox" className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500 dark:text-white/50">{emptyMessage}</li>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    // Keep focus in the search field; commit on click so the row is
                    // still mounted when the click bubbles to the guard above.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => commit(option)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm text-slate-700 dark:text-white/80',
                      index === activeIndex && 'bg-slate-100 dark:bg-white/10',
                      isSelected && 'font-medium text-slate-900 dark:text-white',
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check size={14} className="shrink-0" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

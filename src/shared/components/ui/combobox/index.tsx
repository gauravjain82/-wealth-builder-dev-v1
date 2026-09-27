import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@core/utils';
import { Input } from '../input';

export interface ComboboxProps {
  /** Current free-text value. */
  value: string;
  onChange: (value: string) => void;
  /** Suggestions offered in the dropdown. */
  options: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  /** Shown when the typed text matches no option. */
  emptyMessage?: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

/**
 * A text field with a themed suggestion list that still accepts a new value.
 *
 * A native `<datalist>` cannot be styled — browsers draw it as an OS-level popup
 * that ignores the app's theme and width — so the list is rendered here instead.
 * Typing filters the options; picking one fills the field; anything not on the
 * list is kept as typed, which is what lets callers introduce new values.
 *
 * Supports keyboard use (↑/↓ to move, Enter to pick, Escape to close) and closes
 * on outside click or blur.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  emptyMessage = 'No matches — it will be added as new',
  className,
  id,
  'aria-label': ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const listboxId = React.useId();

  // An exact match means the user has already picked something, so show the whole
  // list rather than the single row they just selected.
  const filtered = React.useMemo(() => {
    const term = value.trim().toLowerCase();
    if (!term || options.some((option) => option.toLowerCase() === term)) {
      return options;
    }
    return options.filter((option) => option.toLowerCase().includes(term));
  }, [options, value]);

  React.useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  // Keep the highlighted row in view while arrowing through a long list.
  React.useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  function commit(option: string) {
    onChange(option);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
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
    if (event.key === 'Enter' && open && activeIndex >= 0 && filtered[activeIndex]) {
      // Only swallow Enter when it resolves a highlighted suggestion, so the form
      // still submits normally when the list is closed.
      event.preventDefault();
      commit(filtered[activeIndex]);
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === 'Tab') setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          autoComplete="off"
          className="pr-9"
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? 'Hide suggestions' : 'Show suggestions'}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-slate-500 transition-colors hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white/50 dark:hover:text-white"
        >
          <ChevronDown
            size={16}
            className={cn('transition-transform', open && 'rotate-180')}
          />
        </button>
      </div>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-white/15 dark:bg-[#252c3b]"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500 dark:text-white/50">
              {emptyMessage}
            </li>
          ) : (
            filtered.map((option, index) => {
              const selected = option.toLowerCase() === value.trim().toLowerCase();
              return (
                <li
                  key={option}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    // Commit before the input's blur can close the list.
                    event.preventDefault();
                    commit(option);
                  }}
                  className={cn(
                    'cursor-pointer px-3 py-2 text-sm text-slate-700 dark:text-white/80',
                    index === activeIndex && 'bg-slate-100 dark:bg-white/10',
                    selected && 'font-medium text-slate-900 dark:text-white',
                  )}
                >
                  {option}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

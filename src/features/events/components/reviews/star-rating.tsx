import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Star } from 'lucide-react';

const LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  /** Accessible name for the group, e.g. "Rate Session 1". */
  label: string;
  size?: number;
}

/**
 * A 1–5 star picker that is a real radio group: one tab stop, arrow keys move
 * and select, and each star announces its meaning ("4 stars, Very good").
 * Hovering previews; the word under the stars says what the rating means.
 */
export function StarRatingInput({ value, onChange, label, size = 32 }: StarRatingInputProps) {
  const [hover, setHover] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const labelId = useId();
  const shown = hover || value;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, star: number) => {
    let next = star;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(5, star + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(1, star - 1);
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = 5;
    else return;
    e.preventDefault();
    onChange(next);
    refs.current[next - 1]?.focus();
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= shown;
          // Roving tab stop: the selected star, or the first when none is.
          const tabbable = value ? star === value : star === 1;
          return (
            <button
              key={star}
              ref={(el) => {
                refs.current[star - 1] = el;
              }}
              type="button"
              role="radio"
              aria-checked={star === value}
              aria-label={`${star} star${star === 1 ? '' : 's'}, ${LABELS[star - 1]}`}
              tabIndex={tabbable ? 0 : -1}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHover(star)}
              onKeyDown={(e) => onKeyDown(e, star)}
              className="rounded-md p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Star
                size={size}
                aria-hidden
                className={filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-white/25'}
              />
            </button>
          );
        })}
      </div>
      <span aria-hidden className="h-5 text-sm font-medium text-slate-600 dark:text-white/70">
        {shown ? LABELS[shown - 1] : 'Tap a star'}
      </span>
    </div>
  );
}

/** Read-only stars, e.g. next to a review you already left. */
export function StarRatingDisplay({ value, size = 14 }: { value: number; size?: number }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          aria-hidden
          className={
            star <= rounded
              ? 'fill-amber-400 text-amber-400'
              : star - 0.5 === rounded
                ? 'fill-amber-200 text-amber-400'
                : 'text-slate-300 dark:text-white/25'
          }
        />
      ))}
    </span>
  );
}

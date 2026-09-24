import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Modal } from '@shared/components';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface MonthJumpModalProps {
  open: boolean;
  /** The month currently on screen — highlighted, and the year first shown. */
  current: Date;
  onClose: () => void;
  onPick: (month: Date) => void;
}

/**
 * Jump straight to another month.
 *
 * Opened by clicking the calendar's "September 2026" heading. Stepping a year
 * at a time and clicking a month beats pressing the next-month arrow twelve
 * times to reach the same place.
 */
export function MonthJumpModal({ open, current, onClose, onPick }: MonthJumpModalProps) {
  const [year, setYear] = useState(current.getFullYear());
  const today = new Date();

  return (
    <Modal open={open} title="Jump to month" onClose={onClose} contentClassName="max-w-[420px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous year"
          onClick={() => setYear((value) => value - 1)}
        >
          <ChevronLeft size={18} />
        </Button>
        <span className="text-lg font-semibold text-slate-900 dark:text-white">{year}</span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next year"
          onClick={() => setYear((value) => value + 1)}
        >
          <ChevronRight size={18} />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MONTH_LABELS.map((label, index) => {
          const isCurrent =
            year === current.getFullYear() && index === current.getMonth();
          const isThisMonth =
            year === today.getFullYear() && index === today.getMonth();
          return (
            <Button
              key={label}
              variant={isCurrent ? 'default' : 'outline'}
              onClick={() => {
                onPick(new Date(year, index, 1));
                onClose();
              }}
              className={isThisMonth && !isCurrent ? 'ring-1 ring-amber-400' : undefined}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </Modal>
  );
}

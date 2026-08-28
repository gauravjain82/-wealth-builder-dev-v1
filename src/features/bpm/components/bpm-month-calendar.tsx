import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Modal } from '@shared/components';
import { formatOccurrenceTime } from '../services/bpm-service';
import type { BPMOccurrence } from '../types';

interface BPMMonthCalendarProps {
  month: Date;
  occurrences: BPMOccurrence[];
  onMonthChange: (date: Date) => void;
  /** Open the BPM behind an occurrence for editing. */
  onOccurrenceClick?: (occurrence: BPMOccurrence) => void;
  /** Add a guest to a specific occurrence. */
  onAddGuest?: (occurrence: BPMOccurrence) => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: '#22c55e',
  COMPLETED: '#64748b',
  CANCELLED: '#fb7185',
};

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function buildDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const blanks = first.getDay();
  return [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)),
  ];
}

export function BPMMonthCalendar({
  month,
  occurrences,
  onMonthChange,
  onOccurrenceClick,
  onAddGuest,
}: BPMMonthCalendarProps) {
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const days = buildDays(month);
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month);
  const today = new Date();

  const byDay = occurrences.reduce<Record<string, BPMOccurrence[]>>((acc, occurrence) => {
    const key = dayKey(new Date(occurrence.start_at));
    (acc[key] = acc[key] || []).push(occurrence);
    return acc;
  }, {});

  const modalItems = modalDate ? byDay[dayKey(modalDate)] || [] : [];

  return (
    <section className="matchup-calendar-shell">
      <div className="matchup-calendar-toolbar">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous month"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        >
          <ChevronLeft size={18} />
        </Button>
        <h2>{monthLabel}</h2>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next month"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        >
          <ChevronRight size={18} />
        </Button>
      </div>

      <div className="matchup-calendar-body">
        <div className="matchup-month-grid">
          {DAY_LABELS.map((label) => (
            <div key={label} className="matchup-day-label">{label}</div>
          ))}
          {days.map((day, index) => {
            if (!day) return <div key={`blank-${index}`} className="matchup-day matchup-day-empty" />;
            const items = byDay[dayKey(day)] || [];
            return (
              <button
                key={day.toISOString()}
                type="button"
                className={['matchup-day', sameDate(day, today) ? 'is-today' : '', items.length ? 'has-items' : ''].join(' ').trim()}
                onClick={() => items.length && setModalDate(day)}
              >
                <span className="matchup-day-head">
                  <span className="matchup-day-number">{day.getDate()}</span>
                  {items.length ? (
                    <span className="matchup-day-count" aria-label={`${items.length} BPMs`}>{items.length}</span>
                  ) : null}
                </span>
                <span className="matchup-day-events">
                  {items.slice(0, 3).map((occurrence) => (
                    <span
                      key={occurrence.id}
                      style={{ ['--status-color' as string]: STATUS_COLOR[occurrence.status] || '#64748b' }}
                    >
                      {occurrence.event_name}
                    </span>
                  ))}
                  {items.length > 3 ? <span>+{items.length - 3} more</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Modal
        open={Boolean(modalDate)}
        title={modalDate ? new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(modalDate) : ''}
        onClose={() => setModalDate(null)}
        contentClassName="matchup-day-modal"
      >
        <div className="matchup-day-modal-list">
          {modalItems.map((occurrence) => (
            <div key={occurrence.id} className="matchup-day-modal-item">
              <div>
                <strong>{occurrence.event_name}</strong>
                <span>{formatOccurrenceTime(occurrence.start_at)}</span>
                <small>{occurrence.checked_in_count}/{occurrence.guest_count} guests · {occurrence.status}</small>
              </div>
              <div className="matchup-day-modal-item-actions">
                {onAddGuest && occurrence.status === 'SCHEDULED' ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setModalDate(null);
                      onAddGuest(occurrence);
                    }}
                  >
                    Add Guest
                  </Button>
                ) : null}
                {onOccurrenceClick ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setModalDate(null);
                      onOccurrenceClick(occurrence);
                    }}
                  >
                    Edit BPM
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </section>
  );
}

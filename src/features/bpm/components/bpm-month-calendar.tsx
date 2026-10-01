import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Modal } from '@shared/components';
import { formatOccurrenceTime } from '../services/bpm-service';
import { BpmTitleLink } from './bpm-title-link';
import { MonthJumpModal } from './month-jump-modal';
import { OccurrenceRowActions } from './occurrence-row-actions';
import { StatusBadge } from './status-control';
import type { BPMOccurrence } from '../types';
// BPM-owned overrides for the day modal. The grid itself keeps Matchup's
// classes; the modal's item layout is BPM's own, see the stylesheet.
import './bpm-month-calendar.css';

interface BPMMonthCalendarProps {
  month: Date;
  occurrences: BPMOccurrence[];
  onMonthChange: (date: Date) => void;
  /** Open the attachments popup for an occurrence's BPM (from its title). */
  onOpenAttachments?: (occurrence: BPMOccurrence) => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: '#22c55e',
  LIVE: '#f59e0b',
  COMPLETED: '#64748b',
  ARCHIVED: '#64748b',
  HIDDEN: '#a78bfa',
  CANCELLED: '#fb7185',
  DELETED: '#f43f5e',
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

/** One BPM on one day, with every location it runs at that day. */
interface DayGroup {
  key: string;
  eventId: number;
  eventName: string;
  occurrences: BPMOccurrence[];
  guestCount: number;
  checkedInCount: number;
  associateCount: number;
  hasAttachments: boolean;
}

/**
 * Group a day's occurrences by BPM.
 *
 * A multi-location BPM materialises one occurrence per (location, date), so a
 * day can hold several rows for what people think of as a single meeting.
 * Grouping keeps the day modal readable and turns the location into a dropdown
 * on one row rather than a repeated block.
 */
function groupByEvent(occurrences: BPMOccurrence[]): DayGroup[] {
  const groups = new Map<number, DayGroup>();
  for (const occurrence of occurrences) {
    let group = groups.get(occurrence.event);
    if (!group) {
      group = {
        key: String(occurrence.event),
        eventId: occurrence.event,
        eventName: occurrence.event_name,
        occurrences: [],
        guestCount: 0,
        checkedInCount: 0,
        associateCount: 0,
        hasAttachments: false,
      };
      groups.set(occurrence.event, group);
    }
    group.occurrences.push(occurrence);
    group.guestCount += occurrence.guest_count;
    group.checkedInCount += occurrence.checked_in_count;
    group.associateCount += occurrence.associate_count;
    group.hasAttachments = group.hasAttachments || occurrence.has_attachments;
  }
  // First location first (start, then id) — the order the selection context
  // uses, so an All-locations link anchors on the same occurrence it would.
  for (const group of groups.values()) {
    group.occurrences.sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime() || a.id - b.id,
    );
  }
  return [...groups.values()];
}

export function BPMMonthCalendar({
  month,
  occurrences,
  onMonthChange,
  onOpenAttachments,
}: BPMMonthCalendarProps) {
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [jumpOpen, setJumpOpen] = useState(false);
  // Which location is targeted per BPM, for multi-location days. Absent means
  // the default, which for several locations is All locations (D23).
  const [picked, setPicked] = useState<Record<number, BPMOccurrence | 'all'>>({});

  const days = buildDays(month);
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month);
  const today = new Date();

  const byDay = occurrences.reduce<Record<string, BPMOccurrence[]>>((acc, occurrence) => {
    const key = dayKey(new Date(occurrence.start_at));
    (acc[key] = acc[key] || []).push(occurrence);
    return acc;
  }, {});

  const modalGroups = useMemo(
    () => (modalDate ? groupByEvent(byDay[dayKey(modalDate)] || []) : []),
    // `byDay` is rebuilt on every render, so key off the source list instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modalDate, occurrences],
  );

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
        {/* Clicking the heading opens the month / year jump. */}
        <h2>
          <button
            type="button"
            onClick={() => setJumpOpen(true)}
            title="Jump to another month"
            className="cursor-pointer underline decoration-dotted underline-offset-4 hover:decoration-solid"
          >
            {monthLabel}
          </button>
        </h2>
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
            // One chip per BPM, not per occurrence: a BPM running at three
            // locations is still one meeting on the calendar, and the badge
            // counts BPMs the same way.
            const groups = groupByEvent(byDay[dayKey(day)] || []);
            return (
              <button
                key={day.toISOString()}
                type="button"
                className={['matchup-day', sameDate(day, today) ? 'is-today' : '', groups.length ? 'has-items' : ''].join(' ').trim()}
                onClick={() => groups.length && setModalDate(day)}
              >
                <span className="matchup-day-head">
                  <span className="matchup-day-number">{day.getDate()}</span>
                  {groups.length ? (
                    <span
                      className="matchup-day-count"
                      aria-label={`${groups.length} ${groups.length === 1 ? 'BPM' : 'BPMs'}`}
                    >
                      {groups.length}
                    </span>
                  ) : null}
                </span>
                <span className="matchup-day-events">
                  {groups.slice(0, 3).map((group) => (
                    <span
                      key={group.key}
                      style={{
                        ['--status-color' as string]:
                          STATUS_COLOR[group.occurrences[0].effective_status] || '#64748b',
                      }}
                    >
                      {group.eventName}
                    </span>
                  ))}
                  {groups.length > 3 ? <span>+{groups.length - 3} more</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* `wb-bpm-day-modal` widens the panel to ~90% of the viewport. It has to
          win over the Modal's own `max-w-[860px]`, which a second Tailwind
          max-width class would not reliably do (Modal joins class strings, it
          does not merge them), so the stylesheet raises its specificity. */}
      <Modal
        open={Boolean(modalDate)}
        title={modalDate ? new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(modalDate) : ''}
        onClose={() => setModalDate(null)}
        contentClassName="wb-bpm-day-modal"
      >
        <div className="wb-bpm-day-list">
          {modalGroups.map((group) => {
            // `picked` is per BPM, not per day: a location picked on another day
            // is not one of this day's, so it falls back to the default.
            const choice = picked[group.eventId];
            const chosen =
              choice && choice !== 'all'
                ? group.occurrences.find((row) => row.id === choice.id)
                : undefined;
            const all = !chosen && group.occurrences.length > 1;
            // In All mode the row reads as the date's first location — its time
            // and status — since that is the anchor the sub-tools open on.
            const target = chosen ?? group.occurrences[0];
            return (
              <div key={group.key} className="wb-bpm-day-item">
                <div className="wb-bpm-day-item-info">
                  <strong>
                    <BpmTitleLink
                      hasAttachments={group.hasAttachments}
                      onOpen={onOpenAttachments ? () => onOpenAttachments(target) : undefined}
                    >
                      {group.eventName}
                    </BpmTitleLink>
                  </strong>
                  <span>{formatOccurrenceTime(target.start_at)}</span>
                  <small>
                    {group.checkedInCount}/{group.guestCount} guests · {group.associateCount} associates
                  </small>
                  <div className="mt-1">
                    <StatusBadge status={target.effective_status} />
                  </div>
                </div>
                <div className="wb-bpm-day-item-actions">
                  <OccurrenceRowActions
                    occurrences={group.occurrences}
                    selected={target}
                    allSelected={all}
                    onSelect={(occurrence) =>
                      setPicked((prev) => ({ ...prev, [group.eventId]: occurrence }))
                    }
                    onSelectAll={() => setPicked((prev) => ({ ...prev, [group.eventId]: 'all' }))}
                    onNavigate={() => setModalDate(null)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      <MonthJumpModal
        open={jumpOpen}
        current={month}
        onClose={() => setJumpOpen(false)}
        onPick={onMonthChange}
      />
    </section>
  );
}

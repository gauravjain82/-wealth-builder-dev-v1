import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@shared/components/ui';
import type { AppointmentListItem, CalendarAppointment, MatchupStatusMeta } from '../types';
import { DayAppointmentsModal } from './day-appointments-modal';

interface MonthCalendarProps {
  month: Date;
  items: CalendarAppointment[];
  appointmentItems?: AppointmentListItem[];
  statuses: MatchupStatusMeta[];
  selectedDate: Date;
  segment?: string;
  personal?: boolean;
  onMonthChange: (date: Date) => void;
  onDateSelect: (date: Date) => void;
  onItemClick?: (id: number) => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDayKey(date: Date) {
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

export function appointmentTitle(item: CalendarAppointment) {
  return item.contact_name || item.trainee_name || `Appointment #${item.id}`;
}

export function assignedName(item: CalendarAppointment, appointment?: AppointmentListItem) {
  return (
    item.assigned_to_name ||
    item.assigned_to_detail?.name ||
    appointment?.assigned_to_name ||
    appointment?.assigned_to_detail?.name ||
    ''
  );
}

export function MonthCalendar({
  month,
  items,
  appointmentItems = [],
  statuses,
  selectedDate,
  segment,
  personal,
  onMonthChange,
  onDateSelect,
  onItemClick,
}: MonthCalendarProps) {
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const days = buildDays(month);
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month);
  const today = new Date();
  const appointmentsById = appointmentItems.reduce<Record<number, AppointmentListItem>>((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
  const itemsByDay = items.reduce<Record<string, CalendarAppointment[]>>((acc, item) => {
    const key = startOfDayKey(new Date(item.start_at));
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
  return (
    <section className="matchup-calendar-shell">
      <div className="matchup-calendar-toolbar">
        <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          <ChevronLeft size={18} />
        </Button>
        <h2>{monthLabel}</h2>
        <Button variant="outline" size="icon" aria-label="Next month" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
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
            const dayItems = itemsByDay[startOfDayKey(day)] || [];
            const isSelected = sameDate(day, selectedDate);
            return (
              <button
                key={day.toISOString()}
                type="button"
                className={[
                  'matchup-day',
                  sameDate(day, today) ? 'is-today' : '',
                  isSelected ? 'is-selected' : '',
                  dayItems.length ? 'has-items' : '',
                ].join(' ').trim()}
                onClick={() => {
                  onDateSelect(day);
                  if (dayItems.length) setModalDate(day);
                }}
              >
                <span className="matchup-day-head">
                  <span className="matchup-day-number">{day.getDate()}</span>
                  {dayItems.length ? (
                    <span className="matchup-day-count" aria-label={`${dayItems.length} appointments`}>
                      {dayItems.length}
                    </span>
                  ) : null}
                </span>
                <span className="matchup-day-events">
                  {dayItems.slice(0, 3).map((item) => (
                    <span key={item.id} style={{ ['--status-color' as string]: item.status_color || '#64748b' }}>
                      {assignedName(item, appointmentsById[item.id]) || appointmentTitle(item)}
                    </span>
                  ))}
                  {dayItems.length > 3 ? <span>+{dayItems.length - 3} more</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <DayAppointmentsModal
        key={modalDate ? startOfDayKey(modalDate) : 'none'}
        date={modalDate}
        items={modalDate ? itemsByDay[startOfDayKey(modalDate)] || [] : []}
        appointmentsById={appointmentsById}
        statuses={statuses}
        segment={segment}
        personal={personal}
        onClose={() => setModalDate(null)}
        onItemClick={(id: number) => {
          setModalDate(null);
          onItemClick?.(id);
        }}
      />
    </section>
  );
}

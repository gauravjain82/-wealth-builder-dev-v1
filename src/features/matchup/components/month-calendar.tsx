import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { formatAppointmentTime } from '../services/matchup-service';
import type { AppointmentListItem, CalendarAppointment, MatchupStatusMeta } from '../types';
import { StatusBadge } from './status-badge';

interface MonthCalendarProps {
  month: Date;
  items: CalendarAppointment[];
  appointmentItems?: AppointmentListItem[];
  statuses: MatchupStatusMeta[];
  selectedDate: Date;
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

function appointmentTitle(item: CalendarAppointment) {
  return item.contact_name || item.trainee_name || `Appointment #${item.id}`;
}

function assignedName(item: CalendarAppointment, appointment?: AppointmentListItem) {
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
  onMonthChange,
  onDateSelect,
  onItemClick,
}: MonthCalendarProps) {
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
  const selectedItems = itemsByDay[startOfDayKey(selectedDate)] || [];

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
        <aside className="matchup-selected-day">
          <h3>{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(selectedDate)}</h3>
          {selectedItems.length === 0 ? (
            <p className="matchup-muted">No visible appointments for this date.</p>
          ) : (
            <div className="matchup-selected-list">
              {selectedItems.map((item) => {
                const trainerName = assignedName(item, appointmentsById[item.id]);
                return (
                  <button key={item.id} type="button" className="matchup-selected-item" onClick={() => onItemClick?.(item.id)}>
                    <div>
                      <strong>{appointmentTitle(item)}</strong>
                      <span>{formatAppointmentTime(item.start_at, { month: undefined, day: undefined })}</span>
                      {trainerName ? <small>Assigned to {trainerName}</small> : null}
                    </div>
                    <StatusBadge status={item.status} label={item.status_label} color={item.status_color} statuses={statuses} />
                  </button>
                );
              })}
            </div>
          )}
        </aside>

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
                onClick={() => onDateSelect(day)}
              >
                <span className="matchup-day-number">{day.getDate()}</span>
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
    </section>
  );
}

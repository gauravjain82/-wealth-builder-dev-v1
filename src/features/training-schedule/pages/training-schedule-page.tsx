import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth';
import { Plan } from '@core/types';
import { roleToPlan } from '@/core/constants/roles';
import { Modal } from '@/shared/components/ui/modal';
import { Button } from '@/shared/components';
import './training-schedule.css';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  color: string;
  zoomLink: string;
  isRecurring: boolean;
  recurrencePattern: string;
  userId: string;
}

interface FormData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  color: string;
  zoomLink: string;
  isRecurring: boolean;
  recurrencePattern: string;
  recurrenceCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const HOURS = Array.from({ length: 16 }, (_, i) => 7 + i);
const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function formatHourSlot(hour: number): string {
  const d = new Date(0, 0, 0, hour, 0);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const DEFAULT_COLORS = [
  { name: 'Blue', value: '#4A90E2' },
  { name: 'Orange', value: '#F5A623' },
  { name: 'Green', value: '#7ED321' },
  { name: 'Red', value: '#D0021B' },
  { name: 'Purple', value: '#9013FE' },
  { name: 'Pink', value: '#E91E63' },
  { name: 'Teal', value: '#00BCD4' },
  { name: 'Amber', value: '#FFC107' },
];

const LS_KEY = 'wb_training_schedule_events';

function loadEvents(): ScheduleEvent[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed: Array<Omit<ScheduleEvent, 'startTime' | 'endTime'> & { startTime: string; endTime: string }> = JSON.parse(raw);
    return parsed.map((e) => ({ ...e, startTime: new Date(e.startTime), endTime: new Date(e.endTime) }));
  } catch {
    return [];
  }
}

function saveEvents(events: ScheduleEvent[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(events));
}

function resolvePlan(user: ReturnType<typeof useAuth>['user']): Plan {
  const primaryRole = user?.roles?.[0];
  if (!primaryRole) return Plan.NewAgent;
  const normalized = primaryRole.toUpperCase().replace(/\s+/g, '_');
  return roleToPlan(normalized) ?? Plan.NewAgent;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TrainingSchedulePage() {
  const { user } = useAuth();
  const plan = resolvePlan(user);
  const isNewAgent = plan === Plan.NewAgent;

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [events, setEvents] = useState<ScheduleEvent[]>(loadEvents);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [formData, setFormData] = useState<FormData>(() => {
    const now = new Date();
    return {
      title: '',
      description: '',
      startTime: formatDateForInput(now),
      endTime: formatDateForInput(now),
      color: DEFAULT_COLORS[0].value,
      zoomLink: '',
      isRecurring: false,
      recurrencePattern: 'weekly',
      recurrenceCount: 4,
    };
  });

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart],
  );

  const isEventVisibleForPlan = (event: ScheduleEvent): boolean => {
    if (plan !== Plan.NewAgent && plan !== Plan.Agent) return true;
    const title = (event?.title || '').toLowerCase();
    if (title.includes('national call')) return true;
    if (title.includes('maxout') && plan !== Plan.NewAgent) return true;
    if (title.includes('product training') && plan !== Plan.NewAgent) return true;
    if (title.includes('abc')) return true;
    if (title.includes('weekly training 29')) return true;
    return false;
  };

  const visibleEvents = useMemo(() => {
    const weekEnd = addDays(currentWeekStart, 7);
    return events
      .filter((e) => e.startTime < weekEnd && e.endTime > currentWeekStart)
      .filter(isEventVisibleForPlan);
  }, [events, currentWeekStart, plan]);

  const goToPreviousWeek = () => setCurrentWeekStart((d) => addDays(d, -7));
  const goToNextWeek = () => setCurrentWeekStart((d) => addDays(d, 7));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date()));

  const openNewEventDialog = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    const endTime = new Date(nextHour);
    endTime.setHours(nextHour.getHours() + 1);
    setFormData({
      title: '',
      description: '',
      startTime: formatDateForInput(nextHour),
      endTime: formatDateForInput(endTime),
      color: DEFAULT_COLORS[0].value,
      zoomLink: '',
      isRecurring: false,
      recurrencePattern: 'weekly',
      recurrenceCount: 4,
    });
    setEditingEvent(null);
    setDialogOpen(true);
  };

  const openEditEventDialog = (event: ScheduleEvent) => {
    if (isNewAgent) {
      alert('Schedule editing is not available for your plan.');
      return;
    }
    setFormData({
      title: event.title,
      description: event.description || '',
      startTime: formatDateForInput(event.startTime),
      endTime: formatDateForInput(event.endTime),
      color: event.color,
      zoomLink: event.zoomLink || '',
      isRecurring: false,
      recurrencePattern: event.recurrencePattern || 'weekly',
      recurrenceCount: 4,
    });
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const generateRecurringDates = (startDate: Date, pattern: string, count: number): Date[] => {
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(startDate.getTime());
      switch (pattern) {
        case 'daily': d.setDate(d.getDate() + i); break;
        case 'weekly': d.setDate(d.getDate() + i * 7); break;
        case 'biweekly': d.setDate(d.getDate() + i * 14); break;
        case 'monthly': d.setMonth(d.getMonth() + i); break;
      }
      return d;
    });
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNewAgent) { alert('Schedule editing is not available for your plan.'); return; }

    const startTime = new Date(formData.startTime);
    const endTime = new Date(formData.endTime);
    const duration = endTime.getTime() - startTime.getTime();
    const userId = user?.id ?? 'local';

    let updated = [...events];

    if (editingEvent) {
      if (formData.isRecurring) {
        const dates = generateRecurringDates(startTime, formData.recurrencePattern, formData.recurrenceCount);
        updated = updated.filter((ev) => ev.id !== editingEvent.id);
        const newEvents: ScheduleEvent[] = dates.map((date) => ({
          id: generateId(),
          title: formData.title,
          description: formData.description,
          startTime: date,
          endTime: new Date(date.getTime() + duration),
          color: formData.color,
          zoomLink: formData.zoomLink,
          isRecurring: true,
          recurrencePattern: formData.recurrencePattern,
          userId,
        }));
        updated = [...updated, ...newEvents];
        alert(`✅ Created ${newEvents.length} recurring meetings.`);
      } else {
        updated = updated.map((ev) =>
          ev.id === editingEvent.id
            ? { ...ev, title: formData.title, description: formData.description, startTime, endTime, color: formData.color, zoomLink: formData.zoomLink }
            : ev,
        );
      }
    } else {
      if (formData.isRecurring) {
        const dates = generateRecurringDates(startTime, formData.recurrencePattern, formData.recurrenceCount);
        const newEvents: ScheduleEvent[] = dates.map((date) => ({
          id: generateId(),
          title: formData.title,
          description: formData.description,
          startTime: date,
          endTime: new Date(date.getTime() + duration),
          color: formData.color,
          zoomLink: formData.zoomLink,
          isRecurring: true,
          recurrencePattern: formData.recurrencePattern,
          userId,
        }));
        updated = [...updated, ...newEvents];
        alert(`✅ Created ${newEvents.length} recurring ${formData.recurrencePattern} meetings.`);
      } else {
        const newEvent: ScheduleEvent = {
          id: generateId(),
          title: formData.title,
          description: formData.description,
          startTime,
          endTime,
          color: formData.color,
          zoomLink: formData.zoomLink,
          isRecurring: false,
          recurrencePattern: formData.recurrencePattern,
          userId,
        };
        updated = [...updated, newEvent];
      }
    }

    setEvents(updated);
    saveEvents(updated);
    setDialogOpen(false);
  };

  const handleDeleteEvent = () => {
    if (!editingEvent) return;
    if (isNewAgent) { alert('Schedule editing is not available for your plan.'); return; }
    if (!window.confirm(`Are you sure you want to delete "${editingEvent.title}"?`)) return;
    const updated = events.filter((ev) => ev.id !== editingEvent.id);
    setEvents(updated);
    saveEvents(updated);
    setDialogOpen(false);
  };

  const getEventStyle = (event: ScheduleEvent, dayStart: Date): React.CSSProperties => {
    const viewStartHour = 7;
    const viewEndHour = 23;
    const totalViewMinutes = (viewEndHour - viewStartHour) * 60;
    const viewStart = new Date(dayStart);
    viewStart.setHours(viewStartHour, 0, 0, 0);
    const viewEnd = new Date(dayStart);
    viewEnd.setHours(viewEndHour, 0, 0, 0);
    if (event.endTime < viewStart || event.startTime > viewEnd) return { display: 'none' };
    const startMs = Math.max(event.startTime.getTime(), viewStart.getTime());
    const endMs = Math.min(event.endTime.getTime(), viewEnd.getTime());
    const minutesFromTop = (startMs - viewStart.getTime()) / 60000;
    const durationMinutes = (endMs - startMs) / 60000;
    const topPercent = (minutesFromTop / totalViewMinutes) * 100;
    const heightPercent = Math.max((durationMinutes / totalViewMinutes) * 100, 3.5);
    return { top: `${topPercent}%`, height: `${heightPercent}%`, backgroundColor: event.color };
  };

  const getEventsForDay = (date: Date): ScheduleEvent[] => {
    const d = new Date(date);
    const dayStart = new Date(d.setHours(0, 0, 0, 0));
    const dayEnd = new Date(d.setHours(23, 59, 59, 999));
    return visibleEvents.filter((e) => e.startTime < dayEnd && e.endTime > dayStart);
  };

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const field = (key: keyof FormData, val: string | boolean | number) =>
    setFormData((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="training-schedule">
      {/* Header */}
      <div className="schedule-header">
        <div className="header-left">
          <h1 className="schedule-title">Training Schedule</h1>
          <div className="timezone-info">Timezone: {timezone}</div>
        </div>
        <div className="header-right">
          {!isNewAgent && (
            <Button onClick={openNewEventDialog} className="add-event-btn">
              + Add Meeting
            </Button>
          )}
        </div>
      </div>

      {/* Week Navigation */}
      <div className="week-nav">
        <Button variant="outline" onClick={goToPreviousWeek}>← Previous Week</Button>
        <Button variant="outline" onClick={goToToday}>Today</Button>
        <Button variant="outline" onClick={goToNextWeek}>Next Week →</Button>
        <div className="week-range">
          {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' – '}
          {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid-container">
        <div className="calendar-grid">
          {/* Header Row */}
          <div className="grid-header">
            <div className="time-column-header">Time</div>
            {weekDates.map((date, index) => (
              <div key={index} className="day-header">
                <div className="day-name">{DAYS_OF_WEEK[index]}</div>
                <div className={`day-number ${date.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                  {date.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="grid-body">
            <div className="time-column">
              {HOURS.map((hour) => (
                <div key={hour} className="time-slot">{formatHourSlot(hour)}</div>
              ))}
            </div>

            {weekDates.map((date, dayIndex) => (
              <div key={dayIndex} className="day-column">
                {HOURS.map((hour) => (
                  <div key={hour} className="hour-cell" />
                ))}
                <div className="events-container">
                  {getEventsForDay(new Date(date)).map((event) => (
                    <div
                      key={event.id}
                      className="event-block event-block-fancy"
                      style={getEventStyle(event, new Date(date))}
                      onClick={(e) => {
                        if (isNewAgent) return;
                        if (!(e.target as HTMLElement).closest('.event-join-btn')) {
                          openEditEventDialog(event);
                        }
                      }}
                      title={`${event.title}\n${formatTime(event.startTime)} - ${formatTime(event.endTime)}`}
                    >
                      <div className="event-card-content">
                        <div className="event-title-fancy">
                          {event.isRecurring && (
                            <span className="recurring-badge">
                              {event.recurrencePattern === 'weekly' ? '🔁 Weekly'
                                : event.recurrencePattern === 'monthly' ? '🔁 Monthly'
                                : event.recurrencePattern === 'daily' ? '🔁 Daily'
                                : event.recurrencePattern === 'biweekly' ? '🔁 Bi-weekly'
                                : '🔁'}
                            </span>
                          )}
                          <span className="event-title-text">{event.title}</span>
                        </div>
                        <div className="event-time-fancy">
                          <span className="time-icon">🕐</span>
                          <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                        </div>
                        {event.description && (
                          <div className="event-description-fancy">
                            {event.description.length > 50
                              ? event.description.substring(0, 50) + '...'
                              : event.description}
                          </div>
                        )}
                        {event.zoomLink && (
                          <a
                            href={event.zoomLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="event-join-btn event-join-btn-fancy"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="join-icon">📹</span>
                            <span className="join-text">Join Zoom</span>
                          </a>
                        )}
                      </div>
                      <div className="event-card-shine" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <Modal
        open={dialogOpen}
        title={editingEvent ? 'Edit Meeting' : 'Add New Meeting'}
        onClose={() => setDialogOpen(false)}
        contentClassName="event-dialog-modal"
      >
        <form onSubmit={handleSaveEvent} className="event-form">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => field('title', e.target.value)}
              required
              placeholder="Meeting title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => field('description', e.target.value)}
              placeholder="Meeting description"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime">Start Time *</label>
              <input
                id="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => field('startTime', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="endTime">End Time *</label>
              <input
                id="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => field('endTime', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Color</label>
            <div className="color-picker">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`color-option ${formData.color === color.value ? 'selected' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => field('color', color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="zoomLink">Zoom Meeting Link (Optional)</label>
            <input
              id="zoomLink"
              type="url"
              value={formData.zoomLink}
              onChange={(e) => field('zoomLink', e.target.value)}
              placeholder="https://zoom.us/j/..."
            />
            {formData.zoomLink && (
              <a href={formData.zoomLink} target="_blank" rel="noopener noreferrer" className="zoom-link-preview">
                Open Zoom Link
              </a>
            )}
          </div>

          <div className="form-group recurring-toggle">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => field('isRecurring', e.target.checked)}
              />
              <span>{editingEvent ? 'Convert to recurring meeting series' : 'Make this a recurring meeting'}</span>
            </label>
          </div>

          {formData.isRecurring && (
            <div className="recurring-options">
              <div className="form-group">
                <label htmlFor="recurrencePattern">Repeat</label>
                <select
                  id="recurrencePattern"
                  value={formData.recurrencePattern}
                  onChange={(e) => field('recurrencePattern', e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly (Every 2 weeks)</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="recurrenceCount">Number of Occurrences</label>
                <input
                  id="recurrenceCount"
                  type="number"
                  min="1"
                  max="52"
                  value={formData.recurrenceCount}
                  onChange={(e) => field('recurrenceCount', parseInt(e.target.value, 10))}
                />
                <div className="recurrence-preview">
                  {formData.recurrencePattern === 'daily' && `Will create ${formData.recurrenceCount} daily meetings`}
                  {formData.recurrencePattern === 'weekly' && `Will create ${formData.recurrenceCount} weekly meetings`}
                  {formData.recurrencePattern === 'biweekly' && `Will create ${formData.recurrenceCount} bi-weekly meetings`}
                  {formData.recurrencePattern === 'monthly' && `Will create ${formData.recurrenceCount} monthly meetings`}
                </div>
              </div>
            </div>
          )}

          <div className="form-footer">
            {editingEvent && (
              <Button type="button" variant="destructive" onClick={handleDeleteEvent}>
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingEvent ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

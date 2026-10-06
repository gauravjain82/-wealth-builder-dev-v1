import { useSearchParams } from 'react-router-dom';
import { BigEventSurface } from '../components/big-event-surface';
import EventCheckinPage from './event-checkin-page';
import EventSessionsPage from './event-sessions-page';

type View = 'event' | 'sessions';

const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'event', label: 'Event check-in' },
  { id: 'sessions', label: 'Sessions' },
];

/**
 * Sidebar "Check-in": pick an event, then run its door — the event's own
 * check-in (registration), or one of its sessions. The choice lives in the URL
 * (`?view=sessions`) so a door device can be bookmarked straight to it.
 */
export default function CheckinPage() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'sessions' ? 'sessions' : 'event';

  const select = (next: View) => {
    const updated = new URLSearchParams(params);
    if (next === 'event') updated.delete('view');
    else updated.set('view', next);
    setParams(updated, { replace: true });
  };

  return (
    <BigEventSurface
      screen="checkin"
      title="Check-in"
      subtitle={
        view === 'sessions'
          ? 'Track attendance for each session, separately from event check-in'
          : 'Scan tickets at the door and track who has arrived'
      }
    >
      {(eventId) => (
        <div className="space-y-6">
          <div
            role="tablist"
            aria-label="Check-in type"
            className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5"
          >
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                onClick={() => select(v.id)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  view === v.id
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {view === 'sessions' ? (
            <EventSessionsPage key={eventId} eventId={eventId} />
          ) : (
            <EventCheckinPage eventId={eventId} />
          )}
        </div>
      )}
    </BigEventSurface>
  );
}

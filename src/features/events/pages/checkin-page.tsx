import { BigEventSurface } from '../components/big-event-surface';
import EventCheckinPage from './event-checkin-page';

/** Sidebar "Check-in": pick an event, then run the door for it. */
export default function CheckinPage() {
  return (
    <BigEventSurface title="Check-in" subtitle="Scan tickets at the door and track who has arrived">
      {(eventId) => <EventCheckinPage eventId={eventId} />}
    </BigEventSurface>
  );
}

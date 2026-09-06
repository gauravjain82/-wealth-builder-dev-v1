import { BigEventSurface } from '../components/big-event-surface';
import EventPermissionsPage from './event-permissions-page';

/** Sidebar "Permissions": pick an event, then manage its delegated access. */
export default function PermissionsPage() {
  return (
    <BigEventSurface title="Permissions" subtitle="Grant users access to just one event — no platform-wide permission needed">
      {(eventId) => <EventPermissionsPage eventId={eventId} />}
    </BigEventSurface>
  );
}

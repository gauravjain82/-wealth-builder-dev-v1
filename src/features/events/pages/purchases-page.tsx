import { BigEventSurface } from '../components/big-event-surface';
import EventOrdersPage from './event-orders-page';

/** Sidebar "Purchases": pick an event, then manage its orders and tickets. */
export default function PurchasesPage() {
  return (
    <BigEventSurface title="Purchases" subtitle="Orders, tickets, and reports">
      {(eventId) => <EventOrdersPage eventId={eventId} />}
    </BigEventSurface>
  );
}

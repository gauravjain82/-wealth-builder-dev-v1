import { BigEventSurface } from '../components/big-event-surface';
import EventRecognitionPage from './event-recognition-page';

/** Sidebar "Recognition Orders": pick an event, then manage its recognition. */
export default function RecognitionPage() {
  return (
    <BigEventSurface title="Recognition Orders" subtitle="Categories and the people recognised in each">
      {(eventId) => <EventRecognitionPage eventId={eventId} />}
    </BigEventSurface>
  );
}

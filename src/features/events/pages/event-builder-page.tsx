import { useParams } from 'react-router-dom';
import { Heading, LoadingState, Text } from '@shared/components';
import { useEventBuilder } from '../hooks/use-event-builder';
import { EventBuilderShell } from '../components/builder/event-builder-shell';
import { BuilderTabContent } from '../components/builder/builder-tab-content';
import { EventSubnav } from '../components/event-subnav';

export default function EventBuilderPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const { event, loading, error, saving, activeTab, setActiveTab, saveTab, missingRequiredFields } =
    useEventBuilder(id);

  if (loading) {
    return (
      <div className="space-y-6">
        {Number.isFinite(id) ? <EventSubnav eventId={id} /> : null}
        <LoadingState />
      </div>
    );
  }
  if (error) return <Text variant="muted">Error: {error}</Text>;
  if (!event) return <Text variant="muted">Event not found</Text>;

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h1">
          {event.name || 'Untitled event'}
        </Heading>
        <Text variant="muted">
          {event.status} · /event/{event.shortcut}
        </Text>
      </div>
      <EventSubnav eventId={id} />
      <EventBuilderShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        saving={saving}
        missingRequiredFields={missingRequiredFields}
      >
        <BuilderTabContent
          activeTab={activeTab}
          event={event}
          saving={saving}
          onSave={saveTab}
        />
      </EventBuilderShell>
    </div>
  );
}

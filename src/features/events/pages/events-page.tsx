import { Heading, Text } from '@shared/components/ui';

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h1">Events</Heading>
        <Text variant="muted">
          Browse and register for upcoming events
        </Text>
      </div>
      
      <Text variant="muted" align="center" className="py-12">
        No events scheduled at this time. Check back soon!
      </Text>
    </div>
  );
}

import type { ReactNode } from 'react';
import { ErrorState, Heading, LoadingState, Select, Text } from '@shared/components';
import { useBigEventSelection } from '../hooks/use-big-event-selection';
import type { BigEventScreen } from '../types/access';

interface BigEventSurfaceProps {
  title: string;
  subtitle?: string;
  /** The screen being shown: the picker lists only the events it opens for. */
  screen: BigEventScreen;
  /** Rendered once an event is selected; receives the chosen event id. */
  children: (eventId: number) => ReactNode;
}

/**
 * Shell for the top-level Big Event screens reached from the sidebar. Unlike the
 * in-event pages (which read the id from the URL), these are event-agnostic: the
 * shell provides an event picker and hands the selected id to its child screen.
 */
export function BigEventSurface({ title, subtitle, screen, children }: BigEventSurfaceProps) {
  const { events, selectedId, setSelectedId, loading, error } = useBigEventSelection(screen);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Heading as="h1" variant="h1">
            {title}
          </Heading>
          {subtitle ? <Text variant="muted">{subtitle}</Text> : null}
        </div>
        {events.length > 0 ? (
          <div className="min-w-[240px]">
            <Text variant="muted" className="mb-1 block text-xs uppercase tracking-wide">
              Event
            </Text>
            <Select
              value={selectedId != null ? String(selectedId) : ''}
              onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            >
              {events.map((event) => (
                <option key={event.id} value={String(event.id)}>
                  {event.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} />
      ) : selectedId == null ? (
        <Text variant="muted">No events here yet. Events you create, or are given access to, appear here.</Text>
      ) : (
        children(selectedId)
      )}
    </div>
  );
}

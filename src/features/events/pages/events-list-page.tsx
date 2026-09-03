import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Heading, Input, LoadingState, Select, Text } from '@shared/components';
import { useToastStore } from '@/store';
import { eventService } from '../services/event-service';
import type { BigEvent, BigEventListItem } from '../types/event';
import { EventListTable } from '../components/event-list-table';
import { AddEventModal } from '../components/add-event-modal';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function EventsListPage() {
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);
  const [events, setEvents] = useState<BigEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await eventService.list({ status: status || undefined, search: search || undefined });
      setEvents(response.results);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load events' });
    } finally {
      setLoading(false);
    }
  }, [status, search, addToast]);

  // Debounce so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  const openBuilder = (event: Pick<BigEvent, 'id'>) => navigate(`/events/${event.id}/builder`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Heading as="h1" variant="h1">
            Events
          </Heading>
          <Text variant="muted">Manage events, tickets, and registrations</Text>
        </div>
        <Button onClick={() => setAddOpen(true)}>Add New Event</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or shortcut…"
          className="max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[200px]">
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {loading ? <LoadingState /> : <EventListTable events={events} onOpen={openBuilder} />}

      <AddEventModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(event) => {
          setAddOpen(false);
          openBuilder(event);
        }}
      />
    </div>
  );
}

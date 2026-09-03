import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Button,
  ErrorState,
  Heading,
  Input,
  LoadingState,
  Select,
  Text,
} from '@shared/components';
import { useToastStore } from '@/store';
import { useCheckIn } from '../hooks/use-check-in';
import { eventService } from '../services/event-service';
import { checkinService } from '../services/checkin-service';
import { EventSubnav } from '../components/event-subnav';
import { CheckinStatsCards } from '../components/checkin-stats-cards';
import { CheckinScanBox } from '../components/checkin-scan-box';
import { AttendeeTable } from '../components/attendee-table';
import type { BigEvent } from '../types/event';
import type { CheckinAttendee } from '../types/checkin';

const ARRIVED_OPTIONS = [
  { value: '', label: 'Everyone' },
  { value: 'true', label: 'Arrived' },
  { value: 'false', label: 'Not yet arrived' },
];

export default function EventCheckinPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const addToast = useToastStore((state) => state.addToast);
  const {
    attendees,
    count,
    stats,
    filters,
    setFilters,
    loading,
    error,
    checkIn,
    undoCheckIn,
    refetch,
  } = useCheckIn(id);

  const [event, setEvent] = useState<BigEvent | null>(null);
  const [search, setSearch] = useState('');
  const [busyTicketId, setBusyTicketId] = useState<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    void eventService
      .get(id)
      .then(setEvent)
      .catch(() => setEvent(null));
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => setFilters({ search: search || undefined }), 300);
    return () => clearTimeout(timer);
  }, [search, setFilters]);

  const runRowAction = async (
    attendee: CheckinAttendee,
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setBusyTicketId(attendee.id);
    try {
      await action();
      addToast({ type: 'success', message: successMessage });
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Action failed' });
    } finally {
      setBusyTicketId(null);
    }
  };

  const shortcut = event?.shortcut || 'event';

  const download = async (type: 'xlsx' | 'pdf') => {
    try {
      await checkinService.exportRoster(id, shortcut, type, filters);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Export failed' });
    }
  };

  const print = async () => {
    try {
      await checkinService.printRoster(id, filters);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Print failed' });
    }
  };

  if (!Number.isFinite(id)) {
    return <Text variant="muted">Invalid event.</Text>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h1">
          {event?.name || 'Check-in'}
        </Heading>
        <Text variant="muted">Scan tickets at the door and track who has arrived</Text>
      </div>
      <EventSubnav eventId={id} />

      <CheckinStatsCards stats={stats} />
      <CheckinScanBox onScan={checkIn} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, ticket, invoice…"
            className="max-w-xs"
          />
          <Select
            value={filters.arrived === undefined ? '' : String(filters.arrived)}
            onChange={(e) =>
              setFilters({
                arrived: e.target.value === '' ? undefined : e.target.value === 'true',
              })
            }
            className="max-w-[180px]"
          >
            {ARRIVED_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void download('xlsx')}>
            Excel
          </Button>
          <Button type="button" variant="outline" onClick={() => void download('pdf')}>
            PDF
          </Button>
          <Button type="button" variant="outline" onClick={() => void print()}>
            Print
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} onRetry={() => void refetch()} />
      ) : (
        <AttendeeTable
          attendees={attendees}
          count={count}
          page={filters.page ?? 1}
          busyTicketId={busyTicketId}
          onPageChange={(page) => setFilters({ page })}
          onCheckIn={(attendee) =>
            void runRowAction(
              attendee,
              () => checkIn({ ticket_id: attendee.id }),
              `${attendee.holder_name || attendee.ticket_number} checked in.`,
            )
          }
          onUndo={(attendee) =>
            void runRowAction(
              attendee,
              () => undoCheckIn(attendee.id),
              `Check-in reversed for ${attendee.holder_name || attendee.ticket_number}.`,
            )
          }
        />
      )}
    </div>
  );
}

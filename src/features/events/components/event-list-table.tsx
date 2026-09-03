import { Badge } from '@shared/components';
import { Link } from 'react-router-dom';
import type { BigEventListItem } from '../types/event';

interface EventListTableProps {
  events: BigEventListItem[];
  onOpen: (event: BigEventListItem) => void;
}

type BadgeVariant = 'secondary' | 'success' | 'outline';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  DRAFT: 'secondary',
  PUBLISHED: 'success',
  ARCHIVED: 'outline',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Read-only table of events; rows open the builder. */
export function EventListTable({ events, onOpen }: EventListTableProps) {
  if (events.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
        No events yet. Create your first event to get started.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-white/60">
            <th className="px-3 py-2">Event</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Starts</th>
            <th className="px-3 py-2">Ends</th>
            <th className="px-3 py-2">Shortcut</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.id}
              onClick={() => onOpen(event)}
              className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                {event.name || 'Untitled event'}
              </td>
              <td className="px-3 py-2">
                <Badge variant={STATUS_VARIANT[event.status] ?? 'outline'}>{event.status}</Badge>
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-white/70">
                {formatDate(event.begin_at)}
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-white/70">
                {formatDate(event.end_at)}
              </td>
              <td className="px-3 py-2 text-slate-500 dark:text-white/50">{event.shortcut}</td>
              <td className="px-3 py-2 text-right">
                <Link
                  to={`/events/${event.id}/orders`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Purchases
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

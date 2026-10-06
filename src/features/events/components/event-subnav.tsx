import { NavLink } from 'react-router-dom';
import { useEventsAccess } from '../hooks/use-events-access';
import type { BigEventScreen } from '../types/access';

interface EventSubnavProps {
  eventId: number;
}

// `screen: null` is open to everyone: My tickets lists the viewer's own tickets.
const LINKS: Array<{ suffix: string; label: string; screen: BigEventScreen | null }> = [
  { suffix: 'builder', label: 'Builder', screen: 'builder' },
  { suffix: 'orders', label: 'Purchases', screen: 'purchases' },
  { suffix: 'my-tickets', label: 'My tickets', screen: null },
  { suffix: 'checkin', label: 'Check-in', screen: 'checkin' },
  { suffix: 'sessions', label: 'Sessions', screen: 'checkin' },
  { suffix: 'recognition', label: 'Recognition', screen: 'recognition' },
  { suffix: 'emails', label: 'Emails', screen: 'emails' },
  { suffix: 'questions', label: 'Questions', screen: 'questions' },
  { suffix: 'reviews', label: 'Reviews', screen: 'builder' },
  { suffix: 'access', label: 'Access', screen: 'permissions' },
];

/**
 * In-event navigation across the builder and management surfaces. Shows only the
 * screens the viewer can open for this event — through a platform-wide grant or a
 * per-event one. Gated links stay hidden while access loads, so none flashes in and
 * out; if access fails to load every link shows, since the backend decides each
 * request regardless.
 */
export function EventSubnav({ eventId }: EventSubnavProps) {
  const { data: access, isError } = useEventsAccess();
  const delegated = access?.delegations.find((row) => row.event === eventId)?.surfaces ?? [];
  const links = isError
    ? LINKS
    : LINKS.filter(
        (link) =>
          link.screen === null ||
          Boolean(access?.global_surfaces[link.screen]) ||
          delegated.includes(link.screen),
      );

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-white/10">
      {links.map((link) => (
        <NavLink
          key={link.suffix}
          to={`/events/${eventId}/${link.suffix}`}
          className={({ isActive }) =>
            `whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

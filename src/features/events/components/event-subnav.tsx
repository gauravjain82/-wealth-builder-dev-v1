import { NavLink } from 'react-router-dom';

interface EventSubnavProps {
  eventId: number;
}

const LINKS: Array<{ suffix: string; label: string }> = [
  { suffix: 'builder', label: 'Builder' },
  { suffix: 'orders', label: 'Purchases' },
  { suffix: 'my-tickets', label: 'My tickets' },
  { suffix: 'checkin', label: 'Check-in' },
  { suffix: 'recognition', label: 'Recognition' },
  { suffix: 'emails', label: 'Emails' },
  { suffix: 'questions', label: 'Questions' },
  { suffix: 'access', label: 'Access' },
];

/** In-event navigation across the builder and management surfaces. */
export function EventSubnav({ eventId }: EventSubnavProps) {
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-white/10">
      {LINKS.map((link) => (
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

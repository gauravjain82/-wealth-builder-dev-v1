interface TicketCountPillsProps {
  total: number;
  assigned: number;
  unassigned: number;
  transferred: number;
}

/**
 * "Tickets 6 · Assigned 1 · Not assigned 4 · Transferred 1" with each number
 * highlighted in its status colour — the order pop-up's count line.
 * Transferred is shown only when there are any.
 */
export function TicketCountPills({
  total,
  assigned,
  unassigned,
  transferred,
}: TicketCountPillsProps) {
  const items: Array<{ label: string; value: number; tone: string }> = [
    { label: 'Tickets', value: total, tone: 'bg-slate-700 text-white dark:bg-white dark:text-slate-900' },
    { label: 'Assigned', value: assigned, tone: 'bg-green-500 text-white' },
    { label: 'Not assigned', value: unassigned, tone: 'bg-yellow-500 text-white' },
    ...(transferred ? [{ label: 'Transferred', value: transferred, tone: 'bg-blue-500 text-white' }] : []),
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-white/80">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          {item.label}
          <span className={`min-w-[1.75rem] rounded-full px-2 py-0.5 text-center text-sm font-bold ${item.tone}`}>
            {item.value}
          </span>
        </span>
      ))}
    </div>
  );
}

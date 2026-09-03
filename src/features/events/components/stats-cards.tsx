import { Card, CardContent, Text } from '@shared/components';
import { formatPrice } from '../utils/public-pricing';
import type { ReportSummary } from '../types/reports';

interface StatsCardsProps {
  summary: ReportSummary;
}

interface CardSpec {
  label: string;
  value: string;
  hint?: string;
}

/** Dashboard stat cards: tickets, assignment, collected / projected. */
export function StatsCards({ summary }: StatsCardsProps) {
  const currency = summary.currency || 'USD';
  const cards: CardSpec[] = [
    {
      label: 'Tickets sold',
      value: String(summary.total_tickets),
      hint:
        summary.remaining_capacity == null
          ? 'Unlimited capacity'
          : `${summary.remaining_capacity} remaining`,
    },
    {
      label: 'Assigned / unassigned',
      value: `${summary.assigned} / ${summary.unassigned}`,
      hint: `${summary.transferred} transferred · ${summary.checked_in} checked in`,
    },
    {
      label: 'Collected',
      value: formatPrice(summary.collected, currency),
      hint: `${summary.pending_count} pending · ${formatPrice(summary.pending, currency)}`,
    },
    {
      label: 'Projected',
      value: formatPrice(summary.projected, currency),
      hint: `${summary.unassigned_smd_count} unassigned SMD`,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <Text variant="muted" className="text-xs uppercase tracking-wide">
              {card.label}
            </Text>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
              {card.value}
            </p>
            {card.hint ? (
              <Text variant="muted" className="mt-1 text-xs">
                {card.hint}
              </Text>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

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

/**
 * Dashboard stat cards. Tickets and purchases are split by who sold them (WB vs
 * the partner the event imports from); ticket status uses the shown statuses
 * (Assigned / Not assigned / Transferred, which add up to the total). Money is
 * what WB collected — a partner's export carries no amounts, so it is excluded and
 * the card says so.
 */
export function StatsCards({ summary }: StatsCardsProps) {
  const currency = summary.currency || 'USD';
  const partner = summary.external_provider || '';
  const imported = summary.external_tickets ?? 0;
  const wbTickets = summary.wb_tickets ?? summary.total_tickets - imported;
  const cards: CardSpec[] = [
    {
      label: 'Tickets',
      value: summary.total_tickets.toLocaleString(),
      hint: partner
        ? `${imported.toLocaleString()} from ${partner} · ${wbTickets.toLocaleString()} sold through WB`
        : summary.remaining_capacity == null
          ? 'Unlimited capacity'
          : `${summary.remaining_capacity} remaining`,
    },
    {
      label: 'Purchases',
      value: ((summary.external_purchases ?? 0) + summary.order_count).toLocaleString(),
      hint: partner
        ? `${(summary.external_purchases ?? 0).toLocaleString()} ${partner} · ${summary.order_count.toLocaleString()} WB`
        : `${summary.pending_count} pending payment`,
    },
    {
      label: 'Assigned / not assigned / transferred',
      value: `${summary.assigned} / ${summary.unassigned} / ${summary.transferred}`,
      hint: `${summary.checked_in.toLocaleString()} checked in`,
    },
    {
      label: 'Collected through WB',
      value: formatPrice(summary.collected, currency),
      hint: partner
        ? `${partner} amounts aren't in its export · projected ${formatPrice(summary.projected, currency)}`
        : `${summary.pending_count} pending · projected ${formatPrice(summary.projected, currency)}`,
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

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
 * (Assigned / Not assigned / Transferred, which add up to the total). Revenue is
 * WB's own collections plus what each partner collected (from the partner's
 * transactions export); the two are never merged into one figure without the
 * split beside it. A server without partner revenue shows WB collections only.
 */
export function StatsCards({ summary }: StatsCardsProps) {
  const currency = summary.currency || 'USD';
  const partner = summary.external_provider || '';
  const imported = summary.external_tickets ?? 0;
  const wbTickets = summary.wb_tickets ?? summary.total_tickets - imported;
  const partners = summary.external_partners ?? [];
  const unpriced = summary.external_unpriced_purchases ?? 0;
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
    summary.total_revenue !== undefined && partners.length
      ? {
          label: 'Total revenue',
          value: formatPrice(summary.total_revenue, currency),
          hint: [
            `WB ${formatPrice(summary.collected, currency)}`,
            ...partners.map((p) => `${p.label} ${formatPrice(p.revenue, currency)}`),
            unpriced ? `${unpriced.toLocaleString()} partner purchases have no price yet` : '',
          ]
            .filter(Boolean)
            .join(' · '),
        }
      : {
          label: 'Collected through WB',
          value: formatPrice(summary.collected, currency),
          hint: partner
            ? `No ${partner} payment data imported yet · projected ${formatPrice(summary.projected, currency)}`
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

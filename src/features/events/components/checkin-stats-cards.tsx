import { Card, CardContent, Text } from '@shared/components';
import type { CheckinStats } from '../types/checkin';

interface CheckinStatsCardsProps {
  stats: CheckinStats;
}

/** Door counters: expected, arrived (with rate), remaining, and unassigned. */
export function CheckinStatsCards({ stats }: CheckinStatsCardsProps) {
  const rate = stats.expected ? Math.round((stats.arrived / stats.expected) * 100) : 0;
  const cards: Array<{ label: string; value: string; hint?: string }> = [
    {
      label: 'Expected',
      value: String(stats.expected),
      hint: `${stats.assigned} named · ${stats.unassigned} unassigned`,
    },
    { label: 'Arrived', value: String(stats.arrived), hint: `${rate}% of expected` },
    { label: 'Not yet arrived', value: String(stats.remaining) },
    {
      label: 'Unassigned tickets',
      value: String(stats.unassigned),
      hint: stats.unassigned ? 'No name on the badge yet' : 'Every ticket is named',
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

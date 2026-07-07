import { CheckCircle2, Clock3, RefreshCcw, TrendingUp, UserX } from 'lucide-react';
import type { MatchupMetrics } from '../types';

interface MetricsCardsProps {
  metrics: MatchupMetrics;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards = [
    { label: 'Total', value: metrics.total, icon: TrendingUp },
    { label: 'Done', value: metrics.done, icon: CheckCircle2 },
    { label: 'Rescheduled', value: metrics.rescheduled, icon: RefreshCcw },
    { label: 'Not Interested', value: metrics.not_interested, icon: UserX },
    { label: 'Open Requests', value: metrics.by_status.REQUESTED || 0, icon: Clock3 },
  ];

  return (
    <div className="matchup-metrics-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="matchup-metric-card">
            <Icon size={18} />
            <div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          </div>
        );
      })}
    </div>
  );
}

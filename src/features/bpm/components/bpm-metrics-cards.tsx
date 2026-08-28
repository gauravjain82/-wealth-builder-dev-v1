import { CalendarClock, CheckCircle2, UserPlus, XCircle } from 'lucide-react';
import type { BPMOccurrence } from '../types';

interface BPMMetricsCardsProps {
  occurrences: BPMOccurrence[];
}

export function BPMMetricsCards({ occurrences }: BPMMetricsCardsProps) {
  const scheduled = occurrences.filter((o) => o.status === 'SCHEDULED').length;
  const guests = occurrences.reduce((sum, o) => sum + o.guest_count, 0);
  const checkedIn = occurrences.reduce((sum, o) => sum + o.checked_in_count, 0);
  const cancelled = occurrences.filter((o) => o.status === 'CANCELLED').length;

  const cards = [
    { label: 'Scheduled', value: scheduled, icon: CalendarClock },
    { label: 'Guests Invited', value: guests, icon: UserPlus },
    { label: 'Checked In', value: checkedIn, icon: CheckCircle2 },
    { label: 'Cancelled', value: cancelled, icon: XCircle },
  ];

  return (
    <div className="matchup-metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
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

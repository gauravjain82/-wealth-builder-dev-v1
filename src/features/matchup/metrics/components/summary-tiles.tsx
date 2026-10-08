import type { CountMode, MetricsBlock } from '../types';
import { rate } from './format';

interface SummaryTilesProps {
  summary: MetricsBlock;
  mode: CountMode;
}

/** Headline numbers for the current level and section. */
export function SummaryTiles({ summary, mode }: SummaryTilesProps) {
  const unit = mode === 'prospects' ? 'Prospects' : 'Appointments';
  const tiles = [
    { label: unit, value: summary.total, hint: `${summary.agents} agents` },
    { label: 'Showed up', value: summary.showed, hint: `${rate(summary.rates.show)} of ${unit.toLowerCase()}` },
    { label: 'Form pending', value: summary.overall.result_pending, hint: 'past, no result filed' },
    { label: 'No trainer / not accepted', value: summary.overall.no_trainer + summary.overall.not_accepted, hint: 'requests left unanswered' },
    { label: 'FNA', value: summary.outcomes.fna, hint: `${rate(summary.rates.fna)} of ${unit.toLowerCase()}` },
    { label: 'AMA', value: summary.outcomes.ama, hint: `${rate(summary.rates.ama)} of ${unit.toLowerCase()}` },
    { label: 'Sales', value: summary.outcomes.sale, hint: `${summary.outcomes.referrals} referrals` },
    { label: 'Booked by new recruits', value: summary.new_recruit_bookings, hint: 'AMA date in this window' },
  ];
  return (
    <div className="mm-tiles">
      {tiles.map((tile) => (
        <div key={tile.label} className="mm-tile">
          <span>{tile.label}</span>
          <strong>{tile.value.toLocaleString()}</strong>
          <small>{tile.hint}</small>
        </div>
      ))}
      {summary.unlinked > 0 && (
        <p className="mm-note">
          {summary.unlinked} appointment{summary.unlinked === 1 ? '' : 's'} had no prospect linked and
          {' '}cannot be counted per prospect.
        </p>
      )}
    </div>
  );
}

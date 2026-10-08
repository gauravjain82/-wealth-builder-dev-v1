import { ChevronRight } from 'lucide-react';

import type { CountMode, MetricsBlock, MetricsSection } from '../types';
import { CountUp } from './count-up';
import { percent } from './format';
import { OutcomeBar, OutcomeLegend } from './outcome-bar';
import { ShowRateGauge } from './show-rate-gauge';

interface OutcomeHeroProps {
  summary: MetricsBlock;
  mode: CountMode;
  section: MetricsSection;
}

/**
 * The page's answer in one band: how many were booked, how many showed up,
 * and what those who showed up turned into.
 *
 * FNA, AMA and Sale are separate yes/no answers on the results form — AMA
 * (joined as an agent) and Sale (became a client) are branches, not steps
 * in one chain — so each is shown as a share of those who showed up rather
 * than as a conversion from the stage before it.
 */
export function OutcomeHero({ summary, mode, section }: OutcomeHeroProps) {
  const unit = mode === 'prospects' ? 'prospects' : 'appointments';
  const branches = [
    { key: 'fna', label: 'FNA', value: summary.outcomes.fna },
    { key: 'ama', label: 'AMA', value: summary.outcomes.ama },
    { key: 'sale', label: 'Sales', value: summary.outcomes.sale },
  ];

  return (
    <section className="mm-hero-band" aria-label="Headline results">
      <div className="mm-hero-top">
        <ShowRateGauge rate={summary.rates.show} showed={summary.showed} total={summary.total} unit={unit} />

        <div className="mm-chain">
          <div className="mm-stage">
            <span>Booked</span>
            <strong><CountUp value={summary.total} /></strong>
            <small>{unit} · {summary.agents.toLocaleString()} agents</small>
          </div>
          <ChevronRight className="mm-chain-arrow" size={20} aria-hidden="true" />
          <div className="mm-stage">
            <span>Showed up</span>
            <strong><CountUp value={summary.showed} /></strong>
            <small>{percent(summary.showed, summary.total)} of booked</small>
          </div>
          <ChevronRight className="mm-chain-arrow" size={20} aria-hidden="true" />
          <div className="mm-branches">
            <span className="mm-branches-title">Of those who showed up</span>
            {branches.map((branch) => {
              const share = summary.showed ? Math.min(branch.value / summary.showed, 1) * 100 : 0;
              return (
                <div key={branch.key} className="mm-branch">
                  <span>{branch.label}</span>
                  <strong><CountUp value={branch.value} /></strong>
                  <span className="mm-meter" aria-hidden="true">
                    <span style={{ width: `${share}%` }} />
                  </span>
                  <small>{percent(branch.value, summary.showed)}</small>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mm-hero-split">
        <div className="mm-hero-split-head">
          <span>What happened to everyone booked</span>
          <OutcomeLegend section={section} />
        </div>
        <OutcomeBar counts={summary.overall} section={section} label="Everyone booked" size="lg" />
      </div>

      <p className="mm-hero-meta">
        <span><strong>{summary.outcomes.referrals.toLocaleString()}</strong> referrals</span>
        <span><strong>{summary.new_recruit_bookings.toLocaleString()}</strong> booked by new recruits</span>
      </p>
    </section>
  );
}

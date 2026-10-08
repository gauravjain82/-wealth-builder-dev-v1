import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import type { CountMode, MetricsBlock, MetricsSection, TrendCounts, TrendWeek } from '../types';
import { CountUp } from './count-up';
import { Delta } from './delta';
import { MIN_SAMPLE, percent } from './format';
import { OutcomeBar, OutcomeLegend } from './outcome-bar';
import { ShowRateGauge } from './show-rate-gauge';
import { Sparkline } from './sparkline';
import { countSeries, rateSeries } from './trend-series';

/** The previous-period baseline; `previous` is null while it loads. */
export interface Comparison {
  window: string;
  previous: MetricsBlock | null;
}

/** Weekly summary series for the sparklines, aligned with `weeks`. */
export interface HeroTrend {
  weeks: TrendWeek[];
  summary: TrendCounts[];
  /** The page's selected dates, highlighted on each line. */
  window: { start: string; end: string };
}

interface OutcomeHeroProps {
  summary: MetricsBlock;
  mode: CountMode;
  section: MetricsSection;
  comparison?: Comparison;
  /** Absent while loading, or when the trend endpoint is missing or failed: no sparklines. */
  trend?: HeroTrend;
}

/** Share of a block still upcoming or waiting on a form — not yet able to count as showed. */
function unresolvedShare(block: MetricsBlock): number {
  return block.total ? (block.overall.upcoming + block.overall.result_pending) / block.total : 0;
}

/** How much more unresolved the current window must be before the deltas get a caveat. */
const UNRESOLVED_GAP = 0.05;

/**
 * The page's answer in one band: how many were booked, how many showed up,
 * and what those who showed up turned into.
 *
 * FNA, AMA and Sale are separate yes/no answers on the results form — AMA
 * (joined as an agent) and Sale (became a client) are branches, not steps
 * in one chain — so each is shown as a share of those who showed up rather
 * than as a conversion from the stage before it.
 */
export function OutcomeHero({ summary, mode, section, comparison, trend }: OutcomeHeroProps) {
  const unit = mode === 'prospects' ? 'prospects' : 'appointments';
  // Deltas only against a baseline big enough to mean something.
  const base = comparison?.previous && comparison.previous.total >= MIN_SAMPLE ? comparison.previous : null;
  const delta = (render: (previous: MetricsBlock) => ReactNode) => (base ? render(base) : null);
  const share = (part: number, whole: number) => (whole ? part / whole : null);

  let compareNote: ReactNode = null;
  if (comparison) {
    if (!comparison.previous) compareNote = <span>Loading comparison with {comparison.window}…</span>;
    else if (!base) compareNote = <span>Too little data in {comparison.window} to compare</span>;
    else {
      const now = unresolvedShare(summary);
      const before = unresolvedShare(base);
      compareNote = (
        <span>
          Changes vs <strong>{comparison.window}</strong>
          {now - before >= UNRESOLVED_GAP && (
            <>
              {' '}· {Math.round(now * 100)}% of this window is still upcoming or waiting on a form (vs{' '}
              {Math.round(before * 100)}% before), so its rates may still rise
            </>
          )}
        </span>
      );
    }
  }

  // Sparklines: weekly show rate, booked and AMA rate (AMA of booked, as `rates.ama`).
  let sparks: { show: ReactNode; booked: ReactNode; ama: ReactNode } | null = null;
  if (trend && trend.weeks.length) {
    const series = (pick: (week: TrendCounts) => number) => trend.summary.map(pick);
    const totals = series((week) => week.total);
    const pending = series((week) => week.upcoming + week.result_pending);
    const common = { weeks: trend.weeks, window: trend.window };
    sparks = {
      show: (
        <Sparkline
          {...common}
          className="mm-trend--gauge"
          points={rateSeries(totals, series((week) => week.showed), 'showed', pending)}
          format="rate"
          label="Weekly show rate"
          width={180}
          height={34}
        />
      ),
      booked: (
        <Sparkline
          {...common}
          points={countSeries(totals, `${unit} booked`)}
          format="count"
          label={`Weekly ${unit} booked`}
          width={112}
          height={28}
        />
      ),
      ama: (
        <Sparkline
          {...common}
          points={rateSeries(totals, series((week) => week.ama), 'joined as agents (AMA)', pending)}
          format="rate"
          label="Weekly AMA rate"
          width={150}
          height={26}
        />
      ),
    };
  }

  const branches = [
    { key: 'fna', label: 'FNA', value: summary.outcomes.fna, before: (b: MetricsBlock) => b.outcomes.fna },
    { key: 'ama', label: 'AMA', value: summary.outcomes.ama, before: (b: MetricsBlock) => b.outcomes.ama },
    { key: 'sale', label: 'Sales', value: summary.outcomes.sale, before: (b: MetricsBlock) => b.outcomes.sale },
  ];

  return (
    <section className="mm-hero-band" aria-label="Headline results">
      <div className="mm-hero-top">
        <ShowRateGauge
          rate={summary.rates.show}
          showed={summary.showed}
          total={summary.total}
          unit={unit}
          delta={delta((previous) => <Delta current={summary.rates.show} previous={previous.rates.show} kind="points" />)}
          trend={sparks?.show}
        />

        <div className="mm-chain">
          <div className="mm-stage">
            <span>Booked</span>
            <strong><CountUp value={summary.total} /></strong>
            <small>{unit} · {summary.agents.toLocaleString()} agents</small>
            {delta((previous) => <Delta current={summary.total} previous={previous.total} kind="count" />)}
            {sparks?.booked}
          </div>
          <ChevronRight className="mm-chain-arrow" size={20} aria-hidden="true" />
          <div className="mm-stage">
            <span>Showed up</span>
            <strong><CountUp value={summary.showed} /></strong>
            <small>{percent(summary.showed, summary.total)} of booked</small>
            {delta((previous) => <Delta current={summary.showed} previous={previous.showed} kind="count" />)}
          </div>
          <ChevronRight className="mm-chain-arrow" size={20} aria-hidden="true" />
          <div className={base ? 'mm-branches has-delta' : 'mm-branches'}>
            <span className="mm-branches-title">Of those who showed up</span>
            {branches.map((branch) => {
              const fill = summary.showed ? Math.min(branch.value / summary.showed, 1) * 100 : 0;
              return (
                <div key={branch.key} className="mm-branch">
                  <span>{branch.label}</span>
                  <strong><CountUp value={branch.value} /></strong>
                  <span className="mm-meter" aria-hidden="true">
                    <span style={{ width: `${fill}%` }} />
                  </span>
                  <small>{percent(branch.value, summary.showed)}</small>
                  {delta((previous) => (
                    <Delta
                      current={share(branch.value, summary.showed)}
                      previous={share(branch.before(previous), previous.showed)}
                      kind="points"
                    />
                  ))}
                </div>
              );
            })}
            {sparks && (
              <div className="mm-branch-trend">
                <div>AMA % of booked, weekly</div>
                {sparks.ama}
              </div>
            )}
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
        {sparks && (
          <span className="mm-trend-key">
            Lines: last {trend?.weeks.length} weeks · selected dates in gold · dashed = still settling · hollow = in progress or too few booked
          </span>
        )}
        {compareNote && <span className="mm-compare">{compareNote}</span>}
      </p>
    </section>
  );
}

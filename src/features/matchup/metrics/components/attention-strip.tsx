import { AlertTriangle, CheckCircle2, Info, UserX } from 'lucide-react';

import type { CountMode, MetricsBlock, MetricsSection } from '../types';
import { unitCount } from './format';

interface AttentionStripProps {
  summary: MetricsBlock;
  mode: CountMode;
  section: MetricsSection;
  /** Sort the rows table by this column and bring it into view. */
  onShow: (columnKey: 'pending' | 'unanswered') => void;
}

/**
 * The fixable problems, kept apart from the results: a past appointment with
 * no results form, and a trainer request nobody picked up. Each one jumps to
 * the rows table sorted by that column.
 */
export function AttentionStrip({ summary, mode, section, onShow }: AttentionStripProps) {
  const pending = summary.overall.result_pending;
  const unanswered = section === 'REQUEST_TRAINER' ? summary.overall.no_trainer + summary.overall.not_accepted : 0;

  return (
    <section className="mm-attention" aria-label="Needs attention">
      {pending > 0 && (
        <div className="mm-alert mm-alert--warning">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>
            <strong>{unitCount(pending, mode)} waiting on a results form</strong>
            <span>The appointment is past but nobody filed the result, so it counts as neither showed nor no-show.</span>
          </p>
          <button type="button" onClick={() => onShow('pending')}>See who</button>
        </div>
      )}
      {unanswered > 0 && (
        <div className="mm-alert mm-alert--serious">
          <UserX size={18} aria-hidden="true" />
          <p>
            <strong>{unitCount(unanswered, mode)} with no trainer</strong>
            <span>No trainer was assigned, or the assigned trainer never accepted.</span>
          </p>
          <button type="button" onClick={() => onShow('unanswered')}>See who</button>
        </div>
      )}
      {pending === 0 && unanswered === 0 && summary.total > 0 && (
        <div className="mm-alert mm-alert--good">
          <CheckCircle2 size={18} aria-hidden="true" />
          <p>
            <strong>All clear</strong>
            <span>
              Every past appointment has a result filed
              {section === 'REQUEST_TRAINER' ? ' and every request has a trainer.' : '.'}
            </span>
          </p>
        </div>
      )}
      {summary.unlinked > 0 && (
        <div className="mm-alert mm-alert--info">
          <Info size={18} aria-hidden="true" />
          <p>
            <strong>{summary.unlinked.toLocaleString()} appointment{summary.unlinked === 1 ? '' : 's'} with no prospect linked</strong>
            <span>These cannot be counted per prospect.</span>
          </p>
        </div>
      )}
    </section>
  );
}

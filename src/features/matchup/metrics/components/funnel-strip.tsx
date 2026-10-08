import type { FunnelStage } from '../types';
import { percent } from './format';

interface FunnelStripProps {
  stages: FunnelStage[];
}

/**
 * The leadership funnel (Step 1 → showed → follow-up → … → Step 3 showed).
 * Bars are scaled to the first stage so drop-off reads at a glance.
 */
export function FunnelStrip({ stages }: FunnelStripProps) {
  const top = stages[0]?.value ?? 0;
  return (
    <ol className="mm-funnel">
      {stages.map((stage) => (
        <li key={stage.key}>
          <span className="mm-funnel-label">{stage.label}</span>
          <span className="mm-funnel-bar">
            <span style={{ width: top ? `${Math.max((stage.value / top) * 100, stage.value ? 2 : 0)}%` : 0 }} />
          </span>
          <strong>{stage.value.toLocaleString()}</strong>
          <small>{percent(stage.value, top)}</small>
        </li>
      ))}
    </ol>
  );
}

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

interface DeltaProps {
  current: number | null;
  previous: number | null;
  /** `count`: percent change of a number. `points`: difference of two 0..1 rates, in percentage points. */
  kind: 'count' | 'points';
}

/**
 * Change against the previous period. Every metric it is used for is
 * "higher is better", so up is good. Direction is carried by the icon and
 * the words as well as the colour.
 */
export function Delta({ current, previous, kind }: DeltaProps) {
  if (current == null || previous == null) return null;

  let change: number;
  let text: string;
  let was: string;
  if (kind === 'points') {
    change = Math.round((current - previous) * 100);
    text = `${Math.abs(change)} pts`;
    was = `${Math.round(previous * 100)}%`;
  } else if (previous === 0) {
    change = current;
    text = current ? 'from 0' : '';
    was = '0';
  } else {
    change = Math.round(((current - previous) / previous) * 100);
    text = `${Math.abs(change)}%`;
    was = previous.toLocaleString();
  }

  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  return (
    <span className={`mm-delta is-${direction}`} title={`Previous period: ${was}`}>
      <Icon size={13} aria-hidden="true" />
      {direction === 'flat' ? 'no change' : text}
      <span className="sr-only">
        {direction === 'flat' ? '' : direction === 'up' ? ' up' : ' down'} vs previous period ({was})
      </span>
    </span>
  );
}

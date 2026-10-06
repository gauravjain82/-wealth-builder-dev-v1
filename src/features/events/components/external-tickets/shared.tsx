import { Badge, Button, Text } from '@shared/components';
import type { AccountMap, MapState, Pagination } from '../../types/external-tickets';
import { STATE_LABEL } from './labels';

const STATE_VARIANT: Record<MapState, 'success' | 'warning' | 'secondary' | 'outline' | 'info'> = {
  unmatched: 'outline',
  provisional: 'info',
  confirmed: 'success',
  review: 'warning',
  ignored: 'secondary',
};

export function MapStateBadge({ state }: { state: MapState }) {
  return <Badge variant={STATE_VARIANT[state]}>{STATE_LABEL[state]}</Badge>;
}

interface PagerProps {
  pagination: Pagination | undefined;
  onPage: (page: number) => void;
}

/** Previous/next pager with a live total, for ≤ 50-row pages. */
export function Pager({ pagination, onPage }: PagerProps) {
  if (!pagination || pagination.total <= pagination.page_size) return null;
  const pages = Math.ceil(pagination.total / pagination.page_size);
  return (
    <nav className="flex items-center justify-end gap-2" aria-label="Pagination">
      <Text variant="muted" className="text-sm" aria-live="polite">
        Page {pagination.page} of {pages} · {pagination.total} total
      </Text>
      <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>
        Previous
      </Button>
      <Button variant="outline" size="sm" disabled={pagination.page >= pages} onClick={() => onPage(pagination.page + 1)}>
        Next
      </Button>
    </nav>
  );
}

interface MapCellProps {
  map: AccountMap | null;
  busy: boolean;
  onQuickConfirm: (map: AccountMap) => void;
  onReview: (map: AccountMap) => void;
}

/**
 * One relationship's identity state. A 100% suggestion shows an outlined-green
 * Confirm beside Review; once the server confirms, the same button turns solid
 * green and stays in place so the operator can keep sifting.
 */
export function MapCell({ map, busy, onQuickConfirm, onReview }: MapCellProps) {
  if (!map) return <Text variant="muted">—</Text>;
  const canQuick = map.state === 'provisional' && map.confidence === 100 && map.account !== null;
  const confirmed = map.state === 'confirmed';
  return (
    <div className="flex min-w-[220px] flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <MapStateBadge state={map.state} />
        {map.account ? (
          <span className="text-sm">
            {map.account.full_name}
            {map.account.agency_code ? <span className="text-slate-500"> · {map.account.agency_code}</span> : null}
          </span>
        ) : null}
        {map.state === 'provisional' ? <span className="text-xs text-slate-500">{map.confidence}%</span> : null}
      </div>
      <div className="flex gap-2">
        {canQuick || (confirmed && map.method === 'quick_confirm') ? (
          <button
            type="button"
            disabled={busy || confirmed}
            onClick={() => onQuickConfirm(map)}
            aria-label={confirmed ? `Confirmed ${map.source_name}` : `Confirm ${map.source_name} as ${map.account?.full_name}`}
            className={`h-7 rounded-md border px-2 text-xs font-semibold transition-colors disabled:cursor-default ${
              confirmed
                ? 'border-green-600 bg-green-600 text-white'
                : 'border-green-600 bg-transparent text-green-700 hover:bg-green-50 dark:text-green-400'
            }`}
          >
            {confirmed ? 'Confirmed' : busy ? 'Saving…' : 'Confirm'}
          </button>
        ) : null}
        <Button variant="outline" size="sm" onClick={() => onReview(map)}>
          {confirmed ? 'Change' : 'Review'}
        </Button>
      </div>
    </div>
  );
}

import { Badge, Button } from '@shared/components';
import { DOOR_MATCH_LABELS, sourceLabel, type DoorCandidate } from '../../types/door';

interface DoorCandidateListProps {
  candidates: DoorCandidate[];
  /** Button text per row, e.g. "Admit" or "Link & admit". */
  actionLabel: string;
  busy: boolean;
  onPick: (candidate: DoorCandidate) => void;
}

/**
 * Tickets a door scan could mean, in the order the server ranked them. Each
 * row says *why* it is a candidate; a name-only match is flagged so staff
 * check photo ID before admitting or linking on it.
 */
export function DoorCandidateList({ candidates, actionLabel, busy, onPick }: DoorCandidateListProps) {
  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
      {candidates.map((candidate) => {
        const weak = candidate.match === 'name';
        const source = sourceLabel(candidate.source, candidate.external_reference);
        return (
          <li
            key={candidate.ticket_id}
            className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${
              weak ? 'bg-amber-50 dark:bg-amber-500/10' : ''
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {candidate.holder_name || '(no name on ticket)'}
              </p>
              <p className="text-xs text-slate-500 dark:text-white/60">
                {candidate.ticket_number}
                {source ? ` · ${source}` : ''}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant={weak ? 'warning' : 'outline'}>
                  {DOOR_MATCH_LABELS[candidate.match] ?? candidate.match}
                </Badge>
                {candidate.checked_in ? <Badge variant="info">Already checked in</Badge> : null}
                {candidate.holder_linked ? <Badge variant="outline">Linked</Badge> : null}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={weak ? 'outline' : 'default'}
              disabled={busy}
              onClick={() => onPick(candidate)}
            >
              {actionLabel}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

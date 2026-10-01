import { useNavigate } from 'react-router-dom';
import { Button, Select } from '@shared/components';
import { bpmSubToolPath, useBpmSelection } from '../context/bpm-selection-context';
import { formatOccurrenceTime } from '../services/bpm-service';
import type { BPMOccurrence } from '../types';

/**
 * The jump-to-sub-tool buttons shared by BPM Overview and BPM Schedule.
 *
 * Each button takes the user straight to the sub-tool with this BPM, date and
 * location already selected, so the list they want is on screen with nothing to
 * re-enter. "Add Guest" is deliberately *not* its own page: it routes to Guest
 * Invites and opens the add modal there (`&add=1`), because the brief wants the
 * guest added in the context of the list they are working from.
 *
 * Location is not a separate choice — an occurrence *is* a (date, location)
 * pair — so when a day has several, the caller passes them all and this renders
 * a location select first. See {@link OccurrenceRowActions.occurrences}. A caller
 * that passes `onSelectAll` also gets "All locations" as that select's first
 * option (D23); while it is chosen the buttons open the sub-tool scoped to the
 * whole date, anchored on its first location.
 *
 * Attachments are not reached from here any more: the BPM's name is the link
 * (`BpmTitleLink`), so the paperclip that used to trail these buttons is gone.
 */

/** Destinations, in the order the brief lists them. */
const TARGETS = [
  { key: 'add-guest', label: 'Add Guest', path: '/bpm/view-invites', add: true },
  { key: 'invites', label: 'Guest Invites', path: '/bpm/view-invites' },
  { key: 'associate-invites', label: 'Associate Invites', path: '/bpm/associate-invites' },
  { key: 'guest', label: 'Guest Check-In', path: '/bpm/guest-checkin' },
  { key: 'associate', label: 'Associate Check-In', path: '/bpm/associate-checkin' },
] as const;

/** The location select's value for "All locations" — never a real id. */
const ALL_VALUE = 'all';

interface OccurrenceRowActionsProps {
  /**
   * Every occurrence for this BPM on this day. One entry is the common case;
   * several means a multi-location day, which gets a location select.
   */
  occurrences: BPMOccurrence[];
  /** Which occurrence the buttons act on (the caller owns the selection). */
  selected: BPMOccurrence | null;
  onSelect: (occurrence: BPMOccurrence) => void;
  /**
   * Offer "All locations" first in the location select. Only meaningful with
   * several occurrences; callers without it keep the one-location behaviour.
   */
  onSelectAll?: () => void;
  /** Whether "All locations" is the current choice (the caller owns it). */
  allSelected?: boolean;
  disabled?: boolean;
  /** Fired just before navigating — lets a modal close itself first. */
  onNavigate?: () => void;
}

export function OccurrenceRowActions({
  occurrences,
  selected,
  onSelect,
  onSelectAll,
  allSelected = false,
  disabled = false,
  onNavigate,
}: OccurrenceRowActionsProps) {
  const navigate = useNavigate();
  const { selectBoth } = useBpmSelection();

  const multiLocation = occurrences.length > 1;
  const all = multiLocation && Boolean(onSelectAll) && allSelected;
  // In All mode the anchor is the date's first location, as the selection
  // context expects; otherwise the chosen one.
  const target = all ? occurrences[0] : (selected ?? occurrences[0] ?? null);

  const go = (path: string, add: boolean) => {
    if (!target) return;
    // Set the sticky selection as well as the URL: the destination reads the
    // URL on cold load, but this keeps in-app navigation instant and keeps the
    // two in step.
    selectBoth(target.event, target.id, all);
    onNavigate?.();
    const href = bpmSubToolPath(path, target.event, target.id, all);
    navigate(add ? `${href}&add=1` : href);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {multiLocation ? (
        <Select
          variant="surface"
          aria-label="Location"
          value={all ? ALL_VALUE : (target?.id ?? '')}
          disabled={disabled}
          className="max-w-[220px]"
          onChange={(event) => {
            if (event.target.value === ALL_VALUE) {
              onSelectAll?.();
              return;
            }
            const next = occurrences.find(
              (row) => row.id === Number(event.target.value),
            );
            if (next) onSelect(next);
          }}
        >
          {/* No count on All: this list may be narrowed by the Overview filters,
              while the sub-tool scopes every location of the date. */}
          {onSelectAll ? <option value={ALL_VALUE}>All locations</option> : null}
          {occurrences.map((occurrence) => (
            <option key={occurrence.id} value={occurrence.id}>
              {occurrence.location_detail?.label || 'Location'} ·{' '}
              {formatOccurrenceTime(occurrence.start_at, {
                weekday: undefined,
                month: undefined,
                day: undefined,
              })}
            </option>
          ))}
        </Select>
      ) : null}

      {TARGETS.map((item) => (
        <Button
          key={item.key}
          size="sm"
          variant={item.key === 'add-guest' ? 'default' : 'outline'}
          disabled={disabled || !target}
          onClick={() => go(item.path, 'add' in item && item.add === true)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}

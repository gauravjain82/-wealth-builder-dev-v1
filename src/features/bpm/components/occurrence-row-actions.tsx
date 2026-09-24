import { useNavigate } from 'react-router-dom';
import { Paperclip } from 'lucide-react';
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
 * a location select first. See {@link OccurrenceRowActions.occurrences}.
 */

/** Destinations, in the order the brief lists them. */
const TARGETS = [
  { key: 'add-guest', label: 'Add Guest', path: '/bpm/view-invites', add: true },
  { key: 'invites', label: 'Guest Invites', path: '/bpm/view-invites' },
  { key: 'associate-invites', label: 'Associate Invites', path: '/bpm/associate-invites' },
  { key: 'associate', label: 'Associate Check-In', path: '/bpm/associate-checkin' },
  { key: 'guest', label: 'Guest Check-In', path: '/bpm/guest-checkin' },
] as const;

interface OccurrenceRowActionsProps {
  /**
   * Every occurrence for this BPM on this day. One entry is the common case;
   * several means a multi-location day, which gets a location select.
   */
  occurrences: BPMOccurrence[];
  /** Which occurrence the buttons act on (the caller owns the selection). */
  selected: BPMOccurrence | null;
  onSelect: (occurrence: BPMOccurrence) => void;
  /** Called when the attachments button is pressed. Omit to hide it. */
  onOpenAttachments?: (occurrence: BPMOccurrence) => void;
  /** Whether this BPM has any attachments (drives the button's visibility). */
  hasAttachments?: boolean;
  disabled?: boolean;
  /** Fired just before navigating — lets a modal close itself first. */
  onNavigate?: () => void;
}

export function OccurrenceRowActions({
  occurrences,
  selected,
  onSelect,
  onOpenAttachments,
  hasAttachments = false,
  disabled = false,
  onNavigate,
}: OccurrenceRowActionsProps) {
  const navigate = useNavigate();
  const { selectBoth } = useBpmSelection();

  const target = selected ?? occurrences[0] ?? null;
  const multiLocation = occurrences.length > 1;

  const go = (path: string, add: boolean) => {
    if (!target) return;
    // Set the sticky selection as well as the URL: the destination reads the
    // URL on cold load, but this keeps in-app navigation instant and keeps the
    // two in step.
    selectBoth(target.event, target.id);
    onNavigate?.();
    const href = bpmSubToolPath(path, target.event, target.id);
    navigate(add ? `${href}&add=1` : href);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {multiLocation ? (
        <Select
          variant="surface"
          aria-label="Location"
          value={target?.id ?? ''}
          disabled={disabled}
          className="max-w-[220px]"
          onChange={(event) => {
            const next = occurrences.find(
              (row) => row.id === Number(event.target.value),
            );
            if (next) onSelect(next);
          }}
        >
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

      {onOpenAttachments && hasAttachments && target ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled}
          title="Attachments"
          aria-label="Attachments"
          onClick={() => onOpenAttachments(target)}
        >
          <Paperclip size={14} />
        </Button>
      ) : null}
    </div>
  );
}

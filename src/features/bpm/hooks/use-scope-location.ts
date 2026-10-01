import { useCallback, useEffect, useState } from 'react';
import { useBpmSelection } from '../context/bpm-selection-context';
import type { BPMOccurrence } from '../types';

/** localStorage key remembering the last location chosen for a BPM. */
const storageKey = (eventId: number) => `wb.bpm.lastLocation.${eventId}`;

// Stores the *location* id (BPMEventLocation), not the occurrence id, so the
// choice carries over to the next date of the same BPM.

function readRemembered(eventId: number | null): number | null {
  if (eventId === null) return null;
  try {
    const raw = localStorage.getItem(storageKey(eventId));
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * The one location an action lands on when the lists span several.
 *
 * In All-locations mode a row already knows its location, but a *new* thing —
 * adding a guest, checking in somebody not on the list, showing a QR code — has
 * to land on exactly one. This is that choice: sticky per BPM (a greeter stands
 * at one door all night), defaulting to the date's first location, and always
 * one of the current scope's occurrences. Outside All-locations mode it is
 * simply the selected occurrence and `choices` has one entry.
 */
export function useScopeLocation(): {
  choices: BPMOccurrence[];
  location: BPMOccurrence | null;
  setLocationId: (occurrenceId: number) => void;
} {
  const { eventId, occurrence, scopeOccurrences } = useBpmSelection();
  const [chosenId, setChosenId] = useState<number | null>(() => readRemembered(eventId));

  useEffect(() => {
    setChosenId(readRemembered(eventId));
  }, [eventId]);

  const setLocationId = useCallback(
    (occurrenceId: number) => {
      const locationId = scopeOccurrences.find((row) => row.id === occurrenceId)?.location ?? null;
      if (locationId === null) return;
      setChosenId(locationId);
      if (eventId === null) return;
      try {
        localStorage.setItem(storageKey(eventId), String(locationId));
      } catch {
        // Non-fatal: the choice just will not be remembered.
      }
    },
    [eventId, scopeOccurrences],
  );

  const remembered = scopeOccurrences.find((row) => row.location !== null && row.location === chosenId);
  const location = remembered ?? scopeOccurrences[0] ?? occurrence ?? null;

  return { choices: scopeOccurrences, location, setLocationId };
}

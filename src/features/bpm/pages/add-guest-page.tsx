import { useState } from 'react';

import { HelpAction } from '@/features/gms';

import { AddGuestForm } from '../components/add-guest-form';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { ScopeLocationSelect } from '../components/scope-location-select';
import { useBpmSelection } from '../context/bpm-selection-context';
import { useScopeLocation } from '../hooks/use-scope-location';

export default function AddGuestPage() {
  // Sticky: the BPM/date chosen here follows the user to the other sub-tools,
  // so repeat entries for the same meeting need no re-selection.
  const { occurrence, occurrenceId, allLocations } = useBpmSelection();
  // A guest is invited to one location. In All-locations mode the picker names
  // a date, not a place, so ask — sticky per BPM, like every new-item action.
  const { choices, location, setLocationId } = useScopeLocation();
  const target = allLocations ? location : occurrence;

  // Whether the form holds anything unsaved, so a walkthrough can warn before exit.
  // A boolean, deliberately: guidance is told *that* there is unsaved work, never what
  // it is. `AddGuestForm` owns the values and keeps them.
  const [hasUnsavedInput, setHasUnsavedInput] = useState(false);

  return (
    <BPMPageShell
      title="Add Guest"
      description="Select who invited them from the organisation, then search that inviter's baseshop — or add a new prospect under them."
      // The labelled Help action for this page. It reads the sticky selection the
      // picker already holds — decision G8's reason for choosing this page as the
      // pilot surface — and needs no change to BPM's own state to do it.
      actions={
        <HelpAction
          toolKey="bpm"
          locationKey="bpm.add_guest.page"
          contextIds={occurrenceId ? { occurrence_id: occurrenceId } : {}}
          hasUnsavedToolData={hasUnsavedInput}
        />
      }
    >
      <BPMCard className="mb-4">
        <BPMOccurrencePicker allowPast />
      </BPMCard>
      <BPMCard>
        {allLocations ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 dark:text-white/80">
            <span>Add to location</span>
            <ScopeLocationSelect
              choices={choices}
              value={location}
              onChange={setLocationId}
              label="Add to location"
            />
          </div>
        ) : null}
        <AddGuestForm
          occurrence={target}
          onAdded={() => setHasUnsavedInput(false)}
          onDirtyChange={setHasUnsavedInput}
        />
      </BPMCard>
    </BPMPageShell>
  );
}

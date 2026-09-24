import { AddGuestForm } from '../components/add-guest-form';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { useBpmSelection } from '../context/bpm-selection-context';

export default function AddGuestPage() {
  // Sticky: the BPM/date chosen here follows the user to the other sub-tools,
  // so repeat entries for the same meeting need no re-selection.
  const { occurrence } = useBpmSelection();

  return (
    <BPMPageShell title="Add Guest" description="Select who invited them from the organisation, then search that inviter's baseshop — or add a new prospect under them.">
      <BPMCard className="mb-4">
        <BPMOccurrencePicker allowPast />
      </BPMCard>
      <BPMCard>
        <AddGuestForm occurrence={occurrence} onAdded={() => undefined} />
      </BPMCard>
    </BPMPageShell>
  );
}

import { useState } from 'react';
import { AddGuestForm } from '../components/add-guest-form';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import type { BPMOccurrence } from '../types';

export default function AddGuestPage() {
  const [occurrence, setOccurrence] = useState<BPMOccurrence | null>(null);

  return (
    <BPMPageShell title="Add Guest" description="Invite a guest to a BPM. A prospect is created and assigned to the inviter.">
      <BPMCard className="mb-4">
        <BPMOccurrencePicker value={occurrence} onChange={setOccurrence} />
      </BPMCard>
      <BPMCard>
        <AddGuestForm occurrence={occurrence} onAdded={() => undefined} />
      </BPMCard>
    </BPMPageShell>
  );
}

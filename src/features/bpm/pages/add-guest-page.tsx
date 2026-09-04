import { useState } from 'react';
import { AddGuestForm } from '../components/add-guest-form';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import type { BPMOccurrence } from '../types';

export default function AddGuestPage() {
  const [occurrence, setOccurrence] = useState<BPMOccurrence | null>(null);

  return (
    <BPMPageShell title="Add Guest" description="Select who invited them from the organisation, then search that inviter's baseshop — or add a new prospect under them.">
      <BPMCard className="mb-4">
        <BPMOccurrencePicker value={occurrence} onChange={setOccurrence} />
      </BPMCard>
      <BPMCard>
        <AddGuestForm occurrence={occurrence} onAdded={() => undefined} />
      </BPMCard>
    </BPMPageShell>
  );
}

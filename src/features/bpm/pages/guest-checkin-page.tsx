import { useCallback, useEffect, useMemo, useState } from 'react';
import { Input, LoadingState } from '@shared/components';
import { useToastStore } from '@/store';
import { matchupService } from '@/features/matchup/services/matchup-service';
import type { AppointmentType } from '@/features/matchup/types';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { GuestCheckinTable } from '../components/guest-checkin-table';
import { FollowUpGuestModal } from '../components/follow-up-guest-modal';
import { bpmService } from '../services/bpm-service';
import type { BPMGuest, BPMInterestOption, BPMOccurrence, GuestOutcomeField } from '../types';

type GuestFilter = 'all' | 'checked_in' | 'called' | 'left_message' | 'not_interested' | 'reschedule';

const FILTERS: { key: GuestFilter; label: string; match: (g: BPMGuest) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'checked_in', label: 'Checked In', match: (g) => Boolean(g.checked_in_at) },
  { key: 'called', label: 'Called', match: (g) => g.called },
  { key: 'left_message', label: 'Left Message', match: (g) => g.left_message },
  { key: 'not_interested', label: 'Not Interested', match: (g) => g.not_interested },
  { key: 'reschedule', label: 'Reschedule', match: (g) => g.reschedule },
];

export default function GuestCheckinPage() {
  const addToast = useToastStore((state) => state.addToast);
  const [occurrence, setOccurrence] = useState<BPMOccurrence | null>(null);
  const [guests, setGuests] = useState<BPMGuest[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<GuestFilter>('all');
  const [search, setSearch] = useState('');
  const [followUpTarget, setFollowUpTarget] = useState<BPMGuest | null>(null);
  const [interestOptions, setInterestOptions] = useState<BPMInterestOption[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);

  useEffect(() => {
    bpmService.interestOptions({ ordering: 'sort_order' }).then(setInterestOptions).catch(() => setInterestOptions([]));
    matchupService.appointmentTypes().then(setAppointmentTypes).catch(() => setAppointmentTypes([]));
  }, []);

  const load = useCallback(
    async (occurrenceId: number) => {
      setLoading(true);
      try {
        setGuests(await bpmService.guests(occurrenceId));
      } catch (error) {
        addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load guests' });
      } finally {
        setLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    if (occurrence) void load(occurrence.id);
    else setGuests([]);
  }, [occurrence, load]);

  const toggleCheckIn = async (guest: BPMGuest) => {
    if (!occurrence) return;
    setBusy(true);
    try {
      if (guest.checked_in_at) {
        await bpmService.undoCheckInGuest(guest.occurrence, guest.id);
        addToast({ type: 'success', message: 'Check-in undone.' });
      } else {
        await bpmService.checkInGuest(guest.occurrence, guest.id);
        addToast({ type: 'success', message: `${guest.prospect_detail?.name || 'Guest'} checked in.` });
      }
      await load(occurrence.id);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Check-in failed' });
    } finally {
      setBusy(false);
    }
  };

  const setGuestOutcome = async (guest: BPMGuest, field: GuestOutcomeField, value: boolean) => {
    if (!occurrence) return;
    setBusy(true);
    try {
      await bpmService.setGuestFlags(guest.occurrence, { guest_id: guest.id, [field]: value });
      await load(occurrence.id);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update outcome' });
    } finally {
      setBusy(false);
    }
  };

  // The save endpoint returns the full updated guest, so patch it into the list in place.
  const handleFollowUpSaved = (updated: BPMGuest) =>
    setGuests((prev) => prev.map((guest) => (guest.id === updated.id ? updated : guest)));

  const addGuestNote = async (guest: BPMGuest, text: string) => {
    if (!occurrence) return;
    setBusy(true);
    try {
      await bpmService.addGuestNote(guest.occurrence, { guest_id: guest.id, text });
      addToast({ type: 'success', message: 'Note added.' });
      await load(occurrence.id);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to add note' });
    } finally {
      setBusy(false);
    }
  };

  const totalInvites = guests.length;
  const totalCheckedIn = useMemo(() => guests.filter((g) => g.checked_in_at).length, [guests]);
  const attendanceRatio = totalInvites ? Math.round((totalCheckedIn / totalInvites) * 100) : 0;

  const filterCounts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, guests.filter(f.match).length])) as Record<GuestFilter, number>,
    [guests],
  );

  const visibleGuests = useMemo(() => {
    const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
    const term = search.trim().toLowerCase();
    return guests.filter((g) => {
      if (!activeFilter.match(g)) return false;
      if (!term) return true;
      const haystack = [g.prospect_detail?.name, g.prospect_detail?.email, g.prospect_detail?.phone, g.inviter_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [guests, filter, search]);

  const cards = [
    { label: 'Total Invites', value: totalInvites, className: 'bg-sky-500' },
    { label: 'Total Checked In', value: totalCheckedIn, className: 'bg-emerald-500' },
    { label: 'Attendance Ratio', value: `${attendanceRatio}%`, className: 'bg-violet-500' },
  ];

  return (
    <BPMPageShell title="Guest Check-In" description="Check guests in as they arrive at the BPM.">
      <BPMCard className="mb-4">
        <BPMOccurrencePicker value={occurrence} onChange={setOccurrence} />
      </BPMCard>

      {occurrence ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {cards.map((card) => (
              <div key={card.label} className={`rounded-xl p-4 text-white shadow-sm ${card.className}`}>
                <div className="text-xs font-medium uppercase tracking-wide text-white/80">{card.label}</div>
                <div className="mt-1 text-3xl font-bold">{card.value}</div>
              </div>
            ))}
          </div>

          <BPMCard>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      filter === f.key
                        ? 'border-amber-400 bg-amber-400/15 text-amber-600 dark:text-amber-300'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10'
                    }`}
                  >
                    {f.label} ({filterCounts[f.key]})
                  </button>
                ))}
              </div>
              <div className="w-full sm:w-64">
                <Input
                  variant="surface"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, phone…"
                />
              </div>
            </div>

            {loading ? (
              <LoadingState />
            ) : (
              <GuestCheckinTable
                guests={visibleGuests}
                busy={busy}
                onToggleCheckIn={toggleCheckIn}
                onSetOutcome={setGuestOutcome}
                onAddNote={addGuestNote}
                onFollowUp={setFollowUpTarget}
              />
            )}
          </BPMCard>
        </>
      ) : (
        <BPMCard>
          <p className="py-6 text-center text-sm text-slate-500 dark:text-white/60">
            Please select a BPM and date to view the guest list.
          </p>
        </BPMCard>
      )}

      <FollowUpGuestModal
        open={Boolean(followUpTarget)}
        guest={followUpTarget}
        interestOptions={interestOptions}
        appointmentTypes={appointmentTypes}
        onClose={() => setFollowUpTarget(null)}
        onSaved={handleFollowUpSaved}
      />
    </BPMPageShell>
  );
}

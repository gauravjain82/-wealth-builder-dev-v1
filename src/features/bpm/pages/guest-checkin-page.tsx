import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, LoadingState } from '@shared/components';
import { useToastStore } from '@/store';
import { matchupService } from '@/features/matchup/services/matchup-service';
import type { AppointmentType } from '@/features/matchup/types';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { GuestCheckinTable } from '../components/guest-checkin-table';
import { AddGuestModal } from '../components/add-guest-modal';
import { FollowUpGuestModal } from '../components/follow-up-guest-modal';
import { bpmService } from '../services/bpm-service';
import type {
  BPMGuest,
  BPMInterestOption,
  BPMOccurrence,
  GuestOutcomeField,
  ProspectSearchHit,
} from '../types';

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
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [interestOptions, setInterestOptions] = useState<BPMInterestOption[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [prospectHits, setProspectHits] = useState<ProspectSearchHit[]>([]);
  const [associateHits, setAssociateHits] = useState<ProspectSearchHit[]>([]);
  const [prospectSearching, setProspectSearching] = useState(false);

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

  // Second search tier: a company-wide (not downline-scoped) prospect lookup so a
  // walk-in already in the system is found regardless of team. The single result
  // set is split by agency_code:
  //   • uncoded, uninvited → true prospects the caller can quick-add;
  //   • coded → recruited associates, who belong in Associate Check-In, so we
  //     flag them rather than offering an add.
  useEffect(() => {
    const term = search.trim();
    if (!occurrence || term.length < 2) {
      setProspectHits([]);
      setAssociateHits([]);
      setProspectSearching(false);
      return;
    }
    setProspectSearching(true);
    const handle = setTimeout(async () => {
      try {
        const hits = await bpmService.searchProspects(term, 10);
        const invited = new Set(guests.map((g) => g.prospect).filter(Boolean));
        setProspectHits(hits.filter((p) => !p.agency_code && !invited.has(p.id)));
        setAssociateHits(hits.filter((p) => Boolean(p.agency_code)));
      } catch {
        setProspectHits([]);
        setAssociateHits([]);
      } finally {
        setProspectSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [search, occurrence, guests]);

  // Tier 2 action: add an existing prospect as a guest and check them in at once.
  const quickAddProspect = async (prospect: ProspectSearchHit) => {
    if (!occurrence) return;
    setBusy(true);
    try {
      const name = prospect.name || `${prospect.first_name} ${prospect.last_name}`.trim();
      const guest = await bpmService.addGuest(occurrence.id, {
        guest_name: name,
        prospect: prospect.id,
        inviter: prospect.recruited_by,
        notes: '',
      });
      await bpmService.checkInGuest(occurrence.id, guest.id);
      addToast({ type: 'success', message: `${name || 'Guest'} added and checked in.` });
      setSearch('');
      await load(occurrence.id);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to add guest' });
    } finally {
      setBusy(false);
    }
  };

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
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="w-full sm:w-64">
                  <Input
                    variant="surface"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search invites & prospects…"
                  />
                </div>
                <Button type="button" size="sm" className="whitespace-nowrap" onClick={() => setAddGuestOpen(true)}>
                  + Add Guest
                </Button>
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

            {search.trim().length >= 2 ? (
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-white/10">
                {associateHits.length > 0 ? (
                  <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-400/30 dark:bg-amber-400/10">
                    <span className="font-medium text-amber-800 dark:text-amber-200">
                      Already a recruited associate:
                    </span>{' '}
                    <span className="text-amber-700 dark:text-amber-200/80">
                      {associateHits
                        .map((a) => `${a.name || `${a.first_name} ${a.last_name}`.trim()} (${a.agency_code})`)
                        .join(', ')}{' '}
                      — check them in from{' '}
                      <Link to="/bpm/associate-checkin" className="font-medium underline">
                        Associate Check-In
                      </Link>
                      , not here.
                    </span>
                  </div>
                ) : null}
                {prospectHits.length > 0 || associateHits.length === 0 ? (
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/60">
                    <span>Prospects not yet invited</span>
                    {prospectSearching ? <span className="font-normal normal-case text-slate-400">searching…</span> : null}
                  </div>
                ) : null}
                {prospectHits.length > 0 ? (
                  <ul className="divide-y divide-slate-100 dark:divide-white/5">
                    {prospectHits.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900 dark:text-white">
                            {p.name || `${p.first_name} ${p.last_name}`.trim() || `Prospect #${p.id}`}
                          </div>
                          <div className="truncate text-xs text-slate-500 dark:text-white/60">
                            {[p.email, p.phone].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          className="whitespace-nowrap"
                          onClick={() => quickAddProspect(p)}
                        >
                          Add &amp; Check in
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : !prospectSearching && associateHits.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <p className="text-sm text-slate-500 dark:text-white/60">
                      No matching prospect for “{search.trim()}”.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="whitespace-nowrap"
                      onClick={() => setAddGuestOpen(true)}
                    >
                      + Add new guest
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </BPMCard>
        </>
      ) : (
        <BPMCard>
          <p className="py-6 text-center text-sm text-slate-500 dark:text-white/60">
            Please select a BPM and date to view the guest list.
          </p>
        </BPMCard>
      )}

      <AddGuestModal
        open={addGuestOpen}
        presetOccurrence={occurrence}
        onClose={() => setAddGuestOpen(false)}
        onAdded={() => {
          if (occurrence) void load(occurrence.id);
        }}
      />

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

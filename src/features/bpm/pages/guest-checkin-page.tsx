import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, LoadingState, Select } from '@shared/components';
import { useToastStore } from '@/store';
import { matchupService } from '@/features/matchup/services/matchup-service';
import type { AppointmentType } from '@/features/matchup/types';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { useBpmSelection } from '../context/bpm-selection-context';
import { CheckinStatCards } from '../components/checkin-stat-cards';
import { CheckinWindowNotice } from '../components/checkin-window-notice';
import { BpmQrModal } from '../components/bpm-qr-modal';
import { GuestCheckinTable } from '../components/guest-checkin-table';
import { AddGuestModal } from '../components/add-guest-modal';
import { FollowUpGuestModal } from '../components/follow-up-guest-modal';
import { InterestOptionsAdminModal } from '../components/interest-options-admin-modal';
import { bpmService } from '../services/bpm-service';
import type {
  BPMCapabilities,
  BPMGuest,
  BPMInterestOption,
  CheckinDimension,
  GuestCheckinOutcomeField,
  ProspectSearchHit,
} from '../types';

/**
 * Attendance pills.
 *
 * Phase 5 dropped the outcome pills (called / left message / not interested /
 * rescheduled) — those are pre-event questions that belong on Guest Invites.
 * What somebody at a door needs is the inverse: who has *not* arrived yet.
 */
type GuestFilter = 'all' | 'checked_in' | 'not_checked_in';

const FILTERS: { key: GuestFilter; label: string; match: (g: BPMGuest) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'checked_in', label: 'Checked In', match: (g) => Boolean(g.checked_in_at) },
  { key: 'not_checked_in', label: 'Not Checked In', match: (g) => !g.checked_in_at },
];

/** The three upline selects, and which field on a guest row each one reads. */
const UPLINE_FILTERS = [
  { key: 'smd', label: 'SMD', field: 'smd_name' },
  { key: 'md', label: 'MD', field: 'md_name' },
  { key: 'leader', label: 'Leader', field: 'leader_name' },
] as const;

type UplineFilterKey = (typeof UPLINE_FILTERS)[number]['key'];

/** Which rankings Guest Check-In shows, in card order. */
const GUEST_DIMENSIONS: CheckinDimension[] = ['inviter', 'leader', 'md', 'smd'];

export default function GuestCheckinPage() {
  const addToast = useToastStore((state) => state.addToast);
  // Sticky: the BPM/date chosen here follows the user to the other sub-tools.
  const { occurrence } = useBpmSelection();
  const [guests, setGuests] = useState<BPMGuest[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<GuestFilter>('all');
  const [uplineFilter, setUplineFilter] = useState<Record<UplineFilterKey, string>>({
    smd: '',
    md: '',
    leader: '',
  });
  const [search, setSearch] = useState('');
  // QR sits beside the search because that is where somebody stands when a
  // person arrives: find them, or scan them.
  const [qrOpen, setQrOpen] = useState(false);
  const [followUpTarget, setFollowUpTarget] = useState<BPMGuest | null>(null);
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [interestOptions, setInterestOptions] = useState<BPMInterestOption[]>([]);
  // The interest list only drives the Blue Card, which lives on this page as of
  // Phase 4 — so its admin modal moved here with it.
  const [manageOptionsOpen, setManageOptionsOpen] = useState(false);
  const [capabilities, setCapabilities] = useState<BPMCapabilities | null>(null);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [prospectHits, setProspectHits] = useState<ProspectSearchHit[]>([]);
  const [associateHits, setAssociateHits] = useState<ProspectSearchHit[]>([]);
  const [prospectSearching, setProspectSearching] = useState(false);
  // Bumped on every check-in so the leaderboards re-fetch. They are read while
  // the room fills up, so a card that lags the list is worse than a slow one.
  const [statsVersion, setStatsVersion] = useState(0);
  // Server-derived: the window opens N hours before start and never closes, so
  // everything else on this page keeps working — only checking in is held back.
  const checkinOpen = occurrence?.checkin_open ?? true;

  const loadInterestOptions = useCallback(async () => {
    try {
      setInterestOptions(await bpmService.interestOptions({ ordering: 'sort_order' }));
    } catch {
      // Non-fatal: the Blue Card simply shows no interest options.
    }
  }, []);

  useEffect(() => {
    void loadInterestOptions();
    matchupService.appointmentTypes().then(setAppointmentTypes).catch(() => setAppointmentTypes([]));
    bpmService.capabilities().then(setCapabilities).catch(() => setCapabilities(null));
  }, [loadInterestOptions]);

  const load = useCallback(
    async (occurrenceId: number) => {
      setLoading(true);
      try {
        setGuests(await bpmService.guests(occurrenceId));
        setStatsVersion((version) => version + 1);
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

  const setGuestOutcome = async (guest: BPMGuest, field: GuestCheckinOutcomeField, value: boolean) => {
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

  // The save endpoint returns the full updated guest, so patch it into the list
  // in place — including the Scheduled Appointment flag the save may have set,
  // which is what turns the row's outline green.
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

  const filterCounts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, guests.filter(f.match).length])) as Record<GuestFilter, number>,
    [guests],
  );

  /** Distinct SMD / MD / Leader names present in the loaded list, for the selects. */
  const uplineOptions = useMemo(() => {
    const options = {} as Record<UplineFilterKey, string[]>;
    for (const { key, field } of UPLINE_FILTERS) {
      options[key] = [...new Set(guests.map((g) => g[field]).filter((name): name is string => Boolean(name)))].sort();
    }
    return options;
  }, [guests]);

  const visibleGuests = useMemo(() => {
    const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
    const term = search.trim().toLowerCase();
    return guests.filter((g) => {
      if (!activeFilter.match(g)) return false;
      // The three upline selects narrow cumulatively — picking an SMD and then
      // a Leader under them is the normal way a leader finds their own people.
      for (const { key, field } of UPLINE_FILTERS) {
        const wanted = uplineFilter[key];
        if (wanted && g[field] !== wanted) return false;
      }
      if (!term) return true;
      const haystack = [g.prospect_detail?.name, g.prospect_detail?.email, g.prospect_detail?.phone, g.inviter_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [guests, filter, search, uplineFilter]);

  return (
    <BPMPageShell
      title="Guest Check-In"
      description="Check guests in as they arrive at the BPM."
      actions={
        capabilities?.can_manage_templates ? (
          <Button variant="outline" onClick={() => setManageOptionsOpen(true)}>
            Manage interest options
          </Button>
        ) : null
      }
    >
      <BPMCard className="mb-4">
        <BPMOccurrencePicker allowPast />
      </BPMCard>

      {occurrence ? (
        <>
          <CheckinWindowNotice occurrence={occurrence} />

          <CheckinStatCards
            occurrenceId={occurrence.id}
            audience="guest"
            dimensions={GUEST_DIMENSIONS}
            reloadKey={statsVersion}
          />

          <BPMCard>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
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
                {UPLINE_FILTERS.map(({ key, label }) => (
                  <Select
                    key={key}
                    variant="surface"
                    className="w-auto"
                    value={uplineFilter[key]}
                    aria-label={`Filter by ${label}`}
                    onChange={(e) => setUplineFilter((prev) => ({ ...prev, [key]: e.target.value }))}
                  >
                    <option value="">All {label}s</option>
                    {uplineOptions[key].map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </Select>
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
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="whitespace-nowrap"
                  onClick={() => setQrOpen(true)}
                >
                  QR
                </Button>
                <Button type="button" size="sm" className="whitespace-nowrap" onClick={() => setAddGuestOpen(true)}>
                  + Add Guest
                </Button>
              </div>
            </div>

            <div className="mb-3 text-xs text-slate-500 dark:text-white/60">
              Showing {visibleGuests.length} of {totalInvites} · {totalCheckedIn} checked in
            </div>

            {loading ? (
              <LoadingState />
            ) : (
              <GuestCheckinTable
                guests={visibleGuests}
                busy={busy}
                canCheckIn={checkinOpen}
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
                          // This adds *and* checks in, so it obeys the window
                          // too — otherwise it would be a way around it.
                          disabled={busy || !checkinOpen}
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
        heading="Blue card"
        occurrence={occurrence}
        interestOptions={interestOptions}
        appointmentTypes={appointmentTypes}
        onClose={() => setFollowUpTarget(null)}
        onSaved={handleFollowUpSaved}
      />
      <InterestOptionsAdminModal
        open={manageOptionsOpen}
        options={interestOptions}
        onClose={() => setManageOptionsOpen(false)}
        onChanged={loadInterestOptions}
      />
      {/* A scan checks somebody in as an *associate*, which is the only direction
          that exists (D8 leaves guest codes out of scope), so this reloads the
          guest list only because the stat cards above it share the occurrence. */}
      <BpmQrModal
        open={qrOpen}
        occurrenceId={occurrence?.id ?? null}
        onClose={() => setQrOpen(false)}
        onCheckedIn={() => {
          if (occurrence) void load(occurrence.id);
        }}
      />
    </BPMPageShell>
  );
}

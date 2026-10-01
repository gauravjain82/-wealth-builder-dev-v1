import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, LoadingState, Select } from '@shared/components';
import { useToastStore } from '@/store';
import { AppointmentFormModal } from '@/features/matchup/components/appointment-form-modal';
import { matchupService } from '@/features/matchup/services/matchup-service';
import type { AppointmentType, CreateAppointmentPayload } from '@/features/matchup/types';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { useBpmSelection } from '../context/bpm-selection-context';
import { useScopeLocation } from '../hooks/use-scope-location';
import { ScopeLocationSelect } from '../components/scope-location-select';
import { CheckinStatCards, type CheckinCountCard } from '../components/checkin-stat-cards';
import { CheckinWindowNotice } from '../components/checkin-window-notice';
import { canCheckInNow } from '../components/checkin-window';
import { BpmQrModal } from '../components/bpm-qr-modal';
import { GuestCheckinTable } from '../components/guest-checkin-table';
import { AddGuestModal } from '../components/add-guest-modal';
import { FollowUpGuestModal } from '../components/follow-up-guest-modal';
import { blueCardAppointmentValues } from '../components/blue-card-appointment';
import { InterestOptionsAdminModal } from '../components/interest-options-admin-modal';
import { bpmService, findStepOneTypeId } from '../services/bpm-service';
import type {
  BPMCapabilities,
  BPMGuest,
  BPMInterestOption,
  BPMOccurrence,
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

/** Attended on Zoom, falling back to the invite-time expectation until it is set. */
function attendsOnZoom(guest: BPMGuest): boolean {
  return guest.attended_zoom ?? guest.zoom;
}

/**
 * How the guest is attending — a second pill group, independent of the first.
 *
 * The two combine rather than replace each other: "Checked In" + "Zoom" is the
 * question a host asks when the room count and the call count disagree.
 */
type ZoomFilter = 'all' | 'live' | 'zoom';

const ZOOM_FILTERS: { key: ZoomFilter; label: string; match: (g: BPMGuest) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'live', label: 'Live', match: (g) => !attendsOnZoom(g) },
  { key: 'zoom', label: 'Zoom', match: (g) => attendsOnZoom(g) },
];

/**
 * The person selects — the three uplines, then the inviter — and which field on
 * a guest row each one reads. The inviter sits beside Leader because that is
 * the level below it: the person who actually brought the guest.
 */
const PERSON_FILTERS = [
  { key: 'smd', label: 'SMD', field: 'smd_name', allLocationsOnly: false },
  { key: 'md', label: 'MD', field: 'md_name', allLocationsOnly: false },
  { key: 'leader', label: 'Leader', field: 'leader_name', allLocationsOnly: false },
  { key: 'inviter', label: 'Inviter', field: 'inviter_name', allLocationsOnly: false },
  // Not a person, but it narrows the same way and belongs in the same row. Only
  // offered when the list spans a date's locations — otherwise it has one value.
  { key: 'location', label: 'Location', field: 'occurrence_label', allLocationsOnly: true },
] as const;

type PersonFilterKey = (typeof PERSON_FILTERS)[number]['key'];

const NO_PERSON_FILTER: Record<PersonFilterKey, string> = {
  smd: '',
  md: '',
  leader: '',
  inviter: '',
  location: '',
};

/**
 * The plain counters before the rankings, counted from the guest list itself.
 *
 * Not from the stats payload: its guest `totals` count distinct *inviters*
 * (they answer "how many people brought somebody"), which is the wrong number
 * for "Guests Invited". A guest on two locations' lists counts once (D22), by
 * prospect; a row without a prospect counts on its own.
 */
function guestCountCards(guests: BPMGuest[]): CheckinCountCard[] {
  const people = new Map<string, boolean>();
  for (const guest of guests) {
    const key = guest.prospect !== null ? `p${guest.prospect}` : `g${guest.id}`;
    people.set(key, Boolean(people.get(key)) || Boolean(guest.checked_in_at));
  }
  const invited = people.size;
  const checkedIn = [...people.values()].filter(Boolean).length;
  const ratio = invited ? Math.round((checkedIn / invited) * 100) : 0;
  return [
    { key: 'invited', label: 'Guests Invited', value: invited, colorKey: 'guests_invited' },
    { key: 'checked_in', label: 'Guests Checked In', value: checkedIn, colorKey: 'guests_checked_in' },
    { key: 'ratio', label: 'Attendance Ratio', value: `${ratio}%`, colorKey: 'guests_ratio' },
  ];
}

/** Which rankings Guest Check-In shows, in card order. */
const GUEST_DIMENSIONS: CheckinDimension[] = ['inviter', 'leader', 'md', 'smd'];

/** Pill styling shared by both groups. */
function pillClass(active: boolean): string {
  return `rounded-full border px-3 py-1 text-xs font-medium transition ${
    active
      ? 'border-amber-400 bg-amber-400/15 text-amber-600 dark:text-amber-300'
      : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10'
  }`;
}

export default function GuestCheckinPage() {
  const addToast = useToastStore((state) => state.addToast);
  // Sticky: the BPM/date chosen here follows the user to the other sub-tools.
  // In All-locations mode `occurrence` is the date's first location — the anchor
  // — and the list covers `scopeOccurrences`. A row acts on its own
  // `guest.occurrence`; a *new* guest lands on the chosen `addLocation`.
  const { occurrence, allLocations, scopeOccurrences, scopeIds } = useBpmSelection();
  const {
    choices: locationChoices,
    location: addLocation,
    setLocationId: setAddLocationId,
  } = useScopeLocation();
  // Compared by value: the ids array is rebuilt whenever the occurrence list
  // refreshes, and that alone must not reload the guests.
  const scopeKey = scopeIds.join(',');
  const [guests, setGuests] = useState<BPMGuest[]>([]);
  const countCards = useMemo(() => guestCountCards(guests), [guests]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<GuestFilter>('all');
  const [zoomFilter, setZoomFilter] = useState<ZoomFilter>('all');
  const [personFilter, setPersonFilter] = useState<Record<PersonFilterKey, string>>(NO_PERSON_FILTER);
  const [search, setSearch] = useState('');
  // QR sits on the date picker, beside the date its code belongs to.
  const [qrOpen, setQrOpen] = useState(false);
  const [followUpTarget, setFollowUpTarget] = useState<BPMGuest | null>(null);
  // The guest a row-level "Schedule appointment" is booking for. Null means the
  // form is closed, so there is no second boolean to keep in step with it.
  const [appointmentTarget, setAppointmentTarget] = useState<BPMGuest | null>(null);
  const [savingAppointment, setSavingAppointment] = useState(false);
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
  // Bumped on every row change so the leaderboards re-fetch. They are read while
  // the room fills up, so a card that lags the list is worse than a slow one.
  // The cards refetch on their own; the table is never blanked for them.
  const [statsVersion, setStatsVersion] = useState(0);
  // Server-derived: the window opens N hours before start and closes N hours
  // after the end. Before it opens nobody may check in; after it closes only a
  // holder of `can_checkin_after_close` (BPM managers) may. Everything else on
  // this page keeps working either way — only checking *in* is held back, and
  // undo never is.
  //
  // The window belongs to each location, so it is judged per row, against the
  // row's own occurrence — and, for adding somebody new, against the location
  // they are being added to.
  const canCheckinAfterClose = capabilities?.can_checkin_after_close;
  const occurrenceById = useMemo(
    () => new Map(scopeOccurrences.map((row) => [row.id, row] as const)),
    [scopeOccurrences],
  );
  /** The occurrence a row belongs to; the anchor only if it is somehow not in scope. */
  const occurrenceOf = useCallback(
    (guest: BPMGuest | null): BPMOccurrence | null =>
      guest ? (occurrenceById.get(guest.occurrence) ?? occurrence) : occurrence,
    [occurrenceById, occurrence],
  );
  const canCheckInGuest = useCallback(
    (guest: BPMGuest) => canCheckInNow(occurrenceById.get(guest.occurrence) ?? null, canCheckinAfterClose),
    [occurrenceById, canCheckinAfterClose],
  );
  const addCheckinOpen = canCheckInNow(addLocation, canCheckinAfterClose);
  const stepOneTypeId = useMemo(() => findStepOneTypeId(appointmentTypes), [appointmentTypes]);

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

  // Only the latest request may write the list: switching dates (or between one
  // location and all of them) while a slow load is in flight must not paint the
  // old scope's guests over the new one.
  const loadRequest = useRef(0);

  /**
   * Fetch the whole list.
   *
   * `quiet` keeps the table on screen while it refetches — for quick-add, the
   * Add Guest modal and QR scans, which may add rows this page has never seen.
   * The loading state is for the first load and a change of date only: a door
   * list that blanks on every action loses the operator's place in it.
   */
  const load = useCallback(
    async (occurrenceIds: number[], { quiet = false }: { quiet?: boolean } = {}) => {
      const request = ++loadRequest.current;
      if (!quiet) setLoading(true);
      try {
        const rows = await bpmService.guestsForScope(occurrenceIds);
        if (request !== loadRequest.current) return;
        setGuests(rows);
        setStatsVersion((version) => version + 1);
      } catch (error) {
        if (request !== loadRequest.current) return;
        addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load guests' });
      } finally {
        if (request === loadRequest.current) setLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    // A name picked for the last scope need not exist in this one, and a select
    // holding a value it has no option for would silently show nobody.
    setPersonFilter(NO_PERSON_FILTER);
    if (scopeKey) {
      void load(scopeKey.split(',').map(Number));
    } else {
      // Nothing selected: retire any load still in flight so it cannot land.
      loadRequest.current += 1;
      setLoading(false);
      setGuests([]);
    }
  }, [scopeKey, load]);

  /** Quietly refetch the current scope — after an add or a scan. */
  const reload = useCallback(() => {
    if (scopeKey) void load(scopeKey.split(',').map(Number), { quiet: true });
  }, [scopeKey, load]);

  /**
   * Put one server-returned guest back into the list in place.
   *
   * Every row action's endpoint returns the updated guest, so this is all a row
   * change needs — no refetch, no loading swap. The stats cards refetch in the
   * background, since most of these move a number on them.
   */
  const patchGuest = useCallback((updated: BPMGuest) => {
    setGuests((prev) => prev.map((guest) => (guest.id === updated.id ? updated : guest)));
    setStatsVersion((version) => version + 1);
  }, []);

  const toggleCheckIn = async (guest: BPMGuest) => {
    if (!occurrence) return;
    setBusy(true);
    try {
      if (guest.checked_in_at) {
        patchGuest(await bpmService.undoCheckInGuest(guest.occurrence, guest.id));
        addToast({ type: 'success', message: 'Check-in undone.' });
      } else {
        patchGuest(await bpmService.checkInGuest(guest.occurrence, guest.id));
        addToast({ type: 'success', message: `${guest.prospect_detail?.name || 'Guest'} checked in.` });
      }
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
      patchGuest(await bpmService.setGuestFlags(guest.occurrence, { guest_id: guest.id, [field]: value }));
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update outcome' });
    } finally {
      setBusy(false);
    }
  };

  // Z: what actually happened on the night. Writes `attended_zoom`, never the
  // invite-time `zoom`, which stays Guest Invites' answer.
  const setGuestZoom = async (guest: BPMGuest, value: boolean) => {
    if (!occurrence) return;
    setBusy(true);
    try {
      patchGuest(await bpmService.setGuestFlags(guest.occurrence, { guest_id: guest.id, attended_zoom: value }));
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update Zoom' });
    } finally {
      setBusy(false);
    }
  };

  // The save endpoint returns the full updated guest, so patch it into the list
  // in place — including the Scheduled Appointment flag the save may have set,
  // which is what turns the row's outline green.
  const handleFollowUpSaved = patchGuest;

  /**
   * Row-level "Schedule appointment": the blue card's booking, without the card.
   *
   * Same form, same prefill as the button inside the card, and the new
   * appointment is linked to the guest's followup at once — the link is what
   * fills the Blue card button and ticks Scheduled Appointment.
   *
   * A failed *create* is rethrown so the form shows it beside Save and stays
   * open. A failed *link* is not: the appointment exists by then, and leaving
   * the form open would invite a second one.
   */
  const scheduleAppointment = async (payload: CreateAppointmentPayload) => {
    const guest = appointmentTarget;
    if (!guest) return;
    setSavingAppointment(true);
    try {
      const created = await matchupService.createAppointment(payload);
      // The save is a whole-card write: send the card's current answers back
      // with the link, so linking an appointment never blanks a blue card that
      // was already filled in.
      const card = guest.followup;
      try {
        patchGuest(
          await bpmService.saveGuestFollowup(guest.occurrence, {
            guest_id: guest.id,
            ...(card
              ? {
                  spouse_name: card.spouse_name,
                  interests: card.interests,
                  referral_note: card.referral_note,
                  collected_by: card.collected_by,
                }
              : {}),
            appointment_id: created.id,
          }),
        );
        addToast({ type: 'success', message: 'Appointment created and linked.' });
      } catch (error) {
        addToast({
          type: 'error',
          message: `Appointment created, but linking it to the blue card failed: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        });
      }
      setAppointmentTarget(null);
    } finally {
      setSavingAppointment(false);
    }
  };

  const appointmentInitialValues = useMemo(
    // The row's own date and location name the auto-note, not the anchor's.
    () => blueCardAppointmentValues(appointmentTarget, occurrenceOf(appointmentTarget), stepOneTypeId),
    [appointmentTarget, occurrenceOf, stepOneTypeId],
  );

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
  // In All-locations mode they land on the chosen "Add to location".
  const quickAddProspect = async (prospect: ProspectSearchHit) => {
    const target = addLocation;
    if (!target) return;
    setBusy(true);
    try {
      const name = prospect.name || `${prospect.first_name} ${prospect.last_name}`.trim();
      const guest = await bpmService.addGuest(target.id, {
        guest_name: name,
        prospect: prospect.id,
        inviter: prospect.recruited_by,
        notes: '',
      });
      await bpmService.checkInGuest(target.id, guest.id);
      addToast({ type: 'success', message: `${name || 'Guest'} added and checked in.` });
      setSearch('');
      // A new row, so the list is refetched — quietly, without the loading swap.
      if (scopeKey) await load(scopeKey.split(',').map(Number), { quiet: true });
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
      patchGuest(await bpmService.addGuestNote(guest.occurrence, { guest_id: guest.id, text }));
      addToast({ type: 'success', message: 'Note added.' });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to add note' });
    } finally {
      setBusy(false);
    }
  };

  const totalInvites = guests.length;
  const totalCheckedIn = useMemo(() => guests.filter((g) => g.checked_in_at).length, [guests]);

  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const activeZoomFilter = ZOOM_FILTERS.find((f) => f.key === zoomFilter) ?? ZOOM_FILTERS[0];

  // Each group's counts are taken with the *other* group applied, so the pills
  // in a row always add up to the one selected beside them.
  const filterCounts = useMemo(() => {
    const pool = guests.filter(activeZoomFilter.match);
    return Object.fromEntries(FILTERS.map((f) => [f.key, pool.filter(f.match).length])) as Record<GuestFilter, number>;
  }, [guests, activeZoomFilter]);

  const zoomFilterCounts = useMemo(() => {
    const pool = guests.filter(activeFilter.match);
    return Object.fromEntries(ZOOM_FILTERS.map((f) => [f.key, pool.filter(f.match).length])) as Record<
      ZoomFilter,
      number
    >;
  }, [guests, activeFilter]);

  /** Distinct SMD / MD / Leader / Inviter names present in the loaded list, for the selects. */
  const personOptions = useMemo(() => {
    const options = {} as Record<PersonFilterKey, string[]>;
    for (const { key, field } of PERSON_FILTERS) {
      // Distinct labels: filtering is by label, the same thing the column shows.
      options[key] = [...new Set(guests.map((g) => g[field]).filter((name): name is string => Boolean(name)))].sort();
    }
    return options;
  }, [guests]);

  const visibleGuests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return guests.filter((g) => {
      if (!activeFilter.match(g)) return false;
      if (!activeZoomFilter.match(g)) return false;
      // The person selects narrow cumulatively — picking an SMD and then a
      // Leader under them is the normal way a leader finds their own people.
      for (const { key, field } of PERSON_FILTERS) {
        const wanted = personFilter[key];
        if (wanted && g[field] !== wanted) return false;
      }
      if (!term) return true;
      const haystack = [g.prospect_detail?.name, g.prospect_detail?.email, g.prospect_detail?.phone, g.inviter_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [guests, activeFilter, activeZoomFilter, search, personFilter]);

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
        <BPMOccurrencePicker
          allowPast
          dateAction={
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="whitespace-nowrap"
              disabled={!occurrence}
              onClick={() => setQrOpen(true)}
            >
              QR
            </Button>
          }
        />
      </BPMCard>

      {occurrence ? (
        <>
          {/* The anchor's window stands for the date's. In All-locations mode the
              locations share the date but each has its own window, so a
              location starting at another hour can be open while this says
              otherwise — the per-row buttons are judged on their own
              occurrence, so this is only the headline, not the gate. */}
          <CheckinWindowNotice
            occurrence={occurrence}
            canCheckinAfterClose={capabilities?.can_checkin_after_close ?? false}
          />

          <CheckinStatCards
            occurrenceIds={scopeIds}
            audience="guest"
            countCards={countCards}
            dimensions={GUEST_DIMENSIONS}
            reloadKey={statsVersion}
          />

          <BPMCard>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Attendance">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      aria-pressed={filter === f.key}
                      onClick={() => setFilter(f.key)}
                      className={pillClass(filter === f.key)}
                    >
                      {f.label} ({filterCounts[f.key]})
                    </button>
                  ))}
                </div>
                <div
                  className="flex flex-wrap items-center gap-2 border-l border-slate-200 pl-2 dark:border-white/10"
                  role="group"
                  aria-label="Attending live or on Zoom"
                >
                  {ZOOM_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      aria-pressed={zoomFilter === f.key}
                      onClick={() => setZoomFilter(f.key)}
                      className={pillClass(zoomFilter === f.key)}
                    >
                      {f.label} ({zoomFilterCounts[f.key]})
                    </button>
                  ))}
                </div>
                {PERSON_FILTERS.filter((f) => allLocations || !f.allLocationsOnly).map(({ key, label }) => (
                  <Select
                    key={key}
                    variant="surface"
                    className="w-auto"
                    value={personFilter[key]}
                    aria-label={`Filter by ${label}`}
                    onChange={(e) => setPersonFilter((prev) => ({ ...prev, [key]: e.target.value }))}
                  >
                    <option value="">All {label}s</option>
                    {personOptions[key].map((name) => (
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
                canCheckIn={canCheckInGuest}
                showLocation={allLocations}
                onToggleCheckIn={toggleCheckIn}
                onSetOutcome={setGuestOutcome}
                onAddNote={addGuestNote}
                onFollowUp={setFollowUpTarget}
                onScheduleAppointment={setAppointmentTarget}
                onSetZoom={setGuestZoom}
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
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/60">
                      <span>Prospects not yet invited</span>
                      {prospectSearching ? <span className="font-normal normal-case text-slate-400">searching…</span> : null}
                    </div>
                    {/* Where "Add & Check in" puts them. Renders only in
                        All-locations mode; the same sticky choice as the modal's. */}
                    <ScopeLocationSelect
                      choices={locationChoices}
                      value={addLocation}
                      onChange={setAddLocationId}
                      label="Add to location"
                    />
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
                          disabled={busy || !addCheckinOpen}
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
        presetOccurrence={addLocation}
        locationChoices={locationChoices}
        onLocationChange={setAddLocationId}
        onClose={() => setAddGuestOpen(false)}
        onAdded={reload}
      />

      <FollowUpGuestModal
        open={Boolean(followUpTarget)}
        guest={followUpTarget}
        heading="Blue card"
        occurrence={occurrenceOf(followUpTarget)}
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
      <AppointmentFormModal
        open={appointmentTarget !== null}
        title="Blue Card Follow Up"
        initialValues={appointmentInitialValues}
        appointmentTypes={appointmentTypes}
        saving={savingAppointment}
        onClose={() => setAppointmentTarget(null)}
        onSubmit={scheduleAppointment}
      />
      {/* A scan here can land on either list: an associate code records an
          associate, and a guest's pass checks in a row on the very list behind
          this modal (D8 reopened). A quiet reload covers both. There is no
          "show pass" on this page — the guest has the pass by email.
          All-locations mode: the modal asks which location's code (D24), and a
          scan at any location in scope reloads the list; one outside it does
          not touch this list. */}
      <BpmQrModal
        open={qrOpen}
        occurrenceId={addLocation?.id ?? occurrence?.id ?? null}
        locations={scopeOccurrences}
        onLocationChange={setAddLocationId}
        onClose={() => setQrOpen(false)}
        onCheckedIn={(result) => {
          if (scopeIds.includes(result.occurrence_id)) reload();
        }}
      />
    </BPMPageShell>
  );
}

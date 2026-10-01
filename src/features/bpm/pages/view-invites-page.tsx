import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, LoadingState, Select } from '@shared/components';
import { useToastStore } from '@/store';
import { AppointmentFormModal } from '@/features/matchup/components/appointment-form-modal';
import { matchupService } from '@/features/matchup/services/matchup-service';
import type { AppointmentType } from '@/features/matchup/types';
import { AddGuestModal } from '../components/add-guest-modal';
import { BPMCard, BPMPageShell } from '../components/bpm-page-shell';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { useBpmSelection } from '../context/bpm-selection-context';
import { GuestList } from '../components/guest-list';
import { ScopeLocationSelect } from '../components/scope-location-select';
import { useScopeLocation } from '../hooks/use-scope-location';
import { RescheduleGuestModal } from '../components/reschedule-guest-modal';
import { SendEventModal } from '../components/send-event-modal';
import { GuestMessageHistoryModal } from '../components/guest-message-history';
import { TransferGuestModal } from '../components/transfer-guest-modal';
import { bpmService, findStepOneTypeId, formatOccurrenceTime } from '../services/bpm-service';
import { mergeGuest } from '../components/guest-notes';
import type { BPMCapabilities, BPMGuest, GuestFlagField } from '../types';

/**
 * Confirmation pills. Mutually exclusive, like Guest Check-In's attendance
 * pills: before the night, the list is worked by who has not confirmed yet.
 */
type ConfirmFilter = 'all' | 'not_confirmed' | 'confirmed';

const CONFIRM_FILTERS: { key: ConfirmFilter; label: string; match: (g: BPMGuest) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'not_confirmed', label: 'Not Confirmed', match: (g) => !g.confirmed },
  { key: 'confirmed', label: 'Confirmed', match: (g) => g.confirmed },
];

/** The four people selects, and which name on a guest row each one reads. */
const PEOPLE_FILTERS = [
  { key: 'inviter', label: 'Inviter', field: 'inviter_name' },
  { key: 'leader', label: 'Leader', field: 'leader_name' },
  { key: 'md', label: 'MD', field: 'md_name' },
  { key: 'smd', label: 'SMD', field: 'smd_name' },
] as const;

type PeopleFilterKey = (typeof PEOPLE_FILTERS)[number]['key'];

const NO_PEOPLE_FILTER: Record<PeopleFilterKey, string> = { inviter: '', leader: '', md: '', smd: '' };

export default function ViewInvitesPage() {
  const addToast = useToastStore((state) => state.addToast);
  // Sticky: the BPM/date chosen here follows the user to the other sub-tools.
  // In All-locations mode the list is every location of the date; `occurrence`
  // is then only the date's first location, so nothing that acts on a row reads
  // it — each row acts on its own `guest.occurrence`.
  const { occurrence, allLocations, scopeIds, scopeOccurrences } = useBpmSelection();
  // Where a *new* guest lands when the list spans several locations. Sticky per
  // BPM; the select renders nothing outside All-locations mode.
  const addLocation = useScopeLocation();
  // The scope as a value, so a refetch of the same occurrences (new objects,
  // same ids) does not reload the list, and a stale response can be told apart.
  const scopeKey = scopeIds.join(',');
  const [guests, setGuests] = useState<BPMGuest[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyGuestId, setBusyGuestId] = useState<number | null>(null);
  // Rows with a flag save in flight. Their checkboxes are held until it lands:
  // un-confirming clears Z on the server, so a Z ticked meanwhile would be
  // undone by the C response that arrives after it.
  const [savingGuestIds, setSavingGuestIds] = useState<Set<number>>(new Set());
  const [transferTarget, setTransferTarget] = useState<BPMGuest | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<BPMGuest | null>(null);
  // Who the sender has ticked to message. Ids, not guest objects, so a reload
  // of the list does not strand a selection against stale rows.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sendOpen, setSendOpen] = useState(false);
  const [historyGuest, setHistoryGuest] = useState<BPMGuest | null>(null);
  const [appointmentTarget, setAppointmentTarget] = useState<BPMGuest | null>(null);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [confirmFilter, setConfirmFilter] = useState<ConfirmFilter>('all');
  const [peopleFilter, setPeopleFilter] = useState<Record<PeopleFilterKey, string>>(NO_PEOPLE_FILTER);
  // An occurrence id as a string, '' for every location. All-locations mode only.
  const [locationFilter, setLocationFilter] = useState('');
  // Null until loaded, and read as "no": the mutating controls appear once the
  // grant is known rather than flashing in and out for a viewer without it.
  const [capabilities, setCapabilities] = useState<BPMCapabilities | null>(null);
  // bpm_guests:manage. Hides every control that writes — the backend refuses
  // each of them anyway, so this decides what renders, not what is allowed.
  const canManage = Boolean(capabilities?.can_manage_guests);

  useEffect(() => {
    bpmService.capabilities().then(setCapabilities).catch(() => setCapabilities(null));
  }, []);

  // The Overview / Schedule "Add Guest" action routes here with `&add=1` rather
  // than to a page of its own, so the guest is added in the context of the list
  // being worked from, with the BPM/date already chosen. Consume the flag so a
  // refresh does not reopen the modal.
  useEffect(() => {
    if (searchParams.get('add') !== '1') return;
    setAddGuestOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('add');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);

  useEffect(() => {
    matchupService.appointmentTypes().then(setAppointmentTypes).catch(() => setAppointmentTypes([]));
  }, []);

  const stepOneTypeId = useMemo(() => findStepOneTypeId(appointmentTypes), [appointmentTypes]);

  // A response for a scope the user has already moved off must not land on the
  // one they moved to.
  const latestLoadRef = useRef(0);

  /**
   * Fetch the scope's guests — one location, or the union of the date's.
   *
   * `quiet` refreshes in place — after a send or an add — instead of swapping
   * the table for a spinner, so the rows being worked do not blink away and
   * lose the reader's place. Only a change of scope shows the loading state.
   */
  const load = useCallback(
    async (occurrenceIds: number[], { quiet = false }: { quiet?: boolean } = {}) => {
      const requestId = ++latestLoadRef.current;
      if (!quiet) setLoading(true);
      try {
        const rows = await bpmService.guestsForScope(occurrenceIds);
        if (requestId === latestLoadRef.current) setGuests(rows);
      } catch (error) {
        if (requestId === latestLoadRef.current) {
          addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load guests' });
        }
      } finally {
        if (requestId === latestLoadRef.current) setLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    // A name (or location) picked for the last scope need not exist on this one,
    // and a select holding a value it has no option for would silently show nobody.
    setPeopleFilter(NO_PEOPLE_FILTER);
    setLocationFilter('');
    if (scopeKey) void load(scopeKey.split(',').map(Number));
    else {
      latestLoadRef.current += 1;
      setGuests([]);
    }
  }, [scopeKey, load]);

  /** Quiet reload of whatever scope is showing — after an add or a send. */
  const reload = () => {
    if (scopeIds.length > 0) void load(scopeIds, { quiet: true });
  };

  const patchGuest = (updated: BPMGuest) => setGuests((prev) => mergeGuest(prev, updated));

  /**
   * Optimistic toggle shared by the outcome checkboxes, C and Z. The returned
   * guest is merged in place, which is also how the server's own knock-on
   * edits arrive — un-confirming clears Z.
   */
  const setFlag = async (guest: BPMGuest, field: GuestFlagField, value: boolean) => {
    // Mirror the server's rule locally so Z does not sit ticked on an
    // unconfirmed row for the length of the round trip.
    const cascade = field === 'confirmed' && !value;
    // Only what this call touched, so a failure does not also undo a note or a
    // reschedule that landed on the row in the meantime.
    const previous: Partial<BPMGuest> = cascade
      ? { confirmed: guest.confirmed, zoom: guest.zoom }
      : { [field]: guest[field] };
    const optimistic: Partial<BPMGuest> = cascade ? { confirmed: false, zoom: false } : { [field]: value };
    const patchFields = (fields: Partial<BPMGuest>) =>
      setGuests((prev) => prev.map((row) => (row.id === guest.id ? { ...row, ...fields } : row)));
    setSavingGuestIds((ids) => new Set(ids).add(guest.id));
    patchFields(optimistic);
    try {
      const updated = await bpmService.setGuestFlags(guest.occurrence, { guest_id: guest.id, [field]: value });
      patchGuest(updated);
    } catch (error) {
      patchFields(previous);
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update guest' });
    } finally {
      setSavingGuestIds((ids) => {
        const next = new Set(ids);
        next.delete(guest.id);
        return next;
      });
    }
  };

  const handleRemove = async (guest: BPMGuest) => {
    setBusyGuestId(guest.id);
    try {
      await bpmService.removeGuest(guest.occurrence, guest.id);
      setGuests((prev) => prev.filter((row) => row.id !== guest.id));
      addToast({ type: 'success', message: 'Guest removed.' });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Action failed' });
    } finally {
      setBusyGuestId(null);
    }
  };

  /**
   * Book the 1-on-1 through Match Up, then link it to the guest.
   *
   * The appointment is always created by the Match Up endpoint — BPM never grows
   * a second way to make one — so this is two calls, and a failure to link is
   * reported without discarding the appointment that was created.
   */
  const bookAppointment = async (payload: Parameters<typeof matchupService.createAppointment>[0]) => {
    const guest = appointmentTarget;
    if (!guest) return;
    setSavingAppointment(true);
    try {
      const created = await matchupService.createAppointment(payload);
      const updated = await bpmService.rescheduleGuestToAppointment(guest.occurrence, {
        guest_id: guest.id,
        appointment_id: created.id,
      });
      patchGuest(updated);
      setAppointmentTarget(null);
      addToast({ type: 'success', message: 'Appointment booked and linked.' });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to book appointment' });
    } finally {
      setSavingAppointment(false);
    }
  };

  const appointmentInitialValues = useMemo(() => {
    if (!appointmentTarget) return null;
    // The guest's own location: in All-locations mode `occurrence` is only the
    // date's first, and the locations need not start at the same time.
    const from =
      scopeOccurrences.find((row) => row.id === appointmentTarget.occurrence) ?? occurrence;
    const source = from
      ? `Rescheduled from ${from.event_name} · ${formatOccurrenceTime(from.start_at)}`
      : 'Rescheduled from a BPM';
    return {
      kind: 'REQUEST_TRAINER' as const,
      contact: appointmentTarget.prospect,
      contactLabel: appointmentTarget.prospect_detail?.name ?? '',
      trainee: appointmentTarget.inviter,
      traineeLabel: appointmentTarget.inviter_name ?? '',
      types: stepOneTypeId ? [stepOneTypeId] : [],
      notes: source,
    };
  }, [appointmentTarget, occurrence, scopeOccurrences, stepOneTypeId]);

  const toggleSelected = useCallback((guest: BPMGuest, value: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (value) next.add(guest.id);
      else next.delete(guest.id);
      return next;
    });
  }, []);

  const confirmCounts = useMemo(
    () =>
      Object.fromEntries(
        CONFIRM_FILTERS.map((f) => [f.key, guests.filter(f.match).length]),
      ) as Record<ConfirmFilter, number>,
    [guests],
  );

  /** Distinct names present in the loaded list, for each people select. */
  const peopleOptions = useMemo(() => {
    const options = {} as Record<PeopleFilterKey, string[]>;
    for (const { key, field } of PEOPLE_FILTERS) {
      options[key] = [...new Set(guests.map((g) => g[field]).filter((name): name is string => Boolean(name)))].sort();
    }
    return options;
  }, [guests]);

  /** The locations present in the loaded list, in the date's location order. */
  const locationOptions = useMemo(() => {
    const labels = new Map<number, string>();
    for (const guest of guests) {
      if (!labels.has(guest.occurrence)) {
        labels.set(guest.occurrence, guest.occurrence_label || `Location ${guest.occurrence}`);
      }
    }
    const order = (id: number) => {
      const index = scopeIds.indexOf(id);
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    return [...labels.entries()].sort(([a], [b]) => order(a) - order(b));
  }, [guests, scopeIds]);

  const visibleGuests = useMemo(() => {
    const activeFilter = CONFIRM_FILTERS.find((f) => f.key === confirmFilter) ?? CONFIRM_FILTERS[0];
    return guests.filter((g) => {
      if (!activeFilter.match(g)) return false;
      if (locationFilter && String(g.occurrence) !== locationFilter) return false;
      // Cumulative, as on Guest Check-In: an SMD and then a Leader under them is
      // how a leader finds their own people.
      for (const { key, field } of PEOPLE_FILTERS) {
        const wanted = peopleFilter[key];
        if (wanted && g[field] !== wanted) return false;
      }
      return true;
    });
  }, [guests, confirmFilter, peopleFilter, locationFilter]);

  /** Select-all covers the rows on screen, which is what the filters above mean. */
  const toggleSelectAll = useCallback(
    (value: boolean) => {
      setSelectedIds(value ? new Set(visibleGuests.map((guest) => guest.id)) : new Set());
    },
    [visibleGuests],
  );

  // Kept in sync with the rows on screen: a guest transferred or removed
  // elsewhere, or filtered out since being ticked, must not stay silently
  // selected and then be messaged. What the send button counts is what shows.
  const selectedGuests = useMemo(
    () => visibleGuests.filter((guest) => selectedIds.has(guest.id)),
    [visibleGuests, selectedIds],
  );

  /**
   * Who the send button targets.
   *
   * **Ticking nothing means everyone shown**, so chasing a whole list is one
   * click rather than select-all-then-send. Ticking narrows it. Either way the
   * modal lists exactly who is about to be written to, with what each of them has
   * already had, so "one click" opens a confirmation rather than sending.
   *
   * The server still requires explicit ids — there is no "send to everyone on
   * this date" shorthand it could be asked for by mistake.
   */
  const sendTargets = selectedGuests.length > 0 ? selectedGuests : visibleGuests;

  return (
    <BPMPageShell
      title="Guest Invites"
      description="Guests invited to a BPM. Confirm attendance, track follow-up outcomes, or move a guest to another event."
      actions={
        // Both write: a send is gated on bpm_guests:manage server-side, like an add.
        canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            {sendTargets.length > 0 ? (
              <Button variant="outline" onClick={() => setSendOpen(true)}>
                {selectedGuests.length > 0
                  ? `Send event to ${selectedGuests.length} selected`
                  : `Send event to all ${sendTargets.length}`}
              </Button>
            ) : null}
            <ScopeLocationSelect
              label="Add to location"
              choices={addLocation.choices}
              value={addLocation.location}
              onChange={addLocation.setLocationId}
            />
            <Button disabled={!addLocation.location} onClick={() => setAddGuestOpen(true)}>
              + Add Guest
            </Button>
          </div>
        ) : null
      }
    >
      <BPMCard className="mb-4">
        <BPMOccurrencePicker allowPast />
      </BPMCard>
      <BPMCard>
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {guests.length > 0 ? (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {CONFIRM_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      aria-pressed={confirmFilter === f.key}
                      onClick={() => setConfirmFilter(f.key)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        confirmFilter === f.key
                          ? 'border-amber-400 bg-amber-400/15 text-amber-600 dark:text-amber-300'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10'
                      }`}
                    >
                      {f.label} ({confirmCounts[f.key]})
                    </button>
                  ))}
                  {PEOPLE_FILTERS.map(({ key, label }) => (
                    <Select
                      key={key}
                      variant="surface"
                      className="w-auto"
                      value={peopleFilter[key]}
                      aria-label={`Filter by ${label}`}
                      onChange={(e) => setPeopleFilter((prev) => ({ ...prev, [key]: e.target.value }))}
                    >
                      <option value="">All {label}s</option>
                      {peopleOptions[key].map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </Select>
                  ))}
                  {allLocations ? (
                    <Select
                      variant="surface"
                      className="w-auto"
                      value={locationFilter}
                      aria-label="Filter by Location"
                      onChange={(e) => setLocationFilter(e.target.value)}
                    >
                      <option value="">All Locations</option>
                      {locationOptions.map(([id, label]) => (
                        <option key={id} value={String(id)}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  ) : null}
                </div>
                <div className="mb-3 text-xs text-slate-500 dark:text-white/60">
                  Showing {visibleGuests.length} of {guests.length}
                </div>
              </>
            ) : null}
            <GuestList
              guests={visibleGuests}
              showLocation={allLocations}
              emptyMessage={guests.length > 0 ? 'No guests match these filters.' : undefined}
              busyGuestId={busyGuestId}
              savingGuestIds={savingGuestIds}
              readOnly={!canManage}
              onGuestUpdated={patchGuest}
              onSetConfirmed={(guest, value) => setFlag(guest, 'confirmed', value)}
              onSetZoom={(guest, value) => setFlag(guest, 'zoom', value)}
              onSetOutcome={(guest, field, value) => setFlag(guest, field, value)}
              onOpenMessageHistory={setHistoryGuest}
              // Selection only feeds the send, so it goes with it.
              selectedIds={canManage ? selectedIds : undefined}
              onToggleSelected={canManage ? toggleSelected : undefined}
              onToggleSelectAll={canManage ? toggleSelectAll : undefined}
              onReschedule={canManage ? (guest) => setRescheduleTarget(guest) : undefined}
              onBookAppointment={canManage ? (guest) => setAppointmentTarget(guest) : undefined}
              onTransfer={canManage ? (guest) => setTransferTarget(guest) : undefined}
              onRemove={canManage ? handleRemove : undefined}
            />
          </>
        )}
      </BPMCard>
      <AddGuestModal
        // `?add=1` is consumed before the grant is known; the modal waits for it.
        open={addGuestOpen && canManage}
        // The chosen location in All-locations mode; otherwise the selected date.
        presetOccurrence={addLocation.location}
        // Reached by the calendar's ?add=1 too, where the page's own location
        // select is hidden behind the modal — so the modal offers the choice.
        locationChoices={addLocation.choices}
        onLocationChange={addLocation.setLocationId}
        onClose={() => setAddGuestOpen(false)}
        onAdded={reload}
      />
      <SendEventModal
        // Sends once per location the targets are on, each on its own occurrence.
        open={sendOpen}
        guests={sendTargets}
        onClose={() => setSendOpen(false)}
        onSent={() => {
          // Reload so the contact badges reflect what was just sent — the next
          // person looking at this list is who the history exists for.
          reload();
          setSelectedIds(new Set());
        }}
      />
      <GuestMessageHistoryModal
        // Read on the guest's own occurrence, not the page's anchor.
        open={Boolean(historyGuest)}
        guest={historyGuest}
        onClose={() => setHistoryGuest(null)}
      />
      <RescheduleGuestModal
        open={Boolean(rescheduleTarget)}
        guest={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onRescheduled={(source) => patchGuest(source)}
      />
      <TransferGuestModal
        open={Boolean(transferTarget)}
        guest={transferTarget}
        onClose={() => setTransferTarget(null)}
        onTransferred={() => {
          if (transferTarget) {
            setGuests((prev) => prev.filter((guest) => guest.id !== transferTarget.id));
          }
        }}
      />
      <AppointmentFormModal
        open={Boolean(appointmentTarget)}
        title="Reschedule to Appointment"
        initialValues={appointmentInitialValues}
        appointmentTypes={appointmentTypes}
        saving={savingAppointment}
        onClose={() => setAppointmentTarget(null)}
        onSubmit={bookAppointment}
      />
    </BPMPageShell>
  );
}

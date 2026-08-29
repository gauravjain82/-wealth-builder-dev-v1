import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Plus, Unplug, UserPlus } from 'lucide-react';
import { Button, Input, LoadingState, Select, UserAutocompleteDropdown } from '@shared/components';
import { useToastStore } from '@/store';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { hasRoleAtLeast } from '@core/constants/roles';
import { Plan } from '@core/types';
import { matchupService } from '@/features/matchup/services/matchup-service';
import type { AppointmentType } from '@/features/matchup/types';
import { BPMMetricsCards } from '../components/bpm-metrics-cards';
import { BPMMonthCalendar } from '../components/bpm-month-calendar';
import { AddGuestModal } from '../components/add-guest-modal';
import { BPMFormModal } from '../components/bpm-form-modal';
import { BPMOccurrencePicker } from '../components/bpm-occurrence-picker';
import { GuestList } from '../components/guest-list';
import { TransferGuestModal } from '../components/transfer-guest-modal';
import { FollowUpGuestModal } from '../components/follow-up-guest-modal';
import { bpmService, formatOccurrenceTime } from '../services/bpm-service';
import type { AssociateCheckIn, BPMCapabilities, BPMEventDetail, BPMGuest, BPMInterestOption, BPMOccurrence, GoogleStatus, GuestOutcomeField, OccurrenceFilters } from '../types';
// Reuse the Matchup dashboard styling so the BPM overview matches it 1:1.
import '@/features/matchup/pages/matchup-page.css';

const FORMAT_LABELS: Record<string, string> = {
  IN_PERSON: 'In person',
  WEBINAR: 'Webinar',
  WEB_AND_IN_PERSON: 'Web & in person',
};

function monthRange(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function BpmOverviewPage() {
  const addToast = useToastStore((state) => state.addToast);
  const { user } = useAuth();
  // "Add Associate" is a leadership action; only Leader and above may check in associates.
  const isLeaderOrAbove = hasRoleAtLeast(user?.roles ?? [], Plan.Leader);
  const [capabilities, setCapabilities] = useState<BPMCapabilities | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [city, setCity] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [segment, setSegment] = useState('');
  const [occurrences, setOccurrences] = useState<BPMOccurrence[]>([]);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [addGuestFor, setAddGuestFor] = useState<BPMOccurrence | null>(null);
  const [bpmFormOpen, setBpmFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BPMEventDetail | null>(null);
  // Detail views: pick any BPM event/occurrence and inspect its guests or associates.
  const [listView, setListView] = useState<'occurrences' | 'guests' | 'associates'>('occurrences');
  const [detailOccurrence, setDetailOccurrence] = useState<BPMOccurrence | null>(null);
  const [guests, setGuests] = useState<BPMGuest[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');
  const [transferTarget, setTransferTarget] = useState<BPMGuest | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<BPMGuest | null>(null);
  const [interestOptions, setInterestOptions] = useState<BPMInterestOption[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [associates, setAssociates] = useState<AssociateCheckIn[]>([]);
  const [associatesLoading, setAssociatesLoading] = useState(false);
  const [associateSearch, setAssociateSearch] = useState('');

  const filters = useMemo<OccurrenceFilters>(() => {
    const range = monthRange(calendarMonth);
    return {
      start_after: range.start,
      start_before: range.end,
      city: city.trim() || undefined,
      state: stateFilter.trim() || undefined,
      segment: segment || undefined,
      page_size: 200,
    };
  }, [calendarMonth, city, stateFilter, segment]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, google] = await Promise.all([
        bpmService.occurrences(filters),
        bpmService.googleStatus().catch(() => null),
      ]);
      setOccurrences(data.results);
      setGoogleStatus(google);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load BPMs' });
    } finally {
      setLoading(false);
    }
  }, [addToast, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  // Load the user's BPM permissions once; gates the "Create BPM" control.
  useEffect(() => {
    bpmService.capabilities().then(setCapabilities).catch(() => setCapabilities(null));
  }, []);

  // Follow-up form data: interest options and appointment types.
  useEffect(() => {
    bpmService.interestOptions({ ordering: 'sort_order' }).then(setInterestOptions).catch(() => setInterestOptions([]));
    matchupService.appointmentTypes().then(setAppointmentTypes).catch(() => setAppointmentTypes([]));
  }, []);

  const connectGoogle = async () => {
    setBusy(true);
    try {
      const { authorization_url } = await bpmService.startGoogleOAuth();
      window.location.href = authorization_url;
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to start Google sync' });
      setBusy(false);
    }
  };

  const disconnectGoogle = async () => {
    setBusy(true);
    try {
      await bpmService.disconnectGoogle();
      setGoogleStatus({ connected: false });
      addToast({ type: 'success', message: 'Google Calendar disconnected.' });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to disconnect Google' });
    } finally {
      setBusy(false);
    }
  };

  const openAddGuest = (occurrence: BPMOccurrence | null = null) => {
    setAddGuestFor(occurrence);
    setAddGuestOpen(true);
  };

  const openEditEvent = async (occurrence: BPMOccurrence) => {
    setBusy(true);
    try {
      const detail = await bpmService.event(occurrence.event);
      setEditingEvent(detail);
      setBpmFormOpen(true);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load BPM' });
    } finally {
      setBusy(false);
    }
  };

  const cancelOccurrence = async (occurrence: BPMOccurrence) => {
    setBusy(true);
    try {
      await bpmService.cancelOccurrence(occurrence.id);
      addToast({ type: 'success', message: 'Occurrence cancelled.' });
      await load();
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to cancel' });
    } finally {
      setBusy(false);
    }
  };

  const loadGuests = useCallback(
    async (occurrenceId: number) => {
      setGuestsLoading(true);
      try {
        setGuests(await bpmService.guests(occurrenceId));
      } catch (error) {
        addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load guests' });
      } finally {
        setGuestsLoading(false);
      }
    },
    [addToast],
  );

  const loadAssociates = useCallback(
    async (occurrenceId: number) => {
      setAssociatesLoading(true);
      try {
        setAssociates(await bpmService.associateCheckins(occurrenceId));
      } catch (error) {
        addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load associates' });
      } finally {
        setAssociatesLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    if (!detailOccurrence) {
      setGuests([]);
      setAssociates([]);
      return;
    }
    if (listView === 'guests') void loadGuests(detailOccurrence.id);
    if (listView === 'associates') void loadAssociates(detailOccurrence.id);
  }, [listView, detailOccurrence, loadGuests, loadAssociates]);

  const runGuestMutation = async (message: string, action: () => Promise<void>) => {
    if (!detailOccurrence) return;
    setBusy(true);
    try {
      await action();
      addToast({ type: 'success', message });
      await loadGuests(detailOccurrence.id);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Action failed' });
    } finally {
      setBusy(false);
    }
  };

  const setGuestOutcome = (guest: BPMGuest, field: GuestOutcomeField, value: boolean) =>
    runGuestMutation('Outcome saved.', () =>
      bpmService.setGuestFlags(guest.occurrence, { guest_id: guest.id, [field]: value }).then(() => undefined),
    );

  const removeGuest = (guest: BPMGuest) =>
    runGuestMutation('Guest removed.', () => bpmService.removeGuest(guest.occurrence, guest.id).then(() => undefined));

  // The save endpoint returns the full updated guest, so patch it into the list in place.
  const handleFollowUpSaved = (updated: BPMGuest) =>
    setGuests((prev) => prev.map((guest) => (guest.id === updated.id ? updated : guest)));

  const checkInAssociate = async (userId: number) => {
    if (!detailOccurrence) return;
    setBusy(true);
    try {
      await bpmService.checkInAssociate(detailOccurrence.id, userId);
      addToast({ type: 'success', message: 'Associate checked in.' });
      await loadAssociates(detailOccurrence.id);
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Check-in failed' });
    } finally {
      setBusy(false);
    }
  };

  const guestQuery = guestSearch.trim().toLowerCase();
  const filteredGuests = guestQuery
    ? guests.filter((guest) =>
        [guest.prospect_detail?.name, guest.prospect_detail?.phone, guest.prospect_detail?.email, guest.inviter_name]
          .some((field) => field?.toLowerCase().includes(guestQuery)),
      )
    : guests;

  const associateQuery = associateSearch.trim().toLowerCase();
  const filteredAssociates = associateQuery
    ? associates.filter((record) => (record.user_name || '').toLowerCase().includes(associateQuery))
    : associates;

  const upcoming = [...occurrences].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  );

  return (
    <main className="matchup-page">
      <div className="matchup-hero-actions" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>BPM Overview</h1>
        <div className="matchup-hero-actions" style={{ justifyContent: 'flex-end' }}>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void (googleStatus?.connected ? disconnectGoogle() : connectGoogle())}
          title={
            googleStatus?.connected
              ? `Connected${googleStatus.google_email ? ` as ${googleStatus.google_email}` : ''} — synced to your “BPM” calendar`
              : undefined
          }
        >
          {googleStatus?.connected ? <Unplug size={16} /> : <CalendarCheck size={16} />}
          {googleStatus?.connected ? 'Disconnect Google' : 'Google Calendar Sync'}
        </Button>
        {capabilities?.can_create ? (
          <Button variant="outline" onClick={() => { setEditingEvent(null); setBpmFormOpen(true); }}>
            <Plus size={16} /> Create BPM
          </Button>
        ) : null}
        <Button onClick={() => openAddGuest()}>
          <UserPlus size={16} /> Add Guest
        </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-2">
        <div className="min-w-0 flex-[1_1_460px]">
          <BPMMetricsCards occurrences={occurrences} />
        </div>
        <div className="matchup-filter-bar flex-[1_1_300px]">
          <Input variant="surface" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input variant="surface" placeholder="State" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} />
          <Select value={segment} onChange={(e) => setSegment(e.target.value)}>
            <option value="">Baseshop</option>
            <option value="SUPERBASE">Super Base</option>
            <option value="SUPERTEAM">Super Team</option>
          </Select>
        </div>
      </div>

      <BPMMonthCalendar
        month={calendarMonth}
        occurrences={occurrences}
        onMonthChange={setCalendarMonth}
        onOccurrenceClick={(occurrence) => void openEditEvent(occurrence)}
        onAddGuest={(occurrence) => openAddGuest(occurrence)}
      />

      <section className="matchup-panel matchup-list-panel">
        <div className="matchup-panel-header">
          <div className="matchup-view-toggle" role="group" aria-label="BPM list view">
            <Button
              variant={listView === 'occurrences' ? 'default' : 'outline'}
              size="sm"
              aria-pressed={listView === 'occurrences'}
              onClick={() => setListView('occurrences')}
            >
              BPM Events
            </Button>
            <Button
              variant={listView === 'guests' ? 'default' : 'outline'}
              size="sm"
              aria-pressed={listView === 'guests'}
              onClick={() => setListView('guests')}
            >
              Guest List
            </Button>
            <Button
              variant={listView === 'associates' ? 'default' : 'outline'}
              size="sm"
              aria-pressed={listView === 'associates'}
              onClick={() => setListView('associates')}
            >
              Associates
            </Button>
          </div>
          <span>
            {listView === 'occurrences'
              ? upcoming.length
              : listView === 'guests'
                ? filteredGuests.length
                : filteredAssociates.length}
          </span>
        </div>

        {listView === 'guests' ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <BPMOccurrencePicker value={detailOccurrence} onChange={setDetailOccurrence} />
            <Input
              variant="surface"
              placeholder="Search guest by name, phone, email, or inviter…"
              value={guestSearch}
              disabled={!detailOccurrence}
              onChange={(e) => setGuestSearch(e.target.value)}
            />
            {!detailOccurrence ? (
              <p className="matchup-muted">Select a BPM and date to view its guest list.</p>
            ) : guestsLoading ? (
              <LoadingState />
            ) : (
              <GuestList
                guests={filteredGuests}
                busy={busy}
                onSetOutcome={setGuestOutcome}
                onFollowUp={setFollowUpTarget}
                onTransfer={setTransferTarget}
                onRemove={removeGuest}
              />
            )}
          </div>
        ) : listView === 'associates' ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <BPMOccurrencePicker value={detailOccurrence} onChange={setDetailOccurrence} />
            {!detailOccurrence ? (
              <p className="matchup-muted">Select a BPM and date to view associate check-ins.</p>
            ) : (
              <>
                {isLeaderOrAbove ? (
                  <UserAutocompleteDropdown
                    selectedId={null}
                    selectedLabel=""
                    placeholder="Check in an associate"
                    fetchFromApi
                    disabled={busy}
                    buttonText="CHECK IN"
                    onSelect={(option) => void checkInAssociate(option.id)}
                  />
                ) : null}
                <Input
                  variant="surface"
                  placeholder="Search checked-in associates…"
                  value={associateSearch}
                  onChange={(e) => setAssociateSearch(e.target.value)}
                />
                {associatesLoading ? (
                  <LoadingState />
                ) : filteredAssociates.length === 0 ? (
                  <p className="matchup-muted">No associates checked in yet.</p>
                ) : (
                  <div className="matchup-table-wrap">
                    <table className="matchup-table">
                      <thead>
                        <tr>
                          <th>Associate</th>
                          <th>Checked in</th>
                          <th>By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAssociates.map((record) => (
                          <tr key={record.id}>
                            <td>
                              <div className="matchup-cell-main">{record.user_name || `User #${record.user}`}</div>
                            </td>
                            <td className="matchup-when-cell">
                              {formatOccurrenceTime(record.checked_in_at, { weekday: undefined })}
                            </td>
                            <td>{record.checked_in_by_name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        ) : loading ? (
          <LoadingState />
        ) : upcoming.length === 0 ? (
          <p className="matchup-muted">No BPM events match these filters.</p>
        ) : (
          <div className="matchup-table-wrap">
            <table className="matchup-table">
              <thead>
                <tr>
                  <th>BPM</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Guests</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((occurrence) => (
                  <tr
                    key={occurrence.id}
                    style={{ ['--appointment-status-color' as string]: occurrence.status === 'CANCELLED' ? '#fb7185' : '#22c55e' }}
                  >
                    <td>
                      <div className="matchup-cell-main">{occurrence.event_name}</div>
                    </td>
                    <td className="matchup-when-cell">
                      {formatOccurrenceTime(occurrence.start_at)}
                      <small> ({occurrence.timezone})</small>
                    </td>
                    <td>{FORMAT_LABELS[occurrence.bpm_format] || occurrence.bpm_format}</td>
                    <td>{occurrence.checked_in_count}/{occurrence.guest_count}</td>
                    <td>{occurrence.status}</td>
                    <td>
                      <div className="matchup-row-actions">
                        {occurrence.status === 'SCHEDULED' ? (
                          <Button size="sm" disabled={busy} onClick={() => openAddGuest(occurrence)}>
                            Add Guest
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => void openEditEvent(occurrence)}>
                          Edit BPM
                        </Button>
                        {occurrence.status === 'SCHEDULED' ? (
                          <Button size="sm" variant="destructive" disabled={busy} onClick={() => void cancelOccurrence(occurrence)}>
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AddGuestModal
        open={addGuestOpen}
        presetOccurrence={addGuestFor}
        onClose={() => setAddGuestOpen(false)}
        onAdded={() => void load()}
      />
      <BPMFormModal
        open={bpmFormOpen}
        event={editingEvent}
        onClose={() => { setBpmFormOpen(false); setEditingEvent(null); }}
        onSaved={load}
      />
      <TransferGuestModal
        open={Boolean(transferTarget)}
        guest={transferTarget}
        onClose={() => setTransferTarget(null)}
        onTransferred={() => { if (detailOccurrence) void loadGuests(detailOccurrence.id); }}
      />
      <FollowUpGuestModal
        open={Boolean(followUpTarget)}
        guest={followUpTarget}
        interestOptions={interestOptions}
        appointmentTypes={appointmentTypes}
        onClose={() => setFollowUpTarget(null)}
        onSaved={handleFollowUpSaved}
      />
    </main>
  );
}

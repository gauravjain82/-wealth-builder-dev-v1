import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Plus, Unplug, UserPlus } from 'lucide-react';
import { Button, Input, LoadingState, Select } from '@shared/components';
import { useToastStore } from '@/store';
import { BPMMonthCalendar } from '../components/bpm-month-calendar';
import { AddGuestModal } from '../components/add-guest-modal';
import { BPMFormModal } from '../components/bpm-form-modal';
import { AttachmentsModal } from '../components/event-attachments';
import { OccurrenceRowActions } from '../components/occurrence-row-actions';
import { StatusBadge } from '../components/status-control';
import { bpmService, formatOccurrenceTime } from '../services/bpm-service';
import type {
  BPMCapabilities,
  BPMEventAttachment,
  BPMOccurrence,
  DistinctLocations,
  GoogleStatus,
  OccurrenceFilters,
} from '../types';
// Reuse the Matchup dashboard styling so the BPM overview matches it 1:1.
import '@/features/matchup/pages/matchup-page.css';

/**
 * BPM Overview — the month calendar and the list of BPMs under it.
 *
 * This is a *browsing* surface. Everything that acts on a BPM happens elsewhere:
 * guests and check-ins in their own sub-tools (reached from each row's jump
 * buttons), and editing, cancelling and status changes in BPM Schedule. The stat
 * cards, the Guest List / Associates tabs and the Edit / Cancel row actions that
 * used to live here have all been removed per the BPM v2 brief.
 */

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
  const [capabilities, setCapabilities] = useState<BPMCapabilities | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [segment, setSegment] = useState('');
  // City / State options are derived from the BPMs actually in the window, so
  // the selects never offer a place that would return nothing.
  const [locationOptions, setLocationOptions] = useState<DistinctLocations>({
    cities: [],
    states: [],
  });
  const [occurrences, setOccurrences] = useState<BPMOccurrence[]>([]);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [bpmFormOpen, setBpmFormOpen] = useState(false);
  const [attachmentsFor, setAttachmentsFor] = useState<{
    name: string;
    attachments: BPMEventAttachment[];
  } | null>(null);

  const filters = useMemo<OccurrenceFilters>(() => {
    const range = monthRange(calendarMonth);
    return {
      start_after: range.start,
      start_before: range.end,
      city: city.trim() || undefined,
      state: stateFilter.trim() || undefined,
      segment: segment || undefined,
      search: search.trim() || undefined,
      page_size: 200,
    };
  }, [calendarMonth, city, stateFilter, segment, search]);

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

  // Refresh the City / State options when the window, scope or search changes.
  // City and State themselves are deliberately excluded: narrowing by one city
  // must not drop every other city out of the dropdown.
  useEffect(() => {
    const range = monthRange(calendarMonth);
    bpmService
      .distinctLocations({
        start_after: range.start,
        start_before: range.end,
        segment: segment || undefined,
        search: search.trim() || undefined,
      })
      .then(setLocationOptions)
      .catch(() => setLocationOptions({ cities: [], states: [] }));
  }, [calendarMonth, segment, search]);

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

  /** Load a BPM's attachments and open the popup. */
  const openAttachments = async (occurrence: BPMOccurrence) => {
    setBusy(true);
    try {
      const detail = await bpmService.event(occurrence.event);
      setAttachmentsFor({ name: detail.name, attachments: detail.attachments || [] });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load attachments',
      });
    } finally {
      setBusy(false);
    }
  };

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
            <Button variant="outline" onClick={() => setBpmFormOpen(true)}>
              <Plus size={16} /> Create BPM
            </Button>
          ) : null}
          <Button onClick={() => setAddGuestOpen(true)}>
            <UserPlus size={16} /> Add Guest
          </Button>
        </div>
      </div>

      {/* Stat cards removed per the BPM v2 brief. Search sits to the left of
          City / State / Baseshop, and City / State offer only places that
          actually have a BPM in the month on screen. */}
      <div className="matchup-filter-bar">
        <Input
          variant="surface"
          placeholder="Search BPM name or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select variant="surface" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {locationOptions.cities.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </Select>
        <Select variant="surface" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">All states</option>
          {locationOptions.states.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </Select>
        <Select value={segment} onChange={(e) => setSegment(e.target.value)}>
          <option value="">Baseshop</option>
          <option value="SUPERBASE">Super Base</option>
          <option value="SUPERTEAM">Super Team</option>
        </Select>
      </div>

      <BPMMonthCalendar
        month={calendarMonth}
        occurrences={occurrences}
        onMonthChange={setCalendarMonth}
        onOpenAttachments={(occurrence) => void openAttachments(occurrence)}
      />

      <section className="matchup-panel matchup-list-panel">
        <div className="matchup-panel-header">
          {/* The BPM Events / Guest List / Associates toggle is gone per the
              brief ("remove the buttons on top of the list"). Guests and
              associates have their own sub-tools, reached from each row. */}
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>BPM Events</h2>
          <span>{upcoming.length}</span>
        </div>

        {loading ? (
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
                  <th>Associates</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((occurrence) => (
                  <tr key={occurrence.id}>
                    <td>
                      <div className="matchup-cell-main">{occurrence.event_name}</div>
                      {occurrence.location_detail ? (
                        <small>{occurrence.location_detail.label}</small>
                      ) : null}
                    </td>
                    <td className="matchup-when-cell">
                      {formatOccurrenceTime(occurrence.start_at)}
                      <small> ({occurrence.timezone})</small>
                    </td>
                    <td>{FORMAT_LABELS[occurrence.bpm_format] || occurrence.bpm_format}</td>
                    <td>{occurrence.checked_in_count}/{occurrence.guest_count}</td>
                    <td>{occurrence.associate_count}</td>
                    <td><StatusBadge status={occurrence.effective_status} /></td>
                    <td>
                      {/* Edit and Cancel live in BPM Schedule. These are the
                          same jump-to-sub-tool actions as the day modal. */}
                      <OccurrenceRowActions
                        occurrences={[occurrence]}
                        selected={occurrence}
                        onSelect={() => undefined}
                        hasAttachments={occurrence.has_attachments}
                        onOpenAttachments={(row) => void openAttachments(row)}
                        disabled={busy}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AttachmentsModal
        open={Boolean(attachmentsFor)}
        eventName={attachmentsFor?.name ?? ''}
        attachments={attachmentsFor?.attachments ?? []}
        onClose={() => setAttachmentsFor(null)}
      />

      <AddGuestModal
        open={addGuestOpen}
        onClose={() => setAddGuestOpen(false)}
        onAdded={() => void load()}
      />

      <BPMFormModal
        open={bpmFormOpen}
        event={null}
        onClose={() => setBpmFormOpen(false)}
        onSaved={load}
      />
    </main>
  );
}

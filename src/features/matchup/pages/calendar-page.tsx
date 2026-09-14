import { useMemo, useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useToastStore } from '@/store';
import { Button } from '@shared/components/ui';
import { calendarSyncService } from '@/features/calendar-sync/services/calendar-sync-service';
import { AddProspectModal } from '@/features/team/prospect/components/add-prospect-modal';
import { createProspect, type Prospect } from '@/features/team/prospect/services/prospect-service';
import { defaultAddProspectForm, type AddProspectFormData } from '@/features/team/prospect/types';
import { AppointmentFormModal } from '../components/appointment-form-modal';
import { AppointmentDetailsModal } from '../components/appointment-details-modal';
import { ImportedEventModal } from '../components/imported-event-modal';
import { MonthCalendar } from '../components/month-calendar';
import { useMatchupDashboard } from '../hooks/use-matchup-dashboard';
import { localDateTimeValue, matchupService } from '../services/matchup-service';
import type {
  AppointmentDetail,
  AppointmentFilters,
  AppointmentKind,
  CalendarAppointment,
  CreateAppointmentPayload,
} from '../types';
import './matchup-page.css';

/** Split a typed name into first / last for prefilling the prospect form. */
function splitName(name = '') {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

/** Prefill values handed to the appointment form when converting an import. */
interface ImportedPrefill {
  kind: AppointmentKind;
  start_at: string;
  duration_minutes: number;
  notes: string;
}

export default function CalendarPage() {
  const addToast = useToastStore((state) => state.addToast);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<AppointmentDetail | null>(null);
  const [editingTarget, setEditingTarget] = useState<AppointmentDetail | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<ImportedPrefill | { kind: AppointmentKind } | null>({
    kind: 'PERSONAL',
  });
  // Imported-event triage state.
  const [importedTarget, setImportedTarget] = useState<CalendarAppointment | null>(null);
  const [pendingImportedBlockId, setPendingImportedBlockId] = useState<number | null>(null);
  // Inline prospect creation (mirrors the main matchup page).
  const [addProspectInitial, setAddProspectInitial] = useState<AddProspectFormData | null>(null);
  const [savingProspect, setSavingProspect] = useState(false);
  const [newAppointmentContact, setNewAppointmentContact] = useState<Prospect | null>(null);
  const filters = useMemo<AppointmentFilters>(() => ({ pageSize: 25 }), []);

  const {
    calendarItems,
    appointmentTypes,
    statuses,
    metrics,
    loading,
    error,
    reload,
  } = useMatchupDashboard(filters, calendarMonth, { personal: true });

  const closeForm = () => {
    setFormOpen(false);
    setEditingTarget(null);
    setPendingImportedBlockId(null);
    setNewAppointmentContact(null);
    setFormInitialValues({ kind: 'PERSONAL' });
  };

  const saveAppointment = async (payload: CreateAppointmentPayload, id?: number) => {
    setBusy(true);
    try {
      if (id) {
        await matchupService.updateAppointment(id, payload);
        addToast({ type: 'success', message: 'Appointment updated.' });
      } else {
        // On convert, adopt the imported Google event (no duplicate) and drop
        // its busy block — the backend does both when imported_block_id is set.
        const createPayload =
          pendingImportedBlockId != null
            ? { ...payload, imported_block_id: pendingImportedBlockId }
            : payload;
        await matchupService.createAppointment(createPayload);
        addToast({
          type: 'success',
          message: pendingImportedBlockId != null ? 'Imported event converted.' : 'Appointment created.',
        });
      }
      closeForm();
      setDetailsTarget(null);
      await reload();
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : id ? 'Failed to update appointment.' : 'Failed to create appointment.',
      });
    } finally {
      setBusy(false);
    }
  };

  const openDetails = async (id: number) => {
    setBusy(true);
    try {
      setDetailsTarget(await matchupService.appointment(id));
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load appointment.' });
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (appointment: AppointmentDetail) => {
    setDetailsTarget(null);
    setFormInitialValues(null);
    setEditingTarget(appointment);
    setFormOpen(true);
  };

  const openNewAppointment = () => {
    setEditingTarget(null);
    setPendingImportedBlockId(null);
    setFormInitialValues({ kind: 'PERSONAL' });
    setFormOpen(true);
  };

  const convertImported = (item: CalendarAppointment, kind: AppointmentKind) => {
    const start = new Date(item.start_at);
    const end = new Date(item.end_at);
    const durationMinutes = Math.max(
      15,
      Math.round((end.getTime() - start.getTime()) / 60000) || 60,
    );
    const noteParts = [item.title, item.location, item.description].filter(Boolean) as string[];
    setImportedTarget(null);
    setEditingTarget(null);
    setNewAppointmentContact(null);
    setPendingImportedBlockId(item.block_id ?? null);
    setFormInitialValues({
      kind,
      start_at: localDateTimeValue(start),
      duration_minutes: durationMinutes,
      notes: noteParts.join('\n\n'),
    });
    setFormOpen(true);
  };

  const dismissImported = async (item: CalendarAppointment) => {
    if (item.block_id == null) return;
    setBusy(true);
    try {
      await calendarSyncService.dismissImported(item.block_id);
      addToast({ type: 'success', message: 'Imported event dismissed.' });
      setImportedTarget(null);
      await reload();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to dismiss event.' });
    } finally {
      setBusy(false);
    }
  };

  const clearImported = async () => {
    setBusy(true);
    try {
      const result = await calendarSyncService.clearImported();
      addToast({ type: 'success', message: `Cleared ${result.removed} imported event${result.removed === 1 ? '' : 's'}.` });
      await reload();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to clear imported events.' });
    } finally {
      setBusy(false);
    }
  };

  const openAddProspect = (searchedName: string) => {
    const { firstName, lastName } = splitName(searchedName);
    setAddProspectInitial({ ...defaultAddProspectForm, firstName, lastName });
  };

  const submitNewProspect = async (form: AddProspectFormData) => {
    try {
      setSavingProspect(true);
      const created = await createProspect({
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone,
        recruited_by: form.recruiterId,
        leader: form.leaderId,
        profile: { state: form.state || undefined },
        prospect_meta: { outcome: 'Both', mark: 'default', hot: false, top25: false },
      });
      setNewAppointmentContact(created);
      setAddProspectInitial(null);
      addToast({ type: 'success', message: 'Prospect added and selected as the appointment contact.' });
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to add prospect.' });
    } finally {
      setSavingProspect(false);
    }
  };

  const importedCount = calendarItems.filter((item) => item.source === 'IMPORTED').length;

  return (
    <main className="matchup-page matchup-calendar-page">
      <header className="matchup-hero">
        <div>
          <span>Calendar</span>
          <h1>Matchup Calendar</h1>
          <p>Month view for your visible matchup appointments.</p>
        </div>
        <div className="matchup-hero-actions">
          <Button variant="outline" onClick={() => void reload()} disabled={loading || busy}>
            <RefreshCw size={16} /> Refresh
          </Button>
          {importedCount ? (
            <Button variant="ghost" onClick={() => void clearImported()} disabled={loading || busy}>
              <Trash2 size={16} /> Clear imported ({importedCount})
            </Button>
          ) : null}
          <Button onClick={openNewAppointment}>
            <Plus size={16} /> New Appointment
          </Button>
        </div>
      </header>

      {error ? <div className="matchup-page-error">{error}</div> : null}

      <section className="matchup-calendar-summary">
        <div>
          <span>Total</span>
          <strong>{metrics.total}</strong>
        </div>
        <div>
          <span>Done</span>
          <strong>{metrics.done}</strong>
        </div>
        <div>
          <span>Sales</span>
          <strong>{metrics.sales}</strong>
        </div>
        <div>
          <span>Recruits</span>
          <strong>{metrics.recruits}</strong>
        </div>
      </section>

      <MonthCalendar
        month={calendarMonth}
        items={calendarItems}
        statuses={statuses}
        selectedDate={selectedDate}
        personal
        onMonthChange={setCalendarMonth}
        onDateSelect={setSelectedDate}
        onItemClick={(id) => void openDetails(id)}
        onImportedClick={(item) => setImportedTarget(item)}
      />

      <ImportedEventModal
        item={importedTarget}
        saving={busy}
        onClose={() => setImportedTarget(null)}
        onConvert={convertImported}
        onDismiss={(item) => void dismissImported(item)}
      />

      <AppointmentDetailsModal
        appointment={detailsTarget}
        onClose={() => setDetailsTarget(null)}
        onEdit={openEdit}
      />

      <AppointmentFormModal
        open={formOpen}
        appointment={editingTarget}
        initialValues={editingTarget ? null : formInitialValues}
        appointmentTypes={appointmentTypes}
        saving={busy}
        onClose={closeForm}
        onSubmit={saveAppointment}
        onAddProspect={openAddProspect}
        addedContact={newAppointmentContact}
      />

      <AddProspectModal
        open={Boolean(addProspectInitial)}
        saving={savingProspect}
        initialForm={addProspectInitial}
        onClose={() => setAddProspectInitial(null)}
        onSubmit={submitNewProspect}
      />
    </main>
  );
}

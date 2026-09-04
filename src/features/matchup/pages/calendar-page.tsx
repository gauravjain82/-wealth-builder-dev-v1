import { useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useToastStore } from '@/store';
import { Button } from '@shared/components/ui';
import { AppointmentFormModal } from '../components/appointment-form-modal';
import { AppointmentDetailsModal } from '../components/appointment-details-modal';
import { MonthCalendar } from '../components/month-calendar';
import { useMatchupDashboard } from '../hooks/use-matchup-dashboard';
import { matchupService } from '../services/matchup-service';
import type { AppointmentDetail, AppointmentFilters, CreateAppointmentPayload } from '../types';
import './matchup-page.css';

export default function CalendarPage() {
  const addToast = useToastStore((state) => state.addToast);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<AppointmentDetail | null>(null);
  const [editingTarget, setEditingTarget] = useState<AppointmentDetail | null>(null);
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
  };

  const saveAppointment = async (payload: CreateAppointmentPayload, id?: number) => {
    setBusy(true);
    try {
      if (id) {
        await matchupService.updateAppointment(id, payload);
        addToast({ type: 'success', message: 'Appointment updated.' });
      } else {
        await matchupService.createAppointment(payload);
        addToast({ type: 'success', message: 'Appointment created.' });
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
    setEditingTarget(appointment);
    setFormOpen(true);
  };

  const openNewAppointment = () => {
    setEditingTarget(null);
    setFormOpen(true);
  };

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
      />

      <AppointmentDetailsModal
        appointment={detailsTarget}
        onClose={() => setDetailsTarget(null)}
        onEdit={openEdit}
      />

      <AppointmentFormModal
        open={formOpen}
        appointment={editingTarget}
        initialValues={editingTarget ? null : { kind: 'PERSONAL' }}
        appointmentTypes={appointmentTypes}
        saving={busy}
        onClose={closeForm}
        onSubmit={saveAppointment}
      />
    </main>
  );
}

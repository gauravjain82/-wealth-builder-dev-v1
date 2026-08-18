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

  const saveAppointment = async (payload: CreateAppointmentPayload) => {
    setBusy(true);
    try {
      await matchupService.createAppointment(payload);
      addToast({ type: 'success', message: 'Appointment created.' });
      setFormOpen(false);
      await reload();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to create appointment.' });
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
          <Button onClick={() => setFormOpen(true)}>
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

      <AppointmentDetailsModal appointment={detailsTarget} onClose={() => setDetailsTarget(null)} />

      <AppointmentFormModal
        open={formOpen}
        appointment={null}
        appointmentTypes={appointmentTypes}
        saving={busy}
        onClose={() => setFormOpen(false)}
        onSubmit={saveAppointment}
      />
    </main>
  );
}

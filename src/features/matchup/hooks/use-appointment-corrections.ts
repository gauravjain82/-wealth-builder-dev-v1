import { useState } from 'react';
import { useToastStore } from '@/store';
import { matchupService } from '../services/matchup-service';
import type { AppointmentDetail, AppointmentStatus } from '../types';

interface UseAppointmentCorrectionsOptions {
  /** Refresh the page's lists/calendar after a change. */
  onChanged: () => Promise<void> | void;
  /** Show (or clear) the appointment in the page's details modal. */
  setDetails: (appointment: AppointmentDetail | null) => void;
}

/**
 * Actions for appointments whose state needs correcting, shared by the Match Up
 * and personal Calendar pages:
 *
 * - "Change status" (brokers / trainers on their own) with a required reason,
 * - "Add back to calendar" for a copy someone deleted in Google Calendar,
 * - "Cancel appointment" straight from the details modal.
 *
 * Each action re-opens the details modal with the updated appointment so the
 * user sees the new status and its history entry.
 */
export function useAppointmentCorrections({ onChanged, setDetails }: UseAppointmentCorrectionsOptions) {
  const addToast = useToastStore((state) => state.addToast);
  const [changeStatusTarget, setChangeStatusTarget] = useState<AppointmentDetail | null>(null);
  const [saving, setSaving] = useState(false);

  const openChangeStatus = (appointment: AppointmentDetail) => {
    setDetails(null);
    setChangeStatusTarget(appointment);
  };

  const closeChangeStatus = () => {
    const appointment = changeStatusTarget;
    setChangeStatusTarget(null);
    if (appointment) setDetails(appointment);
  };

  /** Errors are re-thrown so the dialog can show them inline. */
  const submitChangeStatus = async (appointmentId: number, status: AppointmentStatus, reason: string) => {
    setSaving(true);
    try {
      const updated = await matchupService.changeStatus(appointmentId, { status, reason });
      setChangeStatusTarget(null);
      setDetails(updated);
      addToast({ type: 'success', message: 'Status changed.' });
      await onChanged();
    } finally {
      setSaving(false);
    }
  };

  const runDetailAction = async (successMessage: string, action: () => Promise<AppointmentDetail>) => {
    setSaving(true);
    try {
      setDetails(await action());
      addToast({ type: 'success', message: successMessage });
      await onChanged();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Action failed.' });
    } finally {
      setSaving(false);
    }
  };

  const readdToCalendar = (appointment: AppointmentDetail) =>
    runDetailAction('Added back to Google Calendar.', () => matchupService.readdToCalendar(appointment.id));

  const cancelAppointment = async (appointment: AppointmentDetail) => {
    if (!window.confirm('Cancel this appointment?')) return;
    await runDetailAction('Appointment cancelled.', () => matchupService.cancel(appointment.id));
  };

  return {
    changeStatusTarget,
    saving,
    openChangeStatus,
    closeChangeStatus,
    submitChangeStatus,
    readdToCalendar,
    cancelAppointment,
  };
}

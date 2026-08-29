import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Form, FormActions, FormRow, Label, Modal, Textarea } from '@shared/components';
import { useToastStore } from '@/store';
import { AppointmentFormModal } from '@/features/matchup/components/appointment-form-modal';
import { matchupService } from '@/features/matchup/services/matchup-service';
import type { AppointmentDetail, AppointmentListItem, AppointmentType } from '@/features/matchup/types';
import { bpmService, formatOccurrenceTime } from '../services/bpm-service';
import type { BPMGuest, BPMInterestGroup, BPMInterestOption } from '../types';

interface FollowUpGuestModalProps {
  open: boolean;
  guest: BPMGuest | null;
  interestOptions: BPMInterestOption[];
  appointmentTypes: AppointmentType[];
  onClose: () => void;
  onSaved: (updated: BPMGuest) => void;
}

// Fixed display order for the three sections.
const GROUP_ORDER: BPMInterestGroup[] = ['GOALS', 'BUSINESS', 'SELF_IMPROVEMENT'];

interface GroupedOptions {
  group: BPMInterestGroup;
  heading: string;
  options: BPMInterestOption[];
}

function groupOptions(options: BPMInterestOption[]): GroupedOptions[] {
  const active = (Array.isArray(options) ? options : []).filter((option) => option.is_active);
  return GROUP_ORDER.map((group) => {
    const groupOpts = active
      .filter((option) => option.group === group)
      .sort((a, b) => a.sort_order - b.sort_order);
    return {
      group,
      heading: groupOpts[0]?.group_display || group,
      options: groupOpts,
    };
  }).filter((section) => section.options.length > 0);
}

export function FollowUpGuestModal({
  open,
  guest,
  interestOptions,
  appointmentTypes,
  onClose,
  onSaved,
}: FollowUpGuestModalProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [appointmentId, setAppointmentId] = useState<number | null>(null);
  const [linkedAppointment, setLinkedAppointment] = useState<AppointmentListItem | AppointmentDetail | null>(null);
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [savingAppt, setSavingAppt] = useState(false);
  const [saving, setSaving] = useState(false);

  const sections = useMemo(() => groupOptions(interestOptions), [interestOptions]);

  // Reset the form each time the modal is (re)opened for a guest.
  useEffect(() => {
    if (!open) return;
    setChecked(new Set(guest?.followup?.interests ?? []));
    setNotes('');
    setAppointmentId(guest?.followup?.appointment ?? null);
    setLinkedAppointment(guest?.followup?.appointment_detail ?? null);
    setApptModalOpen(false);
  }, [open, guest]);

  const toggle = (slug: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const createAppointment = async (payload: Parameters<typeof matchupService.createAppointment>[0]) => {
    setSavingAppt(true);
    try {
      const created = await matchupService.createAppointment(payload);
      setAppointmentId(created.id);
      setLinkedAppointment(created);
      setApptModalOpen(false);
      addToast({ type: 'success', message: 'Appointment created and linked.' });
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to create appointment' });
    } finally {
      setSavingAppt(false);
    }
  };

  const save = async () => {
    if (!guest) return;
    setSaving(true);
    try {
      const updated = await bpmService.saveGuestFollowup(guest.occurrence, {
        guest_id: guest.id,
        interests: [...checked],
        appointment_id: appointmentId ?? undefined,
        notes: notes.trim() || undefined,
      });
      addToast({ type: 'success', message: 'Follow-up saved.' });
      onSaved(updated);
      onClose();
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save follow-up' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open={open && !apptModalOpen}
        title={`Follow-up — ${guest?.prospect_detail?.name || 'guest'}`}
        onClose={onClose}
        contentClassName="max-w-[640px]"
      >
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-white/80">I am interested in…</p>
            {sections.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/60">
                No interest options are configured yet.
              </p>
            ) : (
              <div className="space-y-4">
                {sections.map((section) => (
                  <fieldset key={section.group} className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                    <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/60">
                      {section.heading}
                    </legend>
                    <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                      {section.options.map((option) => (
                        <label
                          key={option.id}
                          className="flex items-center gap-2 text-sm text-slate-700 dark:text-white/80"
                        >
                          <Checkbox
                            checked={checked.has(option.slug)}
                            disabled={saving}
                            onChange={() => toggle(option.slug)}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            )}
          </div>

          <FormRow>
            <Label>Appointment</Label>
            {linkedAppointment ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10">
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatOccurrenceTime(linkedAppointment.start_at)}
                </span>
                <span className="text-slate-500 dark:text-white/60">
                  {linkedAppointment.location_type === 'VIRTUAL' ? 'Zoom / Virtual' : 'In-Person'}
                </span>
                {linkedAppointment.status ? (
                  <span className="text-xs uppercase tracking-wide text-slate-400">{linkedAppointment.status}</span>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="ml-auto"
                  disabled={saving}
                  onClick={() => setApptModalOpen(true)}
                >
                  Reschedule
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" disabled={saving} onClick={() => setApptModalOpen(true)}>
                Schedule appointment
              </Button>
            )}
          </FormRow>

          <FormRow>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Added to the prospect's BPM notes timeline…"
            />
          </FormRow>

          <FormActions>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save follow-up'}
            </Button>
          </FormActions>
        </Form>
      </Modal>

      <AppointmentFormModal
        open={apptModalOpen}
        initialValues={{
          kind: 'PERSONAL',
          contact: guest?.prospect ?? null,
          contactLabel: guest?.prospect_detail?.name ?? '',
        }}
        appointmentTypes={appointmentTypes}
        saving={savingAppt}
        onClose={() => setApptModalOpen(false)}
        onSubmit={createAppointment}
      />
    </>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Form,
  FormActions,
  FormRow,
  Label,
  Modal,
  Textarea,
  UserAutocompleteDropdown,
  type UserAutocompleteOption,
} from '@shared/components';
import { useToastStore } from '@/store';
import { AppointmentFormModal } from '@/features/matchup/components/appointment-form-modal';
import { matchupService } from '@/features/matchup/services/matchup-service';
import type { AppointmentDetail, AppointmentListItem, AppointmentType } from '@/features/matchup/types';
import { bpmService, findStepOneTypeId, formatOccurrenceTime } from '../services/bpm-service';
import type { BPMGuest, BPMInterestGroup, BPMInterestOption, BPMOccurrence } from '../types';

interface FollowUpGuestModalProps {
  open: boolean;
  guest: BPMGuest | null;
  /** The BPM date the card was collected at — names the appointment's auto-note. */
  occurrence?: BPMOccurrence | null;
  interestOptions: BPMInterestOption[];
  appointmentTypes: AppointmentType[];
  /** Heading used in the popup title and save button. Guest Check-In uses "Blue card". */
  heading?: string;
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

/** "Tuesday BPM · Tue 14 Oct, 7:00 PM", for the appointment's auto-note. */
function eventDetails(occurrence: BPMOccurrence | null | undefined): string {
  if (!occurrence) return 'a BPM';
  return `${occurrence.event_name} · ${formatOccurrenceTime(occurrence.start_at)}`;
}

export function FollowUpGuestModal({
  open,
  guest,
  occurrence,
  interestOptions,
  appointmentTypes,
  heading = 'Follow-up',
  onClose,
  onSaved,
}: FollowUpGuestModalProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [referralNote, setReferralNote] = useState('');
  const [collectedBy, setCollectedBy] = useState<{ id: number | null; label: string }>({
    id: null,
    label: '',
  });
  const [appointmentId, setAppointmentId] = useState<number | null>(null);
  const stepOneTypeId = useMemo(() => findStepOneTypeId(appointmentTypes), [appointmentTypes]);
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
    setReferralNote(guest?.followup?.referral_note ?? '');
    setCollectedBy({
      id: guest?.followup?.collected_by ?? null,
      label: guest?.followup?.collected_by_name ?? '',
    });
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

  /**
   * Who took the card: the associates at *this* event first, then anyone in the
   * company.
   *
   * Cards are collected by whoever is working the room, so the people who
   * checked in here are nearly always the right answer and are offered first.
   * The company-wide fallback matters because somebody can collect a card
   * without having remembered to check themselves in, and a door screen must
   * not make that unrecordable.
   */
  const searchCollectors = useCallback(
    async (search: string): Promise<UserAutocompleteOption[]> => {
      const term = search.trim().toLowerCase();
      const atThisEvent: UserAutocompleteOption[] = [];
      if (occurrence) {
        try {
          const records = await bpmService.associateCheckins(occurrence.id);
          for (const record of records) {
            const label = record.user_name || `User #${record.user}`;
            if (!term || label.toLowerCase().includes(term)) {
              atThisEvent.push({ id: record.user, label, meta: 'Checked in here' });
            }
          }
        } catch {
          // Fall through to the company-wide search.
        }
      }
      if (!term) return atThisEvent;

      const seen = new Set(atThisEvent.map((option) => option.id));
      const companyWide = await bpmService.searchInviters(search);
      return [
        ...atThisEvent,
        ...companyWide
          .filter((row) => !seen.has(row.id))
          .map((row) => ({
            id: row.id,
            label: row.name,
            agencyCode: row.agency_code || '',
            meta: [row.agency_code, row.phone].filter(Boolean).join(' | '),
          })),
      ];
    },
    [occurrence],
  );

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
        // Always sent, so clearing the picker really clears it. The backend
        // treats an omitted key as "leave it" and an explicit null as "clear".
        collected_by: collectedBy.id,
        referral_note: referralNote.trim(),
        appointment_id: appointmentId ?? undefined,
        notes: notes.trim() || undefined,
      });
      addToast({ type: 'success', message: `${heading} saved.` });
      // The save ticks Blue card (and Scheduled Appointment when one was
      // booked), so the patched row is what turns the outline green.
      onSaved(updated);
      onClose();
    } catch (error) {
      addToast({ type: 'error', message: error instanceof Error ? error.message : `Failed to save ${heading}` });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Prefill for the 1-on-1 booked off this card (D3).
   *
   * `trainee` is the **inviter**, not the logged-in user: the person who brought
   * the guest is who the follow-up belongs to, even when somebody else is at the
   * keyboard taking the card at the door.
   */
  const appointmentInitialValues = useMemo(
    () => ({
      kind: 'REQUEST_TRAINER' as const,
      contact: guest?.prospect ?? null,
      contactLabel: guest?.prospect_detail?.name ?? '',
      trainee: guest?.inviter ?? null,
      traineeLabel: guest?.inviter_name ?? '',
      // Looked up by slug, because ids differ per environment and renaming the
      // type in admin must not silently stop the box being ticked.
      types: stepOneTypeId ? [stepOneTypeId] : [],
      notes: `Blue Card follow up from ${eventDetails(occurrence)}`,
    }),
    [guest, occurrence, stepOneTypeId],
  );

  return (
    <>
      <Modal
        open={open && !apptModalOpen}
        title={`${heading} — ${guest?.prospect_detail?.name || 'guest'}`}
        onClose={onClose}
        contentClassName="max-w-[640px]"
      >
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <FormRow>
            <Label>Collected by</Label>
            <UserAutocompleteDropdown
              selectedId={collectedBy.id}
              selectedLabel={collectedBy.label}
              placeholder="Who took this card?"
              buttonText="SELECT"
              disabled={saving}
              fetchOptions={searchCollectors}
              onSelect={(option) => setCollectedBy({ id: option.id, label: option.label })}
            />
          </FormRow>

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
            <Label>Referrals</Label>
            <Textarea
              value={referralNote}
              onChange={(event) => setReferralNote(event.target.value)}
              rows={2}
              disabled={saving}
            />
          </FormRow>

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
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </FormRow>

          <FormActions>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : `Save ${heading}`}
            </Button>
          </FormActions>
        </Form>
      </Modal>

      <AppointmentFormModal
        open={apptModalOpen}
        title="Blue Card Follow Up"
        initialValues={appointmentInitialValues}
        appointmentTypes={appointmentTypes}
        saving={savingAppt}
        onClose={() => setApptModalOpen(false)}
        onSubmit={createAppointment}
      />
    </>
  );
}

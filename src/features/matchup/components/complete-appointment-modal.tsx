import { useEffect, useState } from 'react';
import { Button, Modal, Textarea } from '@shared/components/ui';
import type { AppointmentListItem, CompleteAppointmentPayload } from '../types';

interface CompleteAppointmentModalProps {
  open: boolean;
  appointment: AppointmentListItem | null;
  saving?: boolean;
  onClose: () => void;
  onComplete: (payload: CompleteAppointmentPayload) => Promise<void>;
  onAddToRecruitTracker?: (appointment: AppointmentListItem) => void;
  onCreateFollowUpAppointment?: (appointment: AppointmentListItem) => void;
  onAddToProduction?: (appointment: AppointmentListItem) => void;
}

const initialForm: Required<CompleteAppointmentPayload> = {
  appointment_happened: true,
  ama_completed: false,
  fna_taken: false,
  second_appointment_scheduled: false,
  referrals: 0,
  invited_to_bpm: false,
  trainee_edified_trainer: '',
  made_sale: '',
  notes: '',
};

type CompleteForm = typeof initialForm;
type BooleanKey =
  | 'appointment_happened'
  | 'ama_completed'
  | 'fna_taken'
  | 'second_appointment_scheduled'
  | 'invited_to_bpm';

type TriState = boolean | null;
const YES_NO_OPTIONS: Array<[boolean, string]> = [
  [true, 'YES'],
  [false, 'NO'],
];

export function CompleteAppointmentModal({
  open,
  appointment,
  saving = false,
  onClose,
  onComplete,
  onAddToRecruitTracker,
  onCreateFollowUpAppointment,
  onAddToProduction,
}: CompleteAppointmentModalProps) {
  const [form, setForm] = useState(initialForm);
  const [hasReferrals, setHasReferrals] = useState<TriState>(null);
  const contactName = appointment?.contact_name || appointment?.trainee_name || 'this person';

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setHasReferrals(null);
    }
  }, [open]);

  const update = <K extends keyof CompleteForm>(key: K, value: CompleteForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateBoolean = (key: BooleanKey, value: boolean) => {
    update(key, value);
  };

  const updateReferrals = (value: boolean) => {
    setHasReferrals(value);
    update('referrals', value ? Math.max(form.referrals, 1) : 0);
  };

  return (
    <Modal
      open={open}
      title={`Follow Up${appointment?.contact_name ? ` - ${appointment.contact_name}` : ''}`}
      onClose={onClose}
      contentClassName="matchup-modal-content matchup-followup-modal"
    >
      <form
        className="matchup-form matchup-followup-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onComplete(form);
        }}
      >
        <BooleanQuestion
          label="Did the appointment happen?"
          name="appointment_happened"
          value={form.appointment_happened}
          onChange={(value) => updateBoolean('appointment_happened', value)}
          required
        />
        <BooleanQuestion
          label="Did you complete an AMA?"
          name="ama_completed"
          value={form.ama_completed}
          onChange={(value) => updateBoolean('ama_completed', value)}
          required
        />
        <ActionPrompt
          actionText="Add to Recruit Tracker"
          onClick={appointment && onAddToRecruitTracker ? () => onAddToRecruitTracker(appointment) : undefined}
        />
        <BooleanQuestion
          label="Financial Needs Analysis (FNA) Taken?"
          name="fna_taken"
          value={form.fna_taken}
          onChange={(value) => updateBoolean('fna_taken', value)}
          required
        />
        <BooleanQuestion
          label="2nd Appointment scheduled?"
          name="second_appointment_scheduled"
          value={form.second_appointment_scheduled}
          onChange={(value) => updateBoolean('second_appointment_scheduled', value)}
          required
        />
        <ActionPrompt
          actionText="create a follow-up appointment"
          onClick={appointment && onCreateFollowUpAppointment ? () => onCreateFollowUpAppointment(appointment) : undefined}
        />
        <BooleanQuestion
          label="Referrals?"
          name="referrals"
          value={hasReferrals}
          onChange={updateReferrals}
          required
        />
        <StringQuestion
          label="Invited to BPM?"
          name="invited_to_bpm"
          value={form.invited_to_bpm ? 'YES' : 'NO'}
          options={[
            ['YES', 'Yes'],
            ['NO', 'No'],
          ]}
          onChange={(value) => updateBoolean('invited_to_bpm', value === 'YES')}
          required
        />
        <ActionPrompt actionText={`Add ${contactName} to your BPM Invites`} disabled />
        <StringQuestion
          label="Did trainee edify the trainer properly?"
          name="trainee_edified_trainer"
          value={form.trainee_edified_trainer || null}
          options={[
            ['YES', 'Yes'],
            ['NO', 'No'],
            ['KINDA', 'Kinda'],
          ]}
          onChange={(value) => update('trainee_edified_trainer', value as CompleteForm['trainee_edified_trainer'])}
          required
        />
        <StringQuestion
          label="Did you make a sale?"
          name="made_sale"
          value={form.made_sale || null}
          options={[
            ['YES', 'Yes'],
            ['', 'No'],
            ['NOT_YET', 'Not Yet'],
          ]}
          onChange={(value) => update('made_sale', value as CompleteForm['made_sale'])}
          required
        />
        <ActionPrompt
          actionText={`Add ${contactName} to your Production`}
          onClick={appointment && onAddToProduction ? () => onAddToProduction(appointment) : undefined}
        />

        <div className="matchup-form-grid">
          <label className="matchup-form-wide">
            <span>Notes</span>
            <Textarea rows={4} value={form.notes} onChange={(event) => update('notes', event.target.value)} />
          </label>
        </div>

        <div className="matchup-form-actions">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit Follow Up'}</Button>
        </div>
      </form>
    </Modal>
  );
}

interface BooleanQuestionProps {
  label: string;
  name: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  required?: boolean;
}

function BooleanQuestion({ label, name, value, onChange, required = false }: BooleanQuestionProps) {
  return (
    <div className="matchup-followup-question" role="group" aria-label={label}>
      <span className="matchup-followup-label">{label}{required ? <sup>*</sup> : null}</span>
      <div className="matchup-followup-radio-row">
        {YES_NO_OPTIONS.map(([optionValue, optionLabel]) => (
          <label key={String(optionValue)} className="matchup-followup-radio">
            <input
              type="radio"
              name={name}
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
            />
            <span>{optionLabel === 'YES' ? 'Yes' : 'No'}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

interface StringQuestionProps {
  label: string;
  name: string;
  value: string | null;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
  required?: boolean;
}

function StringQuestion({ label, name, value, options, onChange, required = false }: StringQuestionProps) {
  return (
    <div className="matchup-followup-question" role="group" aria-label={label}>
      <span className="matchup-followup-label">{label}{required ? <sup>*</sup> : null}</span>
      <div className="matchup-followup-radio-row">
        {options.map(([optionValue, optionLabel]) => (
          <label key={optionValue} className="matchup-followup-radio">
            <input
              type="radio"
              name={name}
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
            />
            <span>{optionLabel}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

interface ActionPromptProps {
  actionText: string;
  onClick?: () => void;
  disabled?: boolean;
}

function ActionPrompt({ actionText, onClick, disabled = false }: ActionPromptProps) {
  return (
    <p className="matchup-followup-action-prompt">
      Would you like to{' '}
      <button type="button" disabled={disabled || !onClick} onClick={onClick}>
        {actionText}
      </button>
      {' ?'}
    </p>
  );
}

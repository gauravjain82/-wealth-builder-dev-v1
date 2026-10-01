/**
 * Settings → Assistant (SMD only). Same shape as the office section: the effective
 * (verified) assistant, the pending submission with Withdraw, a submit form disabled
 * while one is pending, and the collapsed history. Screen states:
 * `docs/plugin-fees/UI.md` §2.2.
 */

import { useState, type FormEvent } from 'react';

import { ConfirmationDialog, PhoneField, StagedFilePicker, isValidPhoneNumber } from '@/shared/components';
import { useToastStore } from '@/store';

import { useSubmitAssistant, useWithdrawAssistant } from '../hooks/use-plugin-fees';
import type { AssistantHours, AssistantSubmission, SubmissionGroup } from '../types';
import {
  PHOTO_RULE,
  checkFile,
  describeError,
  fieldErrors,
  formatDate,
  monthAfter,
  validateHours,
} from '../utils/plugin-fees-format';
import { HoursEditor } from './hours-editor';
import { History } from './submission-parts';
import { AssistantSummary } from './submission-summaries';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_HOURS: AssistantHours[] = [{ day: 'mon', start: '09:00', end: '17:00' }];

export function AssistantSection({
  assistant,
  verificationDeadline,
}: {
  assistant: SubmissionGroup<AssistantSubmission>;
  verificationDeadline?: string;
}) {
  const { addToast } = useToastStore();
  const submit = useSubmitAssistant();
  const withdraw = useWithdrawAssistant();

  const { effective, pending, history } = assistant;
  // Prefill from the verified assistant, so a re-submission only changes what changed.
  const [name, setName] = useState(effective?.name ?? '');
  const [phone, setPhone] = useState(effective?.phone ?? '');
  const [email, setEmail] = useState(effective?.email ?? '');
  const [hours, setHours] = useState<AssistantHours[]>(
    effective?.hours.length ? effective.hours : DEFAULT_HOURS
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hourErrors, setHourErrors] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [toWithdraw, setToWithdraw] = useState<AssistantSubmission | null>(null);

  const hasPending = Boolean(pending);
  const busy = submit.isPending;
  const routingMonth = verificationDeadline ? monthAfter(verificationDeadline) : null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required.';
    if (!phone || !isValidPhoneNumber(phone)) next.phone = 'Enter a valid phone number.';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    const hoursCheck = validateHours(hours);
    if (hoursCheck.form) next.hours = hoursCheck.form;
    const photoError = checkFile(photo, PHOTO_RULE);
    if (photoError) next.photo = photoError;
    setErrors(next);
    setHourErrors(hoursCheck.rows);
    if (Object.keys(next).length || Object.keys(hoursCheck.rows).length || !photo) return;

    try {
      await submit.mutateAsync({
        name: name.trim(),
        phone,
        email: email.trim(),
        hours,
        photo,
      });
      setPhoto(null);
      setErrors({});
      addToast({ type: 'success', message: 'Assistant submitted for verification.' });
    } catch (error) {
      const message = describeError(error, 'Failed to submit your assistant.');
      setErrors(fieldErrors(error));
      setFormError(message);
      addToast({ type: 'error', message });
    }
  };

  const handleWithdraw = async () => {
    if (!toWithdraw) return;
    try {
      await withdraw.mutateAsync(toWithdraw.id);
      addToast({ type: 'success', message: 'Assistant withdrawn.' });
    } catch (error) {
      addToast({ type: 'error', message: describeError(error, 'Failed to withdraw the assistant.') });
    } finally {
      setToWithdraw(null);
    }
  };

  const withdrawingVerified = toWithdraw?.status === 'verified';

  return (
    <div className="glass-section" id="settings-plugin-fees-assistant">
      <div className="section-header">
        <h3 className="section-title">
          <span className="title-icon">🧑‍💼</span>
          Assistant
        </h3>
      </div>

      <div className="wb-pf-stack">
        {verificationDeadline ? (
          <div className="wb-pf-callout wb-pf-callout--strong" role="note">
            Assistant must be verified by {formatDate(verificationDeadline)}
            {routingMonth ? ` to count for ${routingMonth} routing` : ''}.
          </div>
        ) : null}
        <p className="wb-pf-muted" style={{ margin: 0 }}>
          You count as having an assistant only while the assistant is verified. Assistants are
          re-verified every quarter.
        </p>

        {effective?.reverify_open ? (
          <div className="wb-pf-callout wb-pf-callout--warning" role="status">
            Your assistant is due for re-verification by {formatDate(effective.reverify_due)}. If it
            is not re-verified by then, the status becomes Expired and MD fees reroute from the
            following month. If anything has changed, submit the updated details below.
          </div>
        ) : null}

        <div className="wb-pf-stack" style={{ gap: 8 }}>
          <h4 className="wb-pf-subheading">Verified assistant</h4>
          {effective ? (
            <AssistantSummary
              assistant={effective}
              showActions={false}
              headerExtra={
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setToWithdraw(effective)}
                  disabled={withdraw.isPending}
                >
                  Withdraw
                </button>
              }
            />
          ) : (
            <p className="wb-pf-muted">No verified assistant.</p>
          )}
        </div>

        {pending ? (
          <div className="wb-pf-stack" style={{ gap: 8 }}>
            <h4 className="wb-pf-subheading">Awaiting verification</h4>
            <AssistantSummary
              assistant={pending}
              showActions={false}
              headerExtra={
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setToWithdraw(pending)}
                  disabled={withdraw.isPending}
                >
                  Withdraw
                </button>
              }
            />
          </div>
        ) : null}

        <form className="wb-pf-stack" onSubmit={handleSubmit} noValidate>
          <h4 className="wb-pf-subheading">
            {effective ? 'Submit updated assistant details' : 'Submit your assistant'}
          </h4>
          {hasPending ? (
            <p className="wb-pf-muted">
              You have a submission awaiting verification. Withdraw it to submit a different one.
            </p>
          ) : effective ? (
            <p className="wb-pf-muted">
              Your verified assistant stays in effect until the new details are verified.
            </p>
          ) : null}

          <fieldset disabled={hasPending || busy} className="wb-pf-stack" style={{ border: 0, padding: 0, margin: 0 }}>
            <div className="wb-pf-form-grid">
              <div className="field-group">
                <label htmlFor="wb-pf-assistant-name">Name</label>
                <input
                  id="wb-pf-assistant-name"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name ? <p className="wb-pf-field-error">{errors.name}</p> : null}
              </div>
              <div className="field-group">
                <label htmlFor="wb-pf-assistant-email">Email</label>
                <input
                  id="wb-pf-assistant-email"
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email ? <p className="wb-pf-field-error">{errors.email}</p> : null}
              </div>
              <div className="field-group wb-pf-span-2">
                <label htmlFor="wb-pf-assistant-phone">Phone</label>
                <PhoneField
                  id="wb-pf-assistant-phone"
                  value={phone}
                  onChange={setPhone}
                  disabled={hasPending || busy}
                  helperText={null}
                />
                {errors.phone ? <p className="wb-pf-field-error">{errors.phone}</p> : null}
              </div>
              <div className="field-group wb-pf-span-2">
                <label>Hours</label>
                <HoursEditor
                  value={hours}
                  onChange={setHours}
                  disabled={hasPending || busy}
                  rowErrors={hourErrors}
                  formError={errors.hours}
                />
              </div>
              <div className="wb-pf-span-2">
                <StagedFilePicker
                  label="Assistant photo"
                  hint={PHOTO_RULE.label}
                  accept={PHOTO_RULE.accept}
                  file={photo}
                  onFileChange={setPhoto}
                  disabled={hasPending || busy}
                  error={errors.photo}
                />
              </div>
            </div>

            {formError ? <div className="wb-pf-form-error" role="alert">{formError}</div> : null}

            <div className="connected-account-actions">
              <button type="submit" className="btn-primary" disabled={hasPending || busy}>
                {busy ? 'Submitting…' : 'Submit assistant for verification'}
              </button>
            </div>
          </fieldset>
        </form>

        <History items={history} render={(item) => <AssistantSummary assistant={item} />} />
      </div>

      <ConfirmationDialog
        open={Boolean(toWithdraw)}
        title={withdrawingVerified ? 'Withdraw your verified assistant?' : 'Withdraw this submission?'}
        message={
          withdrawingVerified
            ? 'You will no longer count as having an assistant, and MD fees credited to you reroute up the recruiting line starting the following month.'
            : 'The submission will be removed from the verification queue. You can submit again afterwards.'
        }
        confirmText="Withdraw"
        loading={withdraw.isPending}
        onConfirm={handleWithdraw}
        onClose={() => setToWithdraw(null)}
      />
    </div>
  );
}

/**
 * Settings → Office (every level at or above the configured submission level; the fee
 * wording only for a billed agent, `billable`). Shows the effective (approved) office, the pending
 * submission with Withdraw, a submit form that is disabled while one is pending, and the
 * collapsed history. Screen states: `docs/plugin-fees/UI.md` §2.1.
 */

import { useState, type FormEvent } from 'react';

import { ConfirmationDialog, StagedFilePicker } from '@/shared/components';
import { useToastStore } from '@/store';

import { useSubmitOffice, useWithdrawOffice } from '../hooks/use-plugin-fees';
import type { OfficeSubmission, PluginFeesRates, SubmissionGroup } from '../types';
import {
  LEASE_RULE,
  PHOTO_RULE,
  checkFile,
  describeError,
  fieldErrors,
  formatCents,
  formatMonth,
} from '../utils/plugin-fees-format';
import { History } from './submission-parts';
import { OfficeSummary } from './submission-summaries';

interface OfficeFormState {
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
}

const EMPTY_FORM: OfficeFormState = {
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip: '',
};

export function OfficeSection({
  office,
  rates,
  billable,
}: {
  office: SubmissionGroup<OfficeSubmission>;
  rates?: PluginFeesRates;
  /** Billed a plug-in fee (`is_billable`). Otherwise the office changes no fee. */
  billable: boolean;
}) {
  const { addToast } = useToastStore();
  const submit = useSubmitOffice();
  const withdraw = useWithdrawOffice();

  const [form, setForm] = useState<OfficeFormState>(EMPTY_FORM);
  const [lease, setLease] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [toWithdraw, setToWithdraw] = useState<OfficeSubmission | null>(null);

  const { effective, pending, history } = office;
  const hasPending = Boolean(pending);
  const busy = submit.isPending;

  const setField = (field: keyof OfficeFormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!form.address_line1.trim()) next.address_line1 = 'Address is required.';
    if (!form.city.trim()) next.city = 'City is required.';
    if (!/^[A-Za-z]{2}$/.test(form.state.trim())) next.state = 'Use the 2-letter state code.';
    if (!form.zip.trim()) next.zip = 'ZIP is required.';
    const leaseError = checkFile(lease, LEASE_RULE);
    if (leaseError) next.lease = leaseError;
    const photoError = checkFile(photo, PHOTO_RULE);
    if (photoError) next.photo = photoError;
    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length || !lease || !photo) return;
    try {
      await submit.mutateAsync({
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim(),
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        zip: form.zip.trim(),
        lease,
        photo,
      });
      setForm(EMPTY_FORM);
      setLease(null);
      setPhoto(null);
      setErrors({});
      addToast({ type: 'success', message: 'Office submitted for review.' });
    } catch (error) {
      const message = describeError(error, 'Failed to submit your office.');
      setErrors(fieldErrors(error));
      setFormError(message);
      addToast({ type: 'error', message });
    }
  };

  const handleWithdraw = async () => {
    if (!toWithdraw) return;
    try {
      await withdraw.mutateAsync(toWithdraw.id);
      addToast({ type: 'success', message: 'Office withdrawn.' });
    } catch (error) {
      addToast({ type: 'error', message: describeError(error, 'Failed to withdraw the office.') });
    } finally {
      setToWithdraw(null);
    }
  };

  const withdrawingApproved = toWithdraw?.status === 'approved';
  const noOfficeRate = rates ? ` (${formatCents(rates.without_office_cents)})` : '';

  return (
    <div className="glass-section" id="settings-plugin-fees-office">
      <div className="section-header">
        <h3 className="section-title">
          <span className="title-icon">🏢</span>
          Office
        </h3>
      </div>

      <div className="wb-pf-stack">
        <div className="wb-pf-callout">
          {billable
            ? 'The office rate applies only after your office is approved; until then you are billed at the no-office rate.'
            : 'Your office is recorded once approved. It does not change any plug-in fee for your level.'}
          {billable && rates ? (
            <>
              {' '}
              For {formatMonth(rates.month)}: <strong>{formatCents(rates.with_office_cents)}</strong>{' '}
              with an approved office · <strong>{formatCents(rates.without_office_cents)}</strong>{' '}
              without.
            </>
          ) : null}
        </div>

        <div className="wb-pf-stack" style={{ gap: 8 }}>
          <h4 className="wb-pf-subheading">Approved office</h4>
          {effective ? (
            <OfficeSummary
              office={effective}
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
            <p className="wb-pf-muted">
              {billable
                ? `No approved office — you are billed at the no-office rate${noOfficeRate}.`
                : 'No approved office.'}
            </p>
          )}
        </div>

        {pending ? (
          <div className="wb-pf-stack" style={{ gap: 8 }}>
            <h4 className="wb-pf-subheading">Awaiting review</h4>
            <OfficeSummary
              office={pending}
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
          <h4 className="wb-pf-subheading">{effective ? 'Submit a new office' : 'Submit your office'}</h4>
          {hasPending ? (
            <p className="wb-pf-muted">
              You have a submission awaiting review. Withdraw it to submit a different one.
            </p>
          ) : effective ? (
            <p className="wb-pf-muted">
              Your approved office stays in effect until the new one is approved.
            </p>
          ) : null}

          <fieldset disabled={hasPending || busy} className="wb-pf-stack" style={{ border: 0, padding: 0, margin: 0 }}>
            <div className="wb-pf-form-grid">
              <div className="field-group wb-pf-span-2">
                <label htmlFor="wb-pf-office-line1">Address line 1</label>
                <input
                  id="wb-pf-office-line1"
                  className="input-field"
                  value={form.address_line1}
                  onChange={(e) => setField('address_line1', e.target.value)}
                  autoComplete="address-line1"
                />
                {errors.address_line1 ? <p className="wb-pf-field-error">{errors.address_line1}</p> : null}
              </div>
              <div className="field-group wb-pf-span-2">
                <label htmlFor="wb-pf-office-line2">Address line 2 (optional)</label>
                <input
                  id="wb-pf-office-line2"
                  className="input-field"
                  value={form.address_line2}
                  onChange={(e) => setField('address_line2', e.target.value)}
                  autoComplete="address-line2"
                />
                {errors.address_line2 ? <p className="wb-pf-field-error">{errors.address_line2}</p> : null}
              </div>
              <div className="field-group">
                <label htmlFor="wb-pf-office-city">City</label>
                <input
                  id="wb-pf-office-city"
                  className="input-field"
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                  autoComplete="address-level2"
                />
                {errors.city ? <p className="wb-pf-field-error">{errors.city}</p> : null}
              </div>
              <div className="wb-pf-form-grid" style={{ gap: 14 }}>
                <div className="field-group">
                  <label htmlFor="wb-pf-office-state">State</label>
                  <input
                    id="wb-pf-office-state"
                    className="input-field"
                    value={form.state}
                    maxLength={2}
                    placeholder="TX"
                    onChange={(e) => setField('state', e.target.value.toUpperCase())}
                    autoComplete="address-level1"
                  />
                  {errors.state ? <p className="wb-pf-field-error">{errors.state}</p> : null}
                </div>
                <div className="field-group">
                  <label htmlFor="wb-pf-office-zip">ZIP</label>
                  <input
                    id="wb-pf-office-zip"
                    className="input-field"
                    value={form.zip}
                    inputMode="numeric"
                    onChange={(e) => setField('zip', e.target.value)}
                    autoComplete="postal-code"
                  />
                  {errors.zip ? <p className="wb-pf-field-error">{errors.zip}</p> : null}
                </div>
              </div>
              <div>
                <StagedFilePicker
                  label="Lease agreement"
                  hint={LEASE_RULE.label}
                  accept={LEASE_RULE.accept}
                  file={lease}
                  onFileChange={setLease}
                  disabled={hasPending || busy}
                  error={errors.lease}
                />
              </div>
              <div>
                <StagedFilePicker
                  label="Office photo"
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
                {busy ? 'Submitting…' : 'Submit office for review'}
              </button>
            </div>
          </fieldset>
        </form>

        <History
          items={history}
          render={(item) => <OfficeSummary office={item} />}
        />
      </div>

      <ConfirmationDialog
        open={Boolean(toWithdraw)}
        title={withdrawingApproved ? 'Withdraw your approved office?' : 'Withdraw this submission?'}
        message={
          withdrawingApproved
            ? billable
              ? `This tells us you no longer have an office. From the next billing cycle you will be billed at the no-office rate${noOfficeRate}.`
              : 'This tells us you no longer have an office.'
            : 'The submission will be removed from the review queue. You can submit again afterwards.'
        }
        confirmText="Withdraw"
        loading={withdraw.isPending}
        onConfirm={handleWithdraw}
        onClose={() => setToWithdraw(null)}
      />
    </div>
  );
}

/**
 * One ticket in the public "manage my tickets" list, with inline assign and
 * transfer forms.
 *
 * Assign and transfer are deliberately separate actions, mirroring the backend:
 * assigning names the attendee on the badge, transferring hands the ticket to
 * someone else (which clears the holder, so the recipient names their own).
 * The transfer control is disabled from the policy flags the claim returned, so
 * the UI blocks exactly what `TicketService.transfer` would reject.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';

import type { ClaimResult, PublicOrderTicket } from '../../types/public';
import { PUBLIC_FIELD_CLASS } from '../../utils/public-brand';
import { BrandButton, PublicCard, PublicField } from './public-event-shell';

/** Human-readable status for each assignment state. */
const STATUS_LABEL: Record<PublicOrderTicket['assignment_status'], string> = {
  UNASSIGNED: 'No attendee named',
  ASSIGNED: 'Attendee named',
  TRANSFERRED: 'Transferred — awaiting new attendee',
};

const STATUS_CLASS: Record<PublicOrderTicket['assignment_status'], string> = {
  UNASSIGNED:
    'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200',
  ASSIGNED: 'bg-green-100 text-green-900 dark:bg-green-500/15 dark:text-green-200',
  TRANSFERRED: 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/70',
};

type OpenForm = 'none' | 'assign' | 'transfer';

interface ClaimedTicketRowProps {
  ticket: PublicOrderTicket;
  claim: ClaimResult;
  busy: boolean;
  onAssign: (holder: {
    first_name: string;
    last_name: string;
    holder_email: string;
    phone?: string;
  }) => Promise<boolean>;
  onTransfer: (recipient: { to_email: string; to_name?: string }) => Promise<boolean>;
}

export function ClaimedTicketRow({
  ticket,
  claim,
  busy,
  onAssign,
  onTransfer,
}: ClaimedTicketRowProps) {
  const [open, setOpen] = useState<OpenForm>('none');

  // A ticket that has already moved once can only move again if the organizer
  // allows multiple transfers.
  const transferBlockedReason = !claim.allow_transfers
    ? 'Transfers are disabled for this event.'
    : !claim.transfer_window_open
      ? 'The transfer window for this event has closed.'
      : ticket.transfer_count > 0 && !claim.allow_multiple_transfers
        ? 'This ticket has already been transferred once.'
        : null;

  const handleDone = async (action: () => Promise<boolean>) => {
    if (await action()) setOpen('none');
  };

  return (
    <PublicCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-sm font-semibold">{ticket.ticket_number}</div>
          <span
            className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
              STATUS_CLASS[ticket.assignment_status]
            }`}
          >
            {STATUS_LABEL[ticket.assignment_status]}
          </span>
          {ticket.holder_name ? (
            <div className="mt-2 text-sm">
              <span className="font-medium">{ticket.holder_name}</span>
              {ticket.holder_email ? (
                <span className="text-slate-500 dark:text-white/50">
                  {' '}
                  · {ticket.holder_email}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            to={`/event/ticket/${ticket.qr_token}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10"
          >
            View
          </Link>
          <button
            type="button"
            onClick={() => setOpen(open === 'assign' ? 'none' : 'assign')}
            disabled={busy}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
          >
            {ticket.assignment_status === 'ASSIGNED' ? 'Change Attendee' : 'Assign'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(open === 'transfer' ? 'none' : 'transfer')}
            disabled={busy || transferBlockedReason !== null}
            title={transferBlockedReason ?? undefined}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
          >
            Transfer
          </button>
        </div>
      </div>

      {open === 'assign' ? (
        <AssignForm
          ticket={ticket}
          busy={busy}
          onCancel={() => setOpen('none')}
          onSubmit={(holder) => handleDone(() => onAssign(holder))}
        />
      ) : null}

      {open === 'transfer' ? (
        <TransferForm
          busy={busy}
          onCancel={() => setOpen('none')}
          onSubmit={(recipient) => handleDone(() => onTransfer(recipient))}
        />
      ) : null}

      {transferBlockedReason && open === 'none' ? (
        <p className="mt-3 text-xs text-slate-500 dark:text-white/50">
          {transferBlockedReason}
        </p>
      ) : null}
    </PublicCard>
  );
}

function AssignForm({
  ticket,
  busy,
  onCancel,
  onSubmit,
}: {
  ticket: PublicOrderTicket;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (holder: {
    first_name: string;
    last_name: string;
    holder_email: string;
    phone?: string;
  }) => void;
}) {
  // Pre-fill from the current holder so "change attendee" is an edit, not a
  // re-entry.
  const [firstName, setFirstName] = useState(ticket.holder_first_name);
  const [lastName, setLastName] = useState(ticket.holder_last_name);
  const [email, setEmail] = useState(ticket.holder_email);
  const [phone, setPhone] = useState(ticket.holder_phone);

  const incomplete = !firstName.trim() || !lastName.trim() || !email.trim();

  return (
    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-white/10">
      <h3 className="text-sm font-semibold">Who is attending on this ticket?</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <PublicField label="First name" required>
          <input
            className={PUBLIC_FIELD_CLASS}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={busy}
          />
        </PublicField>
        <PublicField label="Last name" required>
          <input
            className={PUBLIC_FIELD_CLASS}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={busy}
          />
        </PublicField>
        <PublicField label="Email" required hint="Their ticket is emailed here.">
          <input
            type="email"
            className={PUBLIC_FIELD_CLASS}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </PublicField>
        <PublicField label="Phone">
          <input
            type="tel"
            className={PUBLIC_FIELD_CLASS}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={busy}
          />
        </PublicField>
      </div>
      <FormActionsRow
        busy={busy}
        disabled={incomplete}
        submitLabel="Save Attendee"
        onCancel={onCancel}
        onSubmit={() =>
          onSubmit({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            holder_email: email.trim(),
            phone: phone.trim() || undefined,
          })
        }
      />
    </div>
  );
}

function TransferForm({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (recipient: { to_email: string; to_name?: string }) => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  return (
    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-white/10">
      <h3 className="text-sm font-semibold">Transfer this ticket</h3>
      <p className="text-xs text-slate-600 dark:text-white/60">
        The recipient gets an email with their own ticket link, and they name the
        attendee themselves. You won't be able to manage this ticket afterwards.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <PublicField label="Recipient email" required>
          <input
            type="email"
            className={PUBLIC_FIELD_CLASS}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </PublicField>
        <PublicField label="Recipient name">
          <input
            className={PUBLIC_FIELD_CLASS}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />
        </PublicField>
      </div>
      <FormActionsRow
        busy={busy}
        disabled={!email.trim()}
        submitLabel="Transfer Ticket"
        onCancel={onCancel}
        onSubmit={() =>
          onSubmit({ to_email: email.trim(), to_name: name.trim() || undefined })
        }
      />
    </div>
  );
}

/** Shared cancel/submit row for the two inline forms. */
function FormActionsRow({
  busy,
  disabled,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  disabled: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <BrandButton onClick={onSubmit} disabled={busy || disabled}>
        {busy ? 'Saving…' : submitLabel}
      </BrandButton>
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="text-sm underline underline-offset-2 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}

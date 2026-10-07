import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Button,
  Form,
  FormActions,
  FormRow,
  FormRowGroup,
  Input,
  Label,
  Modal,
  Text,
  Textarea,
} from '@shared/components';
import type { EventTicket, HandOverPayload } from '../types/ticket';
import { useEventSellers } from '../hooks/use-event-sellers';
import { TicketSellerSelect } from './ticket-seller-select';
import { TicketRecipientPicker } from './ticket-recipient-picker';
import { EMPTY_RECIPIENT, recipientFields, type RecipientDraft } from '../utils/recipient-draft';

interface HandOverTicketModalProps {
  open: boolean;
  ticket: EventTicket | null;
  /** Fallback when the ticket payload doesn't carry its event id. */
  eventId?: number;
  /**
   * `self` — the named attendee transferring their own ticket (My tickets).
   * `manager` — staff transferring it on someone's behalf.
   */
  mode: 'self' | 'manager';
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: HandOverPayload) => Promise<void>;
}

/**
 * Transfer by hand-over: the same ticket and confirmation, a new named attendee
 * (`POST tickets/{id}/hand-over/`). It is called "Transfer" in the UI — the word
 * staff and attendees use — and it is the only way a BSCPro ticket changes hands,
 * since its confirmation and QR must stay valid. Unlike WB's ownership transfer,
 * ownership doesn't move — only who is on it. The new holder is emailed their
 * ticket. The SMD question is optional here.
 *
 * A manager finds the new attendee with `TicketRecipientPicker` (agents and
 * prospects; somebody new becomes a prospect) and the SMD follows the person's
 * recruiting line. The attendee transferring their own ticket types the person in.
 */
export function HandOverTicketModal({
  open,
  ticket,
  eventId,
  mode,
  submitting,
  onClose,
  onSubmit,
}: HandOverTicketModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [sellerId, setSellerId] = useState<number | null>(null);
  const [recipient, setRecipient] = useState<RecipientDraft>(EMPTY_RECIPIENT);
  const sellers = useEventSellers(ticket?.event ?? eventId, open);
  const isManager = mode === 'manager';

  useEffect(() => {
    if (!open) return;
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setReason('');
    setSellerId(null);
    setRecipient(EMPTY_RECIPIENT);
  }, [open]);

  // A new prospect joins the chosen SMD's team, so the SMD is required then.
  const addingProspect = isManager && !recipient.person && recipient.createProspect;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const extra = {
      ...(sellerId != null ? { attributed_seller_id: sellerId } : {}),
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    };
    if (isManager) {
      const { phone: typedPhone, ...fields } = recipientFields(recipient);
      await onSubmit({ ...fields, ...(typedPhone ? { phone: typedPhone } : {}), ...extra });
      return;
    }
    await onSubmit({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...extra,
    });
  };

  const isPartner = ticket?.source === 'BSCPRO';
  const confirmation = isPartner && ticket?.external_reference ? ` (BSCPro ${ticket.external_reference})` : '';

  return (
    <Modal
      open={open}
      title={
        mode === 'self'
          ? 'Transfer this ticket'
          : ticket
            ? `Transfer ticket — ${ticket.ticket_number}`
            : 'Transfer ticket'
      }
      onClose={onClose}
      contentClassName="max-w-lg"
    >
      <Form onSubmit={handleSubmit}>
        <Text variant="muted" className="text-sm">
          {mode === 'self'
            ? `Your ticket's confirmation${confirmation} stays the same; it is transferred to the person you enter. They'll be emailed their ticket, and you won't be able to use it any more.`
            : `The ticket is transferred to the person below and they are emailed their ticket. The ticket and its confirmation${confirmation} stay the same.`}
        </Text>
        {isManager ? (
          <TicketRecipientPicker
            eventId={ticket?.event ?? eventId}
            value={recipient}
            onChange={setRecipient}
            onPick={(person) => setSellerId(person?.upline_seller?.id ?? null)}
            sellerName={sellers.find((s) => s.id === sellerId)?.display_name}
          />
        ) : (
          <FormRowGroup columns={2}>
            <FormRow>
              <Label variant="form">First name</Label>
              <Input required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </FormRow>
            <FormRow>
              <Label variant="form">Last name</Label>
              <Input required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </FormRow>
            <FormRow>
              <Label variant="form">Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormRow>
            <FormRow>
              <Label variant="form">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
            </FormRow>
          </FormRowGroup>
        )}
        <TicketSellerSelect
          sellers={sellers}
          value={sellerId}
          onChange={setSellerId}
          label={addingProspect ? "New attendee's SMD" : "New attendee's SMD (optional)"}
          optional={!addingProspect}
        />
        <FormRow>
          <Label variant="form">Reason</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Optional — e.g. can't attend, giving to a teammate"
          />
        </FormRow>
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Transferring…' : 'Transfer ticket'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}

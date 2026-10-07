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

interface HandOverTicketModalProps {
  open: boolean;
  ticket: EventTicket | null;
  /** Fallback when the ticket payload doesn't carry its event id. */
  eventId?: number;
  /**
   * `self` — the named attendee handing over their own ticket (My tickets).
   * `manager` — staff recording a name change on someone's behalf.
   */
  mode: 'self' | 'manager';
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: HandOverPayload) => Promise<void>;
}

/**
 * Hand-over (name change): the same ticket and confirmation, a new named
 * attendee. Unlike a transfer, ownership doesn't move — only who is on it. The
 * new holder is emailed their ticket. The SMD question is optional here.
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
  const sellers = useEventSellers(ticket?.event ?? eventId, open);

  useEffect(() => {
    if (!open) return;
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setReason('');
    setSellerId(null);
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(sellerId != null ? { attributed_seller_id: sellerId } : {}),
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    });
  };

  const isPartner = ticket?.source === 'BSCPRO';
  const confirmation = isPartner && ticket?.external_reference ? ` (BSCPro ${ticket.external_reference})` : '';

  return (
    <Modal
      open={open}
      title={
        mode === 'self'
          ? 'Hand over this ticket'
          : ticket
            ? `Record name change — ${ticket.ticket_number}`
            : 'Record name change'
      }
      onClose={onClose}
      contentClassName="max-w-lg"
    >
      <Form onSubmit={handleSubmit}>
        <Text variant="muted" className="text-sm">
          {mode === 'self'
            ? `Your ticket's confirmation${confirmation} stays the same; the name on it changes to the person you enter. They'll be emailed their ticket, and you won't be able to use it any more.`
            : `The ticket and its confirmation${confirmation} stay the same; the named attendee changes to the person below and they are emailed their ticket.`}
        </Text>
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
        <TicketSellerSelect
          sellers={sellers}
          value={sellerId}
          onChange={setSellerId}
          label="New attendee's SMD (optional)"
          optional
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
            {submitting ? 'Saving…' : mode === 'self' ? 'Hand over ticket' : 'Record name change'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}

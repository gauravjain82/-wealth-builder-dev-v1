import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Button,
  Checkbox,
  Form,
  FormActions,
  FormRow,
  FormRowGroup,
  Input,
  Label,
  Modal,
} from '@shared/components';
import type { AssignHolderPayload, EventTicket } from '../types/ticket';
import { useEventSellers } from '../hooks/use-event-sellers';
import { TicketSellerSelect } from './ticket-seller-select';

interface AssignTicketModalProps {
  open: boolean;
  ticket: EventTicket | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: AssignHolderPayload) => Promise<void>;
}

/**
 * Authenticated assign-holder modal.
 *
 * Owns the "Add as prospect to my team" toggle — the backend already supports
 * `create_prospect`; this is the logged-in-only UI (a guest purchaser has no
 * team to attach a prospect to). Also asks which SMD the holder is with, so a
 * ticket bought by one SMD for someone else is credited to that person's SMD.
 */
export function AssignTicketModal({
  open,
  ticket,
  submitting,
  onClose,
  onSubmit,
}: AssignTicketModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [createProspect, setCreateProspect] = useState(false);
  const [sellerId, setSellerId] = useState<number | null>(null);
  const sellers = useEventSellers(ticket?.event, open);

  useEffect(() => {
    if (!open || !ticket) return;
    setFirstName(ticket.holder_first_name);
    setLastName(ticket.holder_last_name);
    setEmail(ticket.holder_email);
    setPhone(ticket.holder_phone);
    setCreateProspect(false);
    // A fresh ticket still carries the buyer's SMD, which may not be the
    // attendee's — only pre-select once someone has been named.
    setSellerId(ticket.assignment_status === 'ASSIGNED' ? (ticket.attributed_seller ?? null) : null);
  }, [open, ticket]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      create_prospect: createProspect,
      attributed_seller_id: sellerId,
    });
  };

  return (
    <Modal
      open={open}
      title={ticket ? `Assign ${ticket.ticket_number}` : 'Assign ticket'}
      onClose={onClose}
      contentClassName="max-w-lg"
    >
      <Form onSubmit={handleSubmit}>
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
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormRow>
          <FormRow>
            <Label variant="form">Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormRow>
        </FormRowGroup>
        <TicketSellerSelect
          sellers={sellers}
          value={sellerId}
          onChange={setSellerId}
          label="Attendee's SMD"
        />
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-white/80">
          <Checkbox
            checked={createProspect}
            onChange={(e) => setCreateProspect(e.target.checked)}
          />
          Add as prospect to my team
        </label>
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Assign holder'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}

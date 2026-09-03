import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Button,
  Form,
  FormActions,
  FormRow,
  Input,
  Label,
  Modal,
  Text,
  UserAutocompleteDropdown,
} from '@shared/components';
import type { EventTicket, TransferPayload } from '../types/ticket';

interface TransferTicketModalProps {
  open: boolean;
  ticket: EventTicket | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: TransferPayload) => Promise<void>;
}

/**
 * Transfer ownership to a teammate (picked from the user directory) or an
 * off-platform email. Matches the backend `to_user_id` / `to_email` / `to_label`.
 */
export function TransferTicketModal({
  open,
  ticket,
  submitting,
  onClose,
  onSubmit,
}: TransferTicketModalProps) {
  const [toUserId, setToUserId] = useState<number | null>(null);
  const [toLabel, setToLabel] = useState('');
  const [toEmail, setToEmail] = useState('');

  useEffect(() => {
    if (!open) return;
    setToUserId(null);
    setToLabel('');
    setToEmail('');
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      to_user_id: toUserId ?? undefined,
      to_email: toEmail.trim(),
      to_label: toLabel.trim(),
    });
  };

  return (
    <Modal
      open={open}
      title={ticket ? `Transfer ${ticket.ticket_number}` : 'Transfer ticket'}
      onClose={onClose}
      contentClassName="max-w-lg"
    >
      <Form onSubmit={handleSubmit}>
        <Text variant="muted" className="text-sm">
          Ownership moves to the recipient. Holder name is cleared — they (or you)
          must re-assign the attendee.
        </Text>
        <FormRow>
          <Label variant="form">Teammate</Label>
          <UserAutocompleteDropdown
            selectedId={toUserId}
            selectedLabel={toLabel}
            placeholder="Search by name or agent code"
            fetchFromApi
            onSelect={(option) => {
              setToUserId(option.id);
              setToLabel(option.label);
            }}
          />
        </FormRow>
        <FormRow>
          <Label variant="form">Recipient name</Label>
          <Input
            value={toLabel}
            onChange={(e) => setToLabel(e.target.value)}
            placeholder="Display name on the transfer record"
          />
        </FormRow>
        <FormRow>
          <Label variant="form">Recipient email</Label>
          <Input
            type="email"
            required={!toUserId}
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            placeholder="Required if they are not a platform user"
          />
        </FormRow>
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Transferring…' : 'Transfer'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}

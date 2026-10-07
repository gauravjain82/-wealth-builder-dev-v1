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
import { useEventSellers } from '../hooks/use-event-sellers';
import { TicketSellerSelect } from './ticket-seller-select';
import { TicketRecipientPicker } from './ticket-recipient-picker';
import { EMPTY_RECIPIENT, recipientFields, type RecipientDraft } from '../utils/recipient-draft';

interface TransferTicketModalProps {
  open: boolean;
  ticket: EventTicket | null;
  /**
   * `owner` — the buyer, picking a teammate from their user directory.
   * `manager` — staff, finding any agent or prospect, or adding a new prospect.
   */
  mode: 'owner' | 'manager';
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: TransferPayload) => Promise<void>;
}

/**
 * Transfer ownership to a teammate (picked from the user directory) or an
 * off-platform email. Matches the backend `to_user_id` / `to_email` / `to_label`,
 * plus the SMD the recipient is with (re-credits the ticket).
 *
 * A manager uses `TicketRecipientPicker` instead — the same person search as the
 * BSCPro transfer (hand-over), with the SMD following the person's recruiting line.
 */
export function TransferTicketModal({
  open,
  ticket,
  mode,
  submitting,
  onClose,
  onSubmit,
}: TransferTicketModalProps) {
  const [toUserId, setToUserId] = useState<number | null>(null);
  const [toLabel, setToLabel] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [sellerId, setSellerId] = useState<number | null>(null);
  const [recipient, setRecipient] = useState<RecipientDraft>(EMPTY_RECIPIENT);
  const sellers = useEventSellers(ticket?.event, open);
  const isManager = mode === 'manager';

  useEffect(() => {
    if (!open) return;
    setToUserId(null);
    setToLabel('');
    setToEmail('');
    setSellerId(null);
    setRecipient(EMPTY_RECIPIENT);
  }, [open]);

  const addingProspect = isManager && !recipient.person && recipient.createProspect;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isManager) {
      const fields = recipientFields(recipient);
      await onSubmit({
        to_user_id: fields.to_user_id,
        to_first_name: fields.first_name,
        to_last_name: fields.last_name,
        to_email: fields.email,
        to_phone: fields.phone,
        create_prospect: fields.create_prospect,
        update_contact: fields.update_contact,
        attributed_seller_id: sellerId,
      });
      return;
    }
    await onSubmit({
      to_user_id: toUserId ?? undefined,
      to_email: toEmail.trim(),
      to_label: toLabel.trim(),
      attributed_seller_id: sellerId,
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
        {isManager ? (
          <TicketRecipientPicker
            eventId={ticket?.event}
            value={recipient}
            onChange={setRecipient}
            onPick={(person) => setSellerId(person?.upline_seller?.id ?? null)}
            sellerName={sellers.find((s) => s.id === sellerId)?.display_name}
          />
        ) : (
          <>
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
          </>
        )}
        <TicketSellerSelect
          sellers={sellers}
          value={sellerId}
          onChange={setSellerId}
          label="Recipient's SMD"
          optional={isManager && !addingProspect}
        />
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

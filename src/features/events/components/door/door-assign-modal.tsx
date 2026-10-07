import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Form, FormActions, Modal, Text } from '@shared/components';
import type { CheckinAttendee } from '../../types/checkin';
import type { AssignHolderPayload } from '../../types/ticket';
import { useEventSellers } from '../../hooks/use-event-sellers';
import { TicketSellerSelect } from '../ticket-seller-select';
import { TicketRecipientPicker } from '../ticket-recipient-picker';
import { EMPTY_RECIPIENT, recipientFields, type RecipientDraft } from '../../utils/recipient-draft';

interface DoorAssignModalProps {
  eventId: number;
  /** The ticket being named; `null` keeps the modal closed. */
  attendee: CheckinAttendee | null;
  /** Who bought it, so staff can see whose ticket they are naming. */
  purchaserName?: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: AssignHolderPayload) => Promise<void>;
}

/**
 * Assign at the door (purchase managers): name the person attending on a ticket.
 *
 * The same person search as a manager's transfer — pick an agent or an existing
 * prospect, or type someone new and add them as a prospect on the SMD's team.
 * Unlike a transfer, ownership stays with the buyer (PHASES E4).
 */
export function DoorAssignModal({
  eventId,
  attendee,
  purchaserName,
  submitting,
  onClose,
  onSubmit,
}: DoorAssignModalProps) {
  const open = attendee !== null;
  const [recipient, setRecipient] = useState<RecipientDraft>(EMPTY_RECIPIENT);
  const [sellerId, setSellerId] = useState<number | null>(null);
  const sellers = useEventSellers(eventId, open);

  useEffect(() => {
    if (!open) return;
    setRecipient(EMPTY_RECIPIENT);
    setSellerId(null);
  }, [open, attendee?.id]);

  const addingProspect = !recipient.person && recipient.createProspect;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = recipientFields(recipient);
    await onSubmit({
      to_user_id: fields.to_user_id,
      first_name: fields.first_name,
      last_name: fields.last_name,
      email: fields.email,
      phone: fields.phone || undefined,
      create_prospect: fields.create_prospect,
      update_contact: fields.update_contact,
      attributed_seller_id: sellerId,
    });
  };

  return (
    <Modal
      open={open}
      title={attendee ? `Assign ${attendee.ticket_number}` : 'Assign ticket'}
      onClose={onClose}
      contentClassName="max-w-lg"
    >
      <Form onSubmit={handleSubmit}>
        {attendee ? (
          <Text variant="muted" className="text-sm">
            {[
              purchaserName ? `Bought by ${purchaserName}` : '',
              attendee.external_reference ? `BSCPro ${attendee.external_reference}` : '',
              attendee.invoice_number,
            ]
              .filter(Boolean)
              .join(' · ')}
            <span className="block">The ticket stays with its buyer — this names who is attending.</span>
          </Text>
        ) : null}
        <TicketRecipientPicker
          eventId={eventId}
          value={recipient}
          onChange={setRecipient}
          onPick={(person) => setSellerId(person?.upline_seller?.id ?? null)}
          sellerName={sellers.find((s) => s.id === sellerId)?.display_name}
        />
        <TicketSellerSelect
          sellers={sellers}
          value={sellerId}
          onChange={setSellerId}
          label="Attendee's SMD"
          optional={!addingProspect}
        />
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Assigning…' : 'Assign'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}

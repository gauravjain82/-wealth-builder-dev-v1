import { FormRow, Label, Text } from '@shared/components';
import type { EventTrackedSeller } from '../types/config';
import { SellerCombobox } from './seller-combobox';

/**
 * "Which SMD is this person with?" for the in-app assign / transfer modals.
 *
 * One SMD can buy many tickets and hand them to people from other SMDs or
 * external teams; the answer re-credits the ticket to that person's SMD. Only
 * the SMDs are listed — an external leader's team is an internal grouping and is
 * not shown. The list is A–Z and narrows as you type a name or agency code.
 * Renders nothing when the event has no seller list.
 */
export function TicketSellerSelect({
  sellers,
  value,
  onChange,
  label,
  optional = false,
}: {
  sellers: EventTrackedSeller[];
  value: number | null;
  onChange: (next: number | null) => void;
  label: string;
  /** Leave the answer optional (keeps the current SMD when unanswered). */
  optional?: boolean;
}) {
  if (sellers.length === 0) return null;

  return (
    <FormRow>
      <Label variant="form">{label}</Label>
      <SellerCombobox
        sellers={sellers}
        value={value}
        onChange={onChange}
        required={!optional}
        inputClassName="input w-full"
        placeholder={
          optional
            ? 'Keep the current SMD, or type a name or agency code'
            : 'Type a name or agency code'
        }
      />
      <Text variant="muted" className="text-xs">
        The ticket is credited to this SMD in the event reports.
      </Text>
    </FormRow>
  );
}

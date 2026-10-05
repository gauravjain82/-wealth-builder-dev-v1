import { useMemo } from 'react';
import { FormRow, Label, Select, Text } from '@shared/components';
import type { EventTrackedSeller } from '../types/config';

/**
 * "Which SMD is this person with?" for the in-app assign / transfer modals.
 *
 * One SMD can buy many tickets and hand them to people from other SMDs or
 * external teams; the answer re-credits the ticket to that person's SMD. Our own
 * leaders are listed first, then each external team as its own group. Renders
 * nothing when the event has no seller list.
 */
export function TicketSellerSelect({
  sellers,
  value,
  onChange,
  label,
}: {
  sellers: EventTrackedSeller[];
  value: number | null;
  onChange: (next: number | null) => void;
  label: string;
}) {
  const groups = useMemo(() => {
    const byTeam = new Map<string, EventTrackedSeller[]>([['', []]]);
    for (const seller of sellers) {
      byTeam.set(seller.team_name, [...(byTeam.get(seller.team_name) ?? []), seller]);
    }
    return [...byTeam];
  }, [sellers]);

  if (sellers.length === 0) return null;

  const option = (seller: EventTrackedSeller) => (
    <option key={seller.id} value={seller.id}>
      {seller.display_name} ({seller.agent_code})
    </option>
  );

  return (
    <FormRow>
      <Label variant="form">{label}</Label>
      <Select
        required
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Select an SMD</option>
        {groups.map(([team, list]) =>
          team ? (
            <optgroup key={team} label={team}>
              {list.map(option)}
            </optgroup>
          ) : (
            list.map(option)
          ),
        )}
      </Select>
      <Text variant="muted" className="text-xs">
        The ticket is credited to this SMD in the event reports.
      </Text>
    </FormRow>
  );
}

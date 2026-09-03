import {
  Checkbox,
  DateTimePicker,
  FormRow,
  FormRowGroup,
  Input,
  Label,
  Select,
  Text,
} from '@shared/components';
import { TabForm } from './tab-form';
import type { TabProps } from './types';
import { emptyToNull, useTabForm } from './use-tab-form';

type TrackBy = 'SMD' | 'NET_CEO_MD' | 'LEADER' | 'DONT_TRACK';
type PriceDisplayMode = 'CURRENT_ONLY' | 'CURRENT_AND_EXPIRATION';

interface TicketingForm {
  track_by: TrackBy;
  show_seller_rankings: boolean;
  max_tickets: string;
  per_transaction_limit: string;
  price_display_mode: PriceDisplayMode;
  stop_transfer_at: string;
  allow_transfers: boolean;
  allow_multiple_transfers: boolean;
}

const TRACK_BY_OPTIONS: { value: TrackBy; label: string }[] = [
  { value: 'DONT_TRACK', label: "Don't track" },
  { value: 'SMD', label: 'SMD' },
  { value: 'NET_CEO_MD', label: 'Net CEO-MD' },
  { value: 'LEADER', label: 'Leader' },
];

/** Attribution mode, capacity, and transfer policy for team ticketing. */
export function TicketingTab({ event, saving, onSave }: TabProps) {
  const { form, set, dirty, submit } = useTabForm<TicketingForm>(
    {
      track_by: event.track_by ?? 'DONT_TRACK',
      show_seller_rankings: event.show_seller_rankings,
      max_tickets: event.max_tickets === null ? '' : String(event.max_tickets),
      per_transaction_limit: String(event.per_transaction_limit ?? 10),
      price_display_mode: event.price_display_mode ?? 'CURRENT_ONLY',
      stop_transfer_at: event.stop_transfer_at ?? '',
      allow_transfers: event.allow_transfers,
      allow_multiple_transfers: event.allow_multiple_transfers,
    },
    (data) =>
      onSave({
        track_by: data.track_by,
        show_seller_rankings: data.show_seller_rankings,
        max_tickets: data.max_tickets === '' ? null : Number(data.max_tickets),
        per_transaction_limit: Number(data.per_transaction_limit) || 1,
        price_display_mode: data.price_display_mode,
        stop_transfer_at: emptyToNull(data.stop_transfer_at),
        allow_transfers: data.allow_transfers,
        allow_multiple_transfers: data.allow_multiple_transfers,
      }),
  );

  return (
    <TabForm dirty={dirty} saving={saving} onSubmit={submit}>
      <FormRowGroup columns={2}>
        <FormRow>
          <Label variant="form">Track sales by</Label>
          <Select
            value={form.track_by}
            onChange={(e) => set('track_by', e.target.value as TrackBy)}
          >
            {TRACK_BY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow>
          <Label variant="form">Price display</Label>
          <Select
            value={form.price_display_mode}
            onChange={(e) => set('price_display_mode', e.target.value as PriceDisplayMode)}
          >
            <option value="CURRENT_ONLY">Current price only</option>
            <option value="CURRENT_AND_EXPIRATION">Current price and expiration</option>
          </Select>
        </FormRow>
      </FormRowGroup>

      <FormRowGroup columns={2}>
        <FormRow>
          <Label variant="form">Max tickets (blank = unlimited)</Label>
          <Input
            type="number"
            min={0}
            value={form.max_tickets}
            onChange={(e) => set('max_tickets', e.target.value)}
          />
        </FormRow>
        <FormRow>
          <Label variant="form">Per-transaction limit</Label>
          <Input
            type="number"
            min={1}
            value={form.per_transaction_limit}
            onChange={(e) => set('per_transaction_limit', e.target.value)}
          />
        </FormRow>
      </FormRowGroup>

      <FormRow>
        <Label variant="form">Stop transfers at</Label>
        <DateTimePicker
          value={form.stop_transfer_at}
          onChange={(v) => set('stop_transfer_at', v)}
        />
        <Text variant="muted" className="text-xs">
          After this time, ticket ownership can no longer be transferred.
        </Text>
      </FormRow>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.show_seller_rankings}
            onChange={(e) => set('show_seller_rankings', e.target.checked)}
          />
          Show seller rankings publicly
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.allow_transfers}
            onChange={(e) => set('allow_transfers', e.target.checked)}
          />
          Allow ticket transfers
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.allow_multiple_transfers}
            onChange={(e) => set('allow_multiple_transfers', e.target.checked)}
            disabled={!form.allow_transfers}
          />
          Allow a ticket to be transferred more than once
        </label>
      </div>
    </TabForm>
  );
}

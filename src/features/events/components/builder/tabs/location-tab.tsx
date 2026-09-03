import { FormRow, FormRowGroup, Input, Label, Textarea } from '@shared/components';
import { TabForm } from './tab-form';
import type { TabProps } from './types';
import { useTabForm } from './use-tab-form';

interface LocationForm {
  location_name: string;
  venue_name: string;
  address: string;
  location_phone: string;
  location_details: string;
  book_room_url: string;
}

/** Venue and location details shown on the public landing page. */
export function LocationTab({ event, saving, onSave }: TabProps) {
  const { form, set, dirty, submit } = useTabForm<LocationForm>(
    {
      location_name: event.location_name ?? '',
      venue_name: event.venue_name ?? '',
      address: event.address ?? '',
      location_phone: event.location_phone ?? '',
      location_details: event.location_details ?? '',
      book_room_url: event.book_room_url ?? '',
    },
    (data) => onSave({ ...data }),
  );

  return (
    <TabForm dirty={dirty} saving={saving} onSubmit={submit}>
      <FormRowGroup columns={2}>
        <FormRow>
          <Label variant="form">Location name</Label>
          <Input
            value={form.location_name}
            onChange={(e) => set('location_name', e.target.value)}
            placeholder="Orlando, FL"
          />
        </FormRow>
        <FormRow>
          <Label variant="form">Venue name</Label>
          <Input
            value={form.venue_name}
            onChange={(e) => set('venue_name', e.target.value)}
            placeholder="Convention Center"
          />
        </FormRow>
      </FormRowGroup>

      <FormRow>
        <Label variant="form">Address</Label>
        <Textarea
          rows={2}
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
        />
      </FormRow>

      <FormRowGroup columns={2}>
        <FormRow>
          <Label variant="form">Location phone</Label>
          <Input
            value={form.location_phone}
            onChange={(e) => set('location_phone', e.target.value)}
          />
        </FormRow>
        <FormRow>
          <Label variant="form">Book a room URL</Label>
          <Input
            value={form.book_room_url}
            onChange={(e) => set('book_room_url', e.target.value)}
            placeholder="https://…"
          />
        </FormRow>
      </FormRowGroup>

      <FormRow>
        <Label variant="form">Location details</Label>
        <Textarea
          rows={3}
          value={form.location_details}
          onChange={(e) => set('location_details', e.target.value)}
        />
      </FormRow>
    </TabForm>
  );
}

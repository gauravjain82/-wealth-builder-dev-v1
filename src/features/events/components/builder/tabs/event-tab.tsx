import {
  Checkbox,
  FormRow,
  FormRowGroup,
  Input,
  Label,
  TimezoneSelect,
} from '@shared/components';
import { EventDateTimePicker } from '../event-date-time-picker';
import { RichTextEditor } from '../rich-text-editor';
import { TabForm } from './tab-form';
import type { TabProps } from './types';
import { emptyToNull, useTabForm } from './use-tab-form';

interface EventForm {
  name: string;
  shortcut: string;
  begin_at: string;
  end_at: string;
  timezone: string;
  show_countdown: boolean;
  sales_start_at: string;
  sales_stop_at: string;
  contact_email: string;
  show_email: boolean;
  invoice_cc_emails: string;
  about: string;
  notes: string;
}

/** Core event details: name, public shortcut, schedule, and contact settings. */
export function EventTab({ event, saving, onSave }: TabProps) {
  const { form, set, dirty, submit } = useTabForm<EventForm>(
    {
      name: event.name ?? '',
      shortcut: event.shortcut ?? '',
      begin_at: event.begin_at ?? '',
      end_at: event.end_at ?? '',
      timezone: event.timezone ?? 'UTC',
      show_countdown: event.show_countdown,
      sales_start_at: event.sales_start_at ?? '',
      sales_stop_at: event.sales_stop_at ?? '',
      contact_email: event.contact_email ?? '',
      show_email: event.show_email,
      invoice_cc_emails: (event.invoice_cc_emails ?? []).join(', '),
      about: event.about ?? '',
      notes: event.notes ?? '',
    },
    (data) =>
      onSave({
        name: data.name,
        shortcut: data.shortcut,
        begin_at: emptyToNull(data.begin_at),
        end_at: emptyToNull(data.end_at),
        timezone: data.timezone,
        show_countdown: data.show_countdown,
        sales_start_at: emptyToNull(data.sales_start_at),
        sales_stop_at: emptyToNull(data.sales_stop_at),
        contact_email: data.contact_email,
        show_email: data.show_email,
        invoice_cc_emails: data.invoice_cc_emails
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean),
        about: data.about,
        notes: data.notes,
      }),
  );

  return (
    <TabForm dirty={dirty} saving={saving} onSubmit={submit}>
      <FormRowGroup columns={2}>
        <FormRow>
          <Label variant="form">Event name</Label>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
        </FormRow>
        <FormRow>
          <Label variant="form">URL shortcut</Label>
          <Input
            value={form.shortcut}
            onChange={(e) => set('shortcut', e.target.value)}
            placeholder="summit2026"
          />
        </FormRow>
      </FormRowGroup>

      <FormRowGroup columns={2}>
        <FormRow>
          <Label variant="form">Start date &amp; time</Label>
          <EventDateTimePicker
            value={form.begin_at}
            timeZone={form.timezone}
            onChange={(v) => set('begin_at', v)}
          />
        </FormRow>
        <FormRow>
          <Label variant="form">End date &amp; time</Label>
          <EventDateTimePicker
            value={form.end_at}
            timeZone={form.timezone}
            onChange={(v) => set('end_at', v)}
          />
        </FormRow>
      </FormRowGroup>

      <FormRowGroup columns={2}>
        <FormRow>
          <Label variant="form">Timezone</Label>
          <TimezoneSelect value={form.timezone} onChange={(timezone) => set('timezone', timezone)} />
        </FormRow>
        <FormRow>
          <Label variant="form">Contact email</Label>
          <Input
            type="email"
            value={form.contact_email}
            onChange={(e) => set('contact_email', e.target.value)}
          />
        </FormRow>
      </FormRowGroup>

      <FormRowGroup columns={2}>
        <FormRow>
          <Label variant="form">Sales start</Label>
          <EventDateTimePicker
            value={form.sales_start_at}
            timeZone={form.timezone}
            onChange={(v) => set('sales_start_at', v)}
          />
        </FormRow>
        <FormRow>
          <Label variant="form">Sales stop</Label>
          <EventDateTimePicker
            value={form.sales_stop_at}
            timeZone={form.timezone}
            onChange={(v) => set('sales_stop_at', v)}
          />
        </FormRow>
      </FormRowGroup>

      <FormRow>
        <Label variant="form">Invoice CC emails (comma-separated)</Label>
        <Input
          value={form.invoice_cc_emails}
          onChange={(e) => set('invoice_cc_emails', e.target.value)}
          placeholder="ops@example.com, finance@example.com"
        />
      </FormRow>

      <FormRow>
        <Label variant="form">About</Label>
        <RichTextEditor
          value={form.about}
          onChange={(html) => set('about', html)}
          placeholder="What is this event about? Who is it for?"
          minHeightClass="min-h-[160px]"
        />
      </FormRow>

      <FormRow>
        <Label variant="form">Notes</Label>
        <RichTextEditor
          value={form.notes}
          onChange={(html) => set('notes', html)}
          placeholder="Extra details: dress code, what to bring…"
        />
      </FormRow>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.show_countdown}
            onChange={(e) => set('show_countdown', e.target.checked)}
          />
          Show countdown timer
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.show_email}
            onChange={(e) => set('show_email', e.target.checked)}
          />
          Show contact email publicly
        </label>
      </div>
    </TabForm>
  );
}

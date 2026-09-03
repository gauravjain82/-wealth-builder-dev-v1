import { FormRow, Label, Text, Textarea } from '@shared/components';
import { TabForm } from './tab-form';
import type { TabProps } from './types';
import { useTabForm } from './use-tab-form';

interface PoliciesForm {
  refund_policy: string;
  confirmation_email_template: string;
}

/**
 * Refund policy and confirmation-email copy (inline BigEvent fields).
 *
 * These are rich-text fields; a WYSIWYG editor is deferred, so they use plain
 * textareas (consistent with the About/Notes fields on the Event tab) and accept
 * HTML.
 */
export function PoliciesTab({ event, saving, onSave }: TabProps) {
  const { form, set, dirty, submit } = useTabForm<PoliciesForm>(
    {
      refund_policy: event.refund_policy ?? '',
      confirmation_email_template: event.confirmation_email_template ?? '',
    },
    (data) => onSave({ ...data }),
  );

  return (
    <TabForm dirty={dirty} saving={saving} onSubmit={submit}>
      <FormRow>
        <Label variant="form">Refund policy</Label>
        <Textarea
          rows={5}
          value={form.refund_policy}
          onChange={(e) => set('refund_policy', e.target.value)}
          placeholder="Describe your refund and cancellation policy…"
        />
        <Text variant="muted" className="text-xs">
          Shown on the public event page and at checkout. HTML is supported.
        </Text>
      </FormRow>

      <FormRow>
        <Label variant="form">Confirmation email template</Label>
        <Textarea
          rows={8}
          value={form.confirmation_email_template}
          onChange={(e) => set('confirmation_email_template', e.target.value)}
          placeholder="Body of the order confirmation email…"
        />
        <Text variant="muted" className="text-xs">
          Sent after a successful purchase. HTML is supported.
        </Text>
      </FormRow>
    </TabForm>
  );
}

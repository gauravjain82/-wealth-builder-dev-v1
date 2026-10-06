import { FormRow, Label, Text, Textarea } from '@shared/components';
import { RichTextEditor } from '../rich-text-editor';
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
 * The refund policy uses the rich-text editor (sanitized server-side). The
 * confirmation email stays a raw HTML textarea: it is email markup, not page
 * copy, and is never rendered on the public site.
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
        <RichTextEditor
          value={form.refund_policy}
          onChange={(html) => set('refund_policy', html)}
          placeholder="Describe your refund and cancellation policy…"
        />
        <Text variant="muted" className="text-xs">
          Shown on the public event page and at checkout.
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

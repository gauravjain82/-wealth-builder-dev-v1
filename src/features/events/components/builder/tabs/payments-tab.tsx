import { FormRow, FormRowGroup, Input, Label, Select, Text } from '@shared/components';
import { TabForm } from './tab-form';
import type { TabProps } from './types';
import { useTabForm } from './use-tab-form';

interface PaymentsForm {
  payment_provider: 'STRIPE';
  payment_currency: string;
  stripe_account_id: string;
}

// Common ISO-4217 codes; the field also accepts free text for anything else.
const CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'MXN'];

/** Online payment provider and currency configuration. */
export function PaymentsTab({ event, saving, onSave }: TabProps) {
  const { form, set, dirty, submit } = useTabForm<PaymentsForm>(
    {
      payment_provider: event.payment_provider ?? 'STRIPE',
      payment_currency: event.payment_currency ?? 'USD',
      stripe_account_id: event.stripe_account_id ?? '',
    },
    (data) =>
      onSave({
        payment_provider: data.payment_provider,
        payment_currency: data.payment_currency,
        stripe_account_id: data.stripe_account_id === '' ? null : data.stripe_account_id,
      }),
  );

  return (
    <TabForm dirty={dirty} saving={saving} onSubmit={submit}>
      <FormRowGroup columns={2}>
        <FormRow>
          <Label variant="form">Payment provider</Label>
          <Select
            value={form.payment_provider}
            onChange={(e) => set('payment_provider', e.target.value as 'STRIPE')}
          >
            <option value="STRIPE">Stripe</option>
          </Select>
        </FormRow>
        <FormRow>
          <Label variant="form">Currency</Label>
          <Select
            value={form.payment_currency}
            onChange={(e) => set('payment_currency', e.target.value)}
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </FormRow>
      </FormRowGroup>

      <FormRow>
        <Label variant="form">Stripe account ID (optional)</Label>
        <Input
          value={form.stripe_account_id}
          onChange={(e) => set('stripe_account_id', e.target.value)}
          placeholder="acct_…"
        />
        <Text variant="muted" className="text-xs">
          Leave blank to use the platform's default Stripe account.
        </Text>
      </FormRow>
    </TabForm>
  );
}

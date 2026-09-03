import type { EventPromoCode } from '../../../types/config';
import { configService } from '../../../services/config-service';
import { ConfigCollectionEditor, type FieldSpec } from '../config-collection-editor';
import type { ConfigListApi } from '../../../hooks/use-config-list';
import type { TabProps } from './types';

const api: ConfigListApi<EventPromoCode> = {
  list: configService.listPromoCodes,
  create: configService.createPromoCode,
  update: configService.updatePromoCode,
  remove: configService.deletePromoCode,
};

const FIELDS: FieldSpec<EventPromoCode>[] = [
  { key: 'code', label: 'Code', type: 'text', placeholder: 'EARLY20' },
  {
    key: 'discount_type',
    label: 'Discount type',
    type: 'select',
    options: [
      { value: 'FLAT', label: 'Flat amount off' },
      { value: 'PERCENTAGE', label: 'Percentage off' },
      { value: 'FIXED_PRICE', label: 'Fixed override price' },
    ],
  },
  {
    key: 'discount_value',
    label: 'Value',
    type: 'price',
    help: 'Dollars off, percent (e.g. 20), or the override price — per the type.',
  },
  { key: 'description', label: 'Description', type: 'text', colSpan: 2 },
  { key: 'start_date', label: 'Starts', type: 'datetime', nullable: true },
  { key: 'expiration_date', label: 'Expires', type: 'datetime', nullable: true },
  {
    key: 'max_uses',
    label: 'Max uses',
    type: 'number',
    nullable: true,
    help: 'Blank = unlimited.',
  },
];

/** Discount codes applied at checkout. */
export function PromosTab({ event }: TabProps) {
  return (
    <ConfigCollectionEditor<EventPromoCode>
      eventId={event.id}
      api={api}
      fields={FIELDS}
      titleField="code"
      itemNoun="promo code"
      defaults={{ discount_type: 'FLAT' }}
      description="Promo codes attendees can enter at checkout. Value meaning depends on the discount type."
    />
  );
}

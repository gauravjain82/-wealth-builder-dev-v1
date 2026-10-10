import type { PricingTier } from '../../../types/config';
import { configService } from '../../../services/config-service';
import { ConfigCollectionEditor, type FieldSpec } from '../config-collection-editor';
import type { ConfigListApi } from '../../../hooks/use-config-list';
import type { TabProps } from './types';

// Stable adapter so the list hook's load effect doesn't re-fire each render.
const api: ConfigListApi<PricingTier> = {
  list: configService.listPricingTiers,
  create: configService.createPricingTier,
  update: configService.updatePricingTier,
  remove: configService.deletePricingTier,
};

const FIELDS: FieldSpec<PricingTier>[] = [
  { key: 'label', label: 'Tier label', type: 'text', placeholder: 'Early Bird' },
  { key: 'price', label: 'Price', type: 'price', placeholder: '199.00' },
  {
    key: 'active_from',
    label: 'Active from',
    type: 'datetime',
    nullable: true,
    help: 'Blank makes this the default/initial tier.',
  },
  { key: 'expiration_date', label: 'Expires', type: 'datetime', nullable: true },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
  {
    key: 'quantity_breaks',
    label: 'Quantity prices',
    type: 'quantityBreaks',
    colSpan: 2,
    help: 'Optional. An order that reaches a quantity pays that price for every ticket in it; the highest quantity reached wins. Smaller orders pay the tier price. Counted per order, not across orders.',
  },
];

/** Ticket pricing tiers (date-driven, with optional quantity prices). */
export function PricingTab({ event }: TabProps) {
  return (
    <ConfigCollectionEditor<PricingTier>
      eventId={event.id}
      api={api}
      fields={FIELDS}
      timeZone={event.timezone}
      titleField="label"
      itemNoun="pricing tier"
      defaults={{ sort_order: '0', quantity_breaks: [] }}
      description="Define one or more pricing tiers. The active tier is resolved by date at checkout; leave 'Active from' blank for the default tier. Dates are in the event's timezone. These are the prices buyers pay — the price printed on tickets is the face price on the Ticketing tab. Value copy for the public ticket card (comparison price, inclusions, fine print) is edited on the Page tab, under Ticket prices."
    />
  );
}

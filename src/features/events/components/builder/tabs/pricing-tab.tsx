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
  {
    key: 'multi_ticket_min_qty',
    label: 'Multi-ticket min qty',
    type: 'number',
    nullable: true,
    help: 'Quantity at which the multi-ticket price applies.',
  },
  { key: 'multi_ticket_price', label: 'Multi-ticket price', type: 'price', nullable: true },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
];

/** Ticket pricing tiers (date-driven, with optional multi-ticket pricing). */
export function PricingTab({ event }: TabProps) {
  return (
    <ConfigCollectionEditor<PricingTier>
      eventId={event.id}
      api={api}
      fields={FIELDS}
      titleField="label"
      itemNoun="pricing tier"
      defaults={{ sort_order: '0' }}
      description="Define one or more pricing tiers. The active tier is resolved by date at checkout; leave 'Active from' blank for the default tier."
    />
  );
}

import type { EventAddOn } from '../../../types/config';
import { configService } from '../../../services/config-service';
import { ConfigCollectionEditor, type FieldSpec } from '../config-collection-editor';
import type { ConfigListApi } from '../../../hooks/use-config-list';
import type { TabProps } from './types';

const api: ConfigListApi<EventAddOn> = {
  list: configService.listAddOns,
  create: configService.createAddOn,
  update: configService.updateAddOn,
  remove: configService.deleteAddOn,
};

// Add-on image (image_blob_name) upload is deferred — see speakers-tab note.
const FIELDS: FieldSpec<EventAddOn>[] = [
  { key: 'product_name', label: 'Product name', type: 'text', placeholder: 'Event T-shirt' },
  { key: 'unit_price', label: 'Unit price', type: 'price', placeholder: '25.00' },
  {
    key: 'product_type',
    label: 'Type',
    type: 'select',
    options: [
      { value: 'MERCHANDISE', label: 'Merchandise' },
      { value: 'MEAL', label: 'Meal' },
      { value: 'EXPERIENCE', label: 'Experience' },
      { value: 'OTHER', label: 'Other' },
    ],
  },
  {
    key: 'stock',
    label: 'Stock',
    type: 'number',
    nullable: true,
    help: 'Blank = unlimited.',
  },
  { key: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
];

/** Purchasable add-ons (merchandise, meals, experiences) offered at checkout. */
export function AddOnsTab({ event }: TabProps) {
  return (
    <ConfigCollectionEditor<EventAddOn>
      eventId={event.id}
      api={api}
      fields={FIELDS}
      titleField="product_name"
      itemNoun="add-on"
      defaults={{ product_type: 'MERCHANDISE' }}
      description="Optional extras attendees can buy alongside tickets."
    />
  );
}

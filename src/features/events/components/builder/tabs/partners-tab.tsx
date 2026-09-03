import type { EventProductPartner } from '../../../types/config';
import { configService } from '../../../services/config-service';
import { ConfigCollectionEditor, type FieldSpec } from '../config-collection-editor';
import type { ConfigListApi } from '../../../hooks/use-config-list';
import type { TabProps } from './types';

const api: ConfigListApi<EventProductPartner> = {
  list: configService.listPartners,
  create: configService.createPartner,
  update: configService.updatePartner,
  remove: configService.deletePartner,
};

// Partner logo (logo_blob_name) upload is deferred — see speakers-tab note.
const FIELDS: FieldSpec<EventProductPartner>[] = [
  { key: 'company_name', label: 'Company name', type: 'text' },
  {
    key: 'level',
    label: 'Sponsorship level',
    type: 'select',
    options: [
      { value: 'DIAMOND', label: 'Diamond' },
      { value: 'GOLD', label: 'Gold' },
      { value: 'SILVER', label: 'Silver' },
      { value: 'BRONZE', label: 'Bronze' },
    ],
  },
  { key: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
  { key: 'website', label: 'Website', type: 'text', placeholder: 'https://…' },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
];

/** Product / sponsorship partners shown on the public landing page. */
export function PartnersTab({ event }: TabProps) {
  return (
    <ConfigCollectionEditor<EventProductPartner>
      eventId={event.id}
      api={api}
      fields={FIELDS}
      titleField="company_name"
      itemNoun="partner"
      defaults={{ level: 'GOLD', sort_order: '0' }}
      description="Sponsors and product partners, grouped by level on the public page."
    />
  );
}

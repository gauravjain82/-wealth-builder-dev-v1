import type { EventCustomField } from '../../../types/config';
import { configService } from '../../../services/config-service';
import { ConfigCollectionEditor, type FieldSpec } from '../config-collection-editor';
import type { ConfigListApi } from '../../../hooks/use-config-list';
import type { TabProps } from './types';

const api: ConfigListApi<EventCustomField> = {
  list: configService.listCustomFields,
  create: configService.createCustomField,
  update: configService.updateCustomField,
  remove: configService.deleteCustomField,
};

const FIELDS: FieldSpec<EventCustomField>[] = [
  { key: 'name', label: 'Field name', type: 'text', placeholder: 'T-shirt size' },
  {
    key: 'field_type',
    label: 'Type',
    type: 'select',
    options: [
      { value: 'TEXT', label: 'Text' },
      { value: 'SELECT', label: 'Select (dropdown)' },
      { value: 'CHECKBOX', label: 'Checkbox' },
      { value: 'EMAIL', label: 'Email' },
      { value: 'PHONE', label: 'Phone' },
      { value: 'NUMBER', label: 'Number' },
    ],
  },
  { key: 'required', label: 'Required', type: 'checkbox', help: 'Required at checkout' },
  { key: 'description', label: 'Help text', type: 'text', colSpan: 2 },
  {
    key: 'options',
    label: 'Options (one per line)',
    type: 'stringList',
    colSpan: 2,
    help: 'Only used for Select fields — one choice per line.',
  },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
];

/** Custom registration questions asked during checkout. */
export function CustomFieldsTab({ event }: TabProps) {
  return (
    <ConfigCollectionEditor<EventCustomField>
      eventId={event.id}
      api={api}
      fields={FIELDS}
      titleField="name"
      itemNoun="custom field"
      defaults={{ field_type: 'TEXT', sort_order: '0' }}
      description="Extra questions attendees answer at checkout. Add options only for Select-type fields."
    />
  );
}

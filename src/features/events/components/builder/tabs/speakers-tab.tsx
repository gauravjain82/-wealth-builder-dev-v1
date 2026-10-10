import type { EventSpeaker } from '../../../types/config';
import { configService } from '../../../services/config-service';
import { ConfigCollectionEditor, type FieldSpec } from '../config-collection-editor';
import type { ConfigListApi } from '../../../hooks/use-config-list';
import type { TabProps } from './types';

const api: ConfigListApi<EventSpeaker> = {
  list: configService.listSpeakers,
  create: configService.createSpeaker,
  update: configService.updateSpeaker,
  remove: configService.deleteSpeaker,
  upload: configService.uploadSpeakerImage,
};

const FIELDS: FieldSpec<EventSpeaker>[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'title', label: 'Title', type: 'text', placeholder: 'CEO, Acme Inc.' },
  {
    key: 'group',
    label: 'Group',
    type: 'select',
    options: [
      { value: 'speaker', label: 'Speaker' },
      { value: 'keynote', label: 'Keynote' },
    ],
    help: 'Keynote speakers show first, with larger cards.',
  },
  { key: 'description', label: 'Bio', type: 'textarea', colSpan: 2 },
  { key: 'website', label: 'Website', type: 'text', placeholder: 'https://…' },
  { key: 'instagram', label: 'Instagram', type: 'text' },
  { key: 'twitter', label: 'Twitter / X', type: 'text' },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
];

/** Featured speakers shown on the public landing page. */
export function SpeakersTab({ event }: TabProps) {
  return (
    <ConfigCollectionEditor<EventSpeaker>
      eventId={event.id}
      api={api}
      fields={FIELDS}
      timeZone={event.timezone}
      titleField="name"
      itemNoun="speaker"
      image={{ urlField: 'image_url', label: 'Photo', help: 'Square headshot works best.' }}
      defaults={{ sort_order: '0', group: 'speaker' }}
      description="Speakers appear on the public event page in sort order."
    />
  );
}

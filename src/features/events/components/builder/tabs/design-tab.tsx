import {
  Checkbox,
  Divider,
  FormRow,
  FormRowGroup,
  Input,
  Label,
  Select,
  Text,
} from '@shared/components';
import { eventService } from '../../../services/event-service';
import { ImageUploadField } from '../image-upload-field';
import { TabForm } from './tab-form';
import type { TabProps } from './types';
import { useTabForm } from './use-tab-form';

interface DesignForm {
  design_type: 'SIMPLE' | 'BIG';
  brand_color: string;
  disable_banner_bg_color: boolean;
  event_video_url: string;
}

// BigEvent blob fields exposed as image uploads, each paired with its signed
// preview URL on the event (added to the detail serializer for the builder).
const IMAGE_FIELDS: {
  field: string;
  label: string;
  urlKey: keyof TabProps['event'];
  help?: string;
}[] = [
  { field: 'logo_blob_name', label: 'Logo', urlKey: 'logo_url' },
  { field: 'event_banner_blob_name', label: 'Event banner', urlKey: 'event_banner_url' },
  { field: 'location_banner_blob_name', label: 'Location banner', urlKey: 'location_banner_url' },
  { field: 'contact_banner_blob_name', label: 'Contact banner', urlKey: 'contact_banner_url' },
  {
    field: 'video_bg_banner_blob_name',
    label: 'Video background',
    urlKey: 'video_bg_banner_url',
  },
  { field: 'flyer_blob_name', label: 'Flyer', urlKey: 'flyer_url' },
];

/** Branding, layout style, banners, and media for the public landing page. */
export function DesignTab({ event, saving, onSave }: TabProps) {
  const { form, set, dirty, submit } = useTabForm<DesignForm>(
    {
      design_type: event.design_type ?? 'SIMPLE',
      brand_color: event.brand_color ?? '',
      disable_banner_bg_color: event.disable_banner_bg_color,
      event_video_url: event.event_video_url ?? '',
    },
    (data) => onSave({ ...data }),
  );

  // Persist the blob server-side, then refresh the event to get the signed URL.
  const uploadFor = (field: string) => async (file: File) => {
    await eventService.uploadImage(event.id, field, file);
    await onSave({});
  };

  return (
    <div className="space-y-6">
      <TabForm dirty={dirty} saving={saving} onSubmit={submit}>
        <FormRowGroup columns={2}>
          <FormRow>
            <Label variant="form">Layout style</Label>
            <Select
              value={form.design_type}
              onChange={(e) => set('design_type', e.target.value as DesignForm['design_type'])}
            >
              <option value="SIMPLE">Simple</option>
              <option value="BIG">Big</option>
            </Select>
          </FormRow>
          <FormRow>
            <Label variant="form">Brand color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.brand_color || '#000000'}
                onChange={(e) => set('brand_color', e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-slate-200 dark:border-white/10"
                aria-label="Brand color picker"
              />
              <Input
                value={form.brand_color}
                onChange={(e) => set('brand_color', e.target.value)}
                placeholder="#1A73E8"
              />
            </div>
          </FormRow>
        </FormRowGroup>

        <FormRow>
          <Label variant="form">Event video URL</Label>
          <Input
            value={form.event_video_url}
            onChange={(e) => set('event_video_url', e.target.value)}
            placeholder="https://youtube.com/…"
          />
        </FormRow>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.disable_banner_bg_color}
            onChange={(e) => set('disable_banner_bg_color', e.target.checked)}
          />
          Disable banner background color
        </label>
      </TabForm>

      <Divider />

      <div className="space-y-4">
        <div>
          <Text className="text-sm font-medium">Images &amp; media</Text>
          <Text variant="muted" className="text-xs">
            Uploads save immediately — no need to press Save changes.
          </Text>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {IMAGE_FIELDS.map((img) => (
            <ImageUploadField
              key={img.field}
              label={img.label}
              currentUrl={(event[img.urlKey] as string | null) ?? null}
              onUpload={uploadFor(img.field)}
              help={img.help}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
